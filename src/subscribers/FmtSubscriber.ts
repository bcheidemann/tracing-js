import { context, createContext } from "../context.ts";
import type { Event } from "../event.ts";
import { Level } from "../level.ts";
import type { SpanAttributes } from "../span.ts";
import { ManagedSubscriber } from "./ManagedSubscriber.ts";

const levelToString: Record<Level, string> = {
  [Level.DISABLED]: "DISABLED",
  [Level.TRACE]: "TRACE",
  [Level.DEBUG]: "DEBUG",
  [Level.INFO]: "INFO",
  [Level.WARN]: "WARN",
  [Level.ERROR]: "ERROR",
  [Level.CRITICAL]: "CRITICAL",
};

/**
 * Options for the FmtSubscriber.
 */
export type FmtSubscriberOptions = {
  /**
   * The minimum level of logs to display.
   *
   * @default Level.INFO
   */
  level?: Level;
  /**
   * Include a timestamp in the message.
   *
   * @default true
   */
  timestamp?: boolean;
  /**
   * Log messages in color.
   *
   * @default true
   */
  color?: boolean;
  /**
   * Spreads logs over multiple lines for better readability.
   *
   * @default false
   */
  pretty?: boolean;
};

/**
 * The FmtSubscriber class is a subscriber which logs events to the console in a human-readable format.
 *
 * @example
 * ```ts
 * import { FmtSubscriber } from "@bcheidemann/tracing";
 *
 * // Initialize the subscriber and enter it into the current async context
 * // This should be called at the beginning of your program
 * FmtSubscriber.init();
 * ```
 */
export class FmtSubscriber extends ManagedSubscriber {
  constructor(private readonly options: FmtSubscriberOptions = {}) {
    super(options.level ?? Level.INFO);
  }

  public static init(options: FmtSubscriberOptions = {}): FmtSubscriber {
    const subscriber = new FmtSubscriber(options);
    context.enterWith(createContext(subscriber));
    return subscriber;
  }

  protected onEvent(event: Event, spans: SpanAttributes[]): void {
    const message = this.displayMessage(event, spans);

    switch (event.level) {
      case Level.TRACE:
      case Level.DEBUG:
      case Level.INFO:
        console.log(message);
        break;
      case Level.WARN:
        console.warn(message);
        break;
      case Level.ERROR:
      case Level.CRITICAL:
        console.error(message);
        break;
    }
  }

  private displayMessage(event: Event, spans: SpanAttributes[]) {
    let message = `${this.displayTimestamp()} ${
      this.displayLevel(event.level)
    }`;

    const formattedSpans = this.displaySpans(spans);
    if (formattedSpans) {
      message += ` ${formattedSpans}`;
    }

    message += ` ${event.message}`;

    const fields = this.displayEventFields(event);
    if (fields) {
      message += ` ${fields}`;
    }

    return message;
  }

  private displayLevel(level: Level) {
    return `[${levelToString[level]}]`;
  }

  private displayTimestamp() {
    return `[${this.timestamp}]`;
  }

  private get timestamp() {
    return new Date().toISOString();
  }

  private displaySpans(spans: SpanAttributes[]) {
    if (!spans.length) {
      return;
    }

    return `${
      spans
        .map(this.displaySpan.bind(this))
        .reverse()
        .join(":")
    }:`;
  }

  private displaySpan(span: SpanAttributes) {
    let message = span.message;

    const fields = this.displaySpanFields(span);
    if (fields) {
      message += fields;
    }

    return message;
  }

  private displayEventFields(event: Event) {
    const fields = Object.entries(event.fields ?? {});

    if (!fields.length) return;

    const fieldsFmt = this.flattenFields(fields).map(
      ([key, value]) => `${key}=${this.displayValue(value)}`,
    );
    return `(${fieldsFmt.join(", ")})`;
  }

  private displaySpanFields(span: SpanAttributes) {
    const fields = Object.entries(span.fields ?? {});

    if (!fields.length) return;

    const fieldsFmt = this.flattenFields(fields).map(
      ([key, value]) => `${key}=${this.displayValue(value)}`,
    );
    return `{${fieldsFmt.join(", ")}}`;
  }

  private flattenFields(fields: [unknown, unknown][]): [string, unknown][] {
    return fields.flatMap(([outerKey, value]) => {
      if (typeof value === "object" && value !== null) {
        const entries: [string, unknown][] = Object.entries(value).map(
          ([innerKey, value]) => [`${outerKey}.${innerKey}`, value],
        );
        if (value instanceof Error) {
          entries.push(
            [`${outerKey}.name`, value.name],
            [`${outerKey}.message`, value.message],
          );
          if (typeof value.stack === "string") {
            entries.push(
              [`${outerKey}.stack`, value.stack],
            );
          }
        } else if (!entries.length && "constructor" in value) {
          entries.push([`${outerKey}`, value.constructor.name]);
        }
        return this.flattenFields(entries);
      } else {
        return [[this.displayValue(outerKey), value]];
      }
    });
  }

  private displayValue(value: unknown): string {
    switch (typeof value) {
      case "bigint":
      case "boolean":
      case "function":
      case "symbol":
        return value.toString();
      case "number":
      case "string":
        return value.toString();
      case "object":
        return JSON.stringify(value);
      case "undefined":
        return "undefined";
    }
  }
}
