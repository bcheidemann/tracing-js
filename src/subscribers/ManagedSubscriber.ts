import type { Event } from "../event.ts";
import { Level } from "../level.ts";
import type { SpanAttributes } from "../span.ts";
import type { ISubscriber } from "../subscriber.ts";

type SpanNode = {
  id: symbol;
  attributes: SpanAttributes;
};

type PendingSpanNode = SpanNode & {
  parent: undefined;
};

type EnteredSpanNode = SpanNode & {
  parent: EnteredSpanNode | undefined;
};

/**
 * The ManagedSubscriber class is a base class for subscribers which manage spans across async contexts. It exposes
 * an ergonomic high-level API which makes it easy to create custom subscribers.
 *
 * @example
 * ```ts
 * import { ManagedSubscriber, Event, SpanAttributes, setDefaultGlobalSubscriber } from "@bcheidemann/tracing";
 *
 * class MySubscriber extends ManagedSubscriber {
 *   public static init(): MySubscriber {
 *     const subscriber = new MySubscriber();
 *     // Enter the new subscriber into the current async context
 *     setDefaultGlobalSubscriber(subscriber);
 *     return subscriber;
 *   }
 *
 *   protected onEvent(event: Event, spans: SpanAttributes[]): void {
 *     console.log(event, spans);
 *   }
 * }
 * ```
 */
export abstract class ManagedSubscriber implements ISubscriber<symbol> {
  protected constructor(
    private readonly _level: Level = Level.INFO,
    private _currentSpan: EnteredSpanNode | undefined = undefined,
    private readonly _pendingSpans: WeakMap<symbol, PendingSpanNode> =
      new WeakMap(),
  ) {}

  enabledForLevel(level: Level): boolean {
    return level >= this._level;
  }

  enabled(_metadata: Event | SpanAttributes): boolean {
    return true;
  }

  newSpan(attributes: SpanAttributes): symbol {
    const span: PendingSpanNode = {
      id: Symbol(),
      parent: undefined,
      attributes,
    };

    this._pendingSpans.set(span.id, span);

    return span.id;
  }

  event(event: Event): void {
    const spans = this._currentSpan ? [this._currentSpan] : [];
    let next: EnteredSpanNode | undefined;
    while ((next = spans.at(-1)?.parent)) {
      spans.push(next);
    }
    this.onEvent(event, spans.map((span) => span.attributes));
  }

  enter(span: symbol): void {
    const pendingSpan = this._pendingSpans.get(span);
    if (!pendingSpan) {
      throw new Error("Invalid span");
    }

    (pendingSpan as EnteredSpanNode).parent = this._currentSpan;

    this._currentSpan = pendingSpan;
  }

  exit(span: symbol): void {
    const exitSpan = (node: EnteredSpanNode | undefined) => {
      if (!node) {
        this._currentSpan = undefined;
        return;
      }

      if (node.id === span) {
        this._currentSpan = node.parent;
        return;
      }

      // TODO: Log warning in debug mode

      exitSpan(node.parent);
    };
    exitSpan(this._currentSpan);
  }

  record(spanId: symbol, key: string, value: unknown): void {
    const span = this._pendingSpans.get(spanId);

    if (!span) {
      return;
    }

    if (span.attributes.fields) {
      span.attributes.fields[key] = value;
    } else {
      span.attributes.fields = { [key]: value };
    }
  }

  currentSpan(): symbol | undefined {
    return this._currentSpan?.id;
  }

  clone(): ISubscriber<symbol> {
    return new ClonedManagedSubscriber(
      this._level,
      this._currentSpan,
      this._pendingSpans,
      (event, spans) => this.onEvent(event, spans),
    );
  }

  // Abstract methods

  protected abstract onEvent(event: Event, spans: SpanAttributes[]): void;
}

class ClonedManagedSubscriber extends ManagedSubscriber {
  constructor(
    level: Level,
    currentSpan: EnteredSpanNode | undefined,
    pendingSpans: WeakMap<symbol, PendingSpanNode>,
    protected readonly onEvent: (event: Event, spans: SpanAttributes[]) => void,
  ) {
    super(level, currentSpan, pendingSpans);
  }
}
