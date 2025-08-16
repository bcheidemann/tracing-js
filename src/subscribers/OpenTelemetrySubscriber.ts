import {
  createSubscriberContext,
  setDefaultGlobalSubscriber,
} from "../context.ts";
import type { Event } from "../event.ts";
import { subscriberData, type SubscriberDataAttribute } from "../instrument.ts";
import { Level } from "../level.ts";
import type { OpenTelemetrySubscriberData, SpanAttributes } from "../span.ts";
import type { ISubscriber } from "../subscriber.ts";
import {
  type Attributes,
  type AttributeValue,
  context,
  context as otelContext,
  type Span,
  SpanKind,
  trace,
  type Tracer,
} from "@opentelemetry/api";

export function otel(
  data: OpenTelemetrySubscriberData,
): SubscriberDataAttribute {
  return subscriberData({ otel: data });
}

type SpanNode = {
  id: symbol;
  attributes: SpanAttributes;
};

type PendingSpanNode = SpanNode & {
  parent: undefined;
  otelSpan: undefined;
};

type EnteredSpanNode = SpanNode & {
  parent: EnteredSpanNode | undefined;
  otelSpan: Span;
};

/**
 * Options for the JsonSubscriber.
 */
export type OpenTelemetrySubscriberOptions = {
  /**
   * The minimum level of logs to display.
   *
   * @default Level.INFO
   */
  level?: Level;
  /**
   * The Open Telemetry tracer to use.
   *
   * @default trace.getTracer("default")
   */
  tracer?: Tracer;
};

/**
 * The OpenTelemetrySubscriber class is a subscriber which emits OpenTelemetry
 * spans and events.
 *
 * @example
 * ```ts
 * import { OpenTelemetrySubscriber } from "@bcheidemann/tracing";
 *
 * // Initialize the subscriber and set it as the default global subscriber
 * // This should be called at the beginning of your program
 * OpenTelemetrySubscriber.setGlobalDefault();
 * ```
 *
 * ## Usage Considerations
 *
 * ### OpenTelemetry Configuration
 *
 * The `OpenTelemetrySubscriber` will not automatically set up the OpenTelemetry
 * SDK. Ensure you have correctly set up OpenTelemetry correctly for your
 * runtime.
 *
 * - [Guidance for Node.js (and other Node.js compatible runtimes)](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
 * - [Guidance for Deno (built in OpenTelemetry support)](https://docs.deno.com/runtime/fundamentals/open_telemetry/)
 *
 * ### Interfacing with OpenTelemetry Directly
 *
 * Due to the way span propogation works in OpenTelemetry, manually created
 * spans will not automatically propogate the current OpenTelemetry span to
 * code which interfaces directly with OpenTelemetry.
 *
 * ```ts
 * function main() {
 *   using _ = infoSpan("main");
 *   trace.getActiveSpan()?.addEvent("Oops!");
 * }
 * ```
 *
 * The above code does not work. Although "main" is considered the active span
 * by tracing, it has not been set as the active OpenTelemetry span. This is
 * not currently possible due to limitations of the OpenTelemetry JavaScript
 * API.
 *
 * To work around this limitation, it is recommended to use instrumented
 * callbacks and methods wherever possible:
 *
 * ```ts
 * const main = instrumentCallback(function main() {
 *   trace.getActiveSpan()?.addEvent("Success!");
 * });
 *
 * // Or...
 *
 * class App {
 *   @instrument() main() {
 *     trace.getActiveSpan()?.addEvent("Success!");
 *   }
 * }
 * ```
 *
 * Additionally, prefer to emit tracing events, instead of interfacing with
 * OpenTelemetry directly:
 *
 * ```ts
 * function main() {
 *   using _ = infoSpan("main");
 *   info("Success!");
 * }
 * ```
 *
 * The above code will ensure that the event is emitted for the correct span.
 *
 * If neither is possible, you must ensure that you use the `runInContext`
 * method, to explicitly set the current OpenTelemetry span.
 *
 * ```ts
 * function main() {
 *   using _ = infoSpan("main");
 *   getSubscriberContextOrThrow().subscriber.runInContext(function () {
 *     trace.getActiveSpan()?.addEvent("Success!");
 *   }, this, []);
 * }
 * ```
 *
 * The above code is automatically called when executing an instrumented method
 * or function. That's why it's recommended to avoid creating spans manually,
 * and instead rely on instrumentation wherever possible.
 */
export class OpenTelemetrySubscriber implements ISubscriber<symbol> {
  protected constructor(
    private readonly _options: OpenTelemetrySubscriberOptions,
    private _currentSpan: EnteredSpanNode | undefined = undefined,
    private readonly _spans: WeakMap<
      symbol,
      PendingSpanNode | EnteredSpanNode
    > = new WeakMap(),
  ) {}

  public static setGlobalDefault(
    options: OpenTelemetrySubscriberOptions = {},
  ): OpenTelemetrySubscriber {
    const subscriber = new OpenTelemetrySubscriber(options);
    setDefaultGlobalSubscriber(createSubscriberContext(subscriber));
    return subscriber;
  }

  // =============================== ISubscriber ===============================

  enabledForLevel(level: Level): boolean {
    return level >= this.#level();
  }

  enabled(_metadata: Event | SpanAttributes): boolean {
    return true;
  }

  newSpan(attributes: SpanAttributes): symbol {
    const span: PendingSpanNode = {
      id: Symbol(),
      parent: undefined,
      otelSpan: undefined,
      attributes,
    };

    this._spans.set(span.id, span);

    return span.id;
  }

  event(event: Event): void {
    const activeSpan = this._currentSpan?.otelSpan ?? trace.getActiveSpan();
    activeSpan?.addEvent(
      event.message,
      this.#preprocessAttributes(event.fields),
    );
  }

  enter(span: symbol): void {
    const pendingSpan = this._spans.get(span);
    if (!pendingSpan) {
      throw new Error("Invalid span");
    }

    const enteredSpan = pendingSpan as unknown as EnteredSpanNode;
    enteredSpan.parent = this._currentSpan;
    enteredSpan.otelSpan = this.#otelTracer().startSpan(
      enteredSpan.attributes.message,
      {
        kind: enteredSpan.attributes.subscriberData?.otel?.kind ??
          SpanKind.INTERNAL,
        attributes: this.#preprocessAttributes(enteredSpan.attributes.fields),
      },
      this.#otelContext(),
    );

    this._currentSpan = enteredSpan;
  }

  exit(span: symbol): void {
    const orphanSpanNodes: EnteredSpanNode[] = [];

    function maybeLogParentExitedBeforeChildWarning(
      exitedNode: EnteredSpanNode,
    ) {
      if (orphanSpanNodes.length === 0) {
        return;
      }

      console.warn([
        "[WARNING] (OpenTelemetrySubscriber) A span was exited before its child.",
        "",
        "          [EXITED]",
        `          name = ${exitedNode.attributes.message}`,
        `          level = ${exitedNode.attributes.level}`,
        "",
        "          [ORPHANS]",
        ...orphanSpanNodes.flatMap((orphanNode, idx) => [
          `          ${idx}: name = ${orphanNode.attributes.message}`,
          `             level = ${orphanNode.attributes.level}`,
        ]),
        "",
        "          This probably means that a function was called asynchronously",
        "          but was not properly instrumented.",
        "",
        "          To fix this error, ensure that asynchronously executed",
        "          functions are properly instrumented.",
        "",
        "          For example:",
        "",
        "          setTimeout(instrumentCallback(() => { ... }));",
        "                     +++++++++++++++++++             +",
        "",
        "          const myFunc = instrumentCallback(async function myFync() { ... });",
        "          ++++++++++++++++++++++++++++++++++                               ++",
        "",
        "          class Example {",
        "            @instrument()",
        "            +++++++++++++",
        "            myMethod() { ... }",
        "          }",
        "",
      ].join("\n"));
    }

    function logNoSuchSpanInStackWarning(
      exitedNode: PendingSpanNode | EnteredSpanNode | undefined,
    ) {
      if (exitedNode) {
        console.warn([
          "[WARNING] (OpenTelemetrySubscriber) A span was exited which does not",
          "          belong to the current subscribers stack. This probably means",
          "          that one of the following happened:",
          "",
          "          [1] An ancestor of this span was exited prematurely. If this",
          "              is the case, you should see a previous warning about a",
          "              span having been exited before its child. Parent spans",
          "              are permitted to exit before their children, but the",
          "              child span must be created in a new asynchronous context.",
          "              This can be done by instrumenting asynchronously executed",
          "              functions. For more information, see the previous",
          "              warning.",
          "",
          "          [2] The spans exit method was called more than once.",
          "",
          "          [EXITED]",
          `          name = ${exitedNode.attributes.message}`,
          `          level = ${exitedNode.attributes.level}`,
          "",
        ].join("\n"));
      } else {
        console.warn([
          "[WARNING] (OpenTelemetrySubscriber) A span was exited which does not",
          "          belong to the current subscribers context. This probably means",
          "          that one of the following happened:",
          "",
          "          [1] The spans _id property was mutated. This is an invalid",
          "              operation.",
          "",
          "          [2] The OpenTelemetrySubscriber.exit method was called",
          "              manually with an invalid span ID.",
          "",
        ].join("\n"));
      }
    }

    const exitSpan = (node: EnteredSpanNode | undefined) => {
      if (!node) {
        this._currentSpan = undefined;
        logNoSuchSpanInStackWarning(this._spans.get(span));
        return;
      }

      if (node.id === span) {
        this._currentSpan = node.parent;
        maybeLogParentExitedBeforeChildWarning(node);
        return;
      }

      orphanSpanNodes.unshift(node);
      exitSpan(node.parent);
    };

    // EXPLANATION: Do this here to ensure the OTEL span is always exited, even
    //              if tracing-js was used incorrectly, resulting in broken
    //              parent-child relationships.
    this._spans.get(span)?.otelSpan?.end();

    exitSpan(this._currentSpan);
  }

  record(spanId: symbol, key: string, value: unknown): void {
    const span = this._spans.get(spanId);

    if (!span) {
      return;
    }

    if (span.attributes.fields) {
      span.attributes.fields[key] = value;
    } else {
      span.attributes.fields = { [key]: value };
    }

    span.otelSpan?.setAttributes(
      this.#preprocessAttributes({ [key]: value }) ?? {},
    );
  }

  currentSpan(): symbol | undefined {
    return this._currentSpan?.id;
  }

  clone(): ISubscriber<symbol> {
    return new OpenTelemetrySubscriber(
      this._options,
      this._currentSpan,
      this._spans,
    );
  }

  runInContext<TThis, TArgs extends unknown[], TReturn>(
    callback: (this: TThis, ...args: TArgs) => TReturn,
    thisArg: TThis,
    args: TArgs,
  ): TReturn {
    return context.with(
      this.#otelContext(),
      callback,
      thisArg,
      ...args,
    );
  }

  // ============================= Private Methods =============================

  #level() {
    return this._options.level ?? Level.INFO;
  }

  #otelTracer() {
    return this._options.tracer ?? trace.getTracer("default");
  }

  #otelContext() {
    if (this._currentSpan) {
      return trace.setSpan(otelContext.active(), this._currentSpan.otelSpan);
    }
    return otelContext.active();
  }

  #preprocessAttributes(
    attributes: Record<string, unknown> | undefined,
  ): Attributes | undefined {
    if (attributes === undefined) {
      return;
    }

    const entries = Object.entries(attributes);
    const preprocessedEntries = this.#preprocessAttributeEntries(entries);

    return Object.fromEntries(preprocessedEntries);
  }

  #preprocessAttributeEntries(
    attributes: [string, unknown][],
    keyPrefix?: string,
  ): [string, AttributeValue][] {
    function buildKey(...parts: string[]) {
      if (typeof keyPrefix === "undefined") {
        return parts.join(".");
      } else {
        return `${keyPrefix}.${parts.join(".")}`;
      }
    }

    const attributesEntries = attributes
      .flatMap(([outerKey, value]): [string, AttributeValue][] => {
        if (Array.isArray(value)) {
          return [[
            buildKey(outerKey),
            this.#preprocessArrayAttributeValue(value),
          ]];
        } else if (typeof value === "object" && value !== null) {
          const entries = this.#preprocessAttributeEntries(
            Object.entries(value),
            buildKey(outerKey),
          );
          if (value instanceof Error) {
            entries.push(
              [buildKey(outerKey, "name"), value.name],
              [buildKey(outerKey, "message"), value.message],
            );
            if (typeof value.stack === "string") {
              entries.push(
                [buildKey(outerKey, "stack"), value.stack],
              );
            }
          } else if (value instanceof Date) {
            entries.push([buildKey(outerKey), value.toISOString()]);
          } else if (
            "constructor" in value && value.constructor.name !== "Object"
          ) {
            entries.push([
              buildKey(outerKey),
              value.constructor.name,
            ]);
          }
          return entries;
        } else {
          return [[buildKey(outerKey), this.#preprocessAttributeValue(value)]];
        }
      });

    return attributesEntries;
  }

  #preprocessAttributeValue(value: unknown): AttributeValue {
    switch (typeof value) {
      case "string":
      case "number":
      case "boolean":
        return value;
    }
    return `${value}`;
  }

  #preprocessArrayAttributeValue(value: Array<unknown>): AttributeValue {
    if (this.#isNumberArrayAttributeValue(value)) {
      return value;
    }
    if (this.#isBooleanArrayAttributeValue(value)) {
      return value;
    }
    return value.map((item) => {
      if (item === null) {
        return item;
      }
      switch (typeof item) {
        case "string":
        case "undefined":
          return item;
      }
      return `${item}`;
    });
  }

  #isNumberArrayAttributeValue(value: Array<unknown>) {
    return value.every((key) =>
      typeof key === "number" || typeof key === "undefined" || key === null
    );
  }

  #isBooleanArrayAttributeValue(value: Array<unknown>) {
    return value.every((key) =>
      typeof key === "boolean" || typeof key === "undefined" || key === null
    );
  }
}
