import {
  bgRed,
  bold,
  cyan,
  gray,
  green,
  italic,
  magenta,
  red,
  yellow,
} from "@std/fmt/colors";
import {
  createSubscriberContext,
  setDefaultGlobalSubscriber,
} from "../context.ts";
import type { Event } from "../event.ts";
import { Level } from "../level.ts";
import type { SpanAttributes } from "../span.ts";
import { ManagedSubscriber } from "./ManagedSubscriber.ts";
import { supportsColor } from "../utils/supportsColor.ts";

const levelToString: Record<Level, string> = {
  [Level.DISABLED]: "DISABLED",
  [Level.TRACE]: "TRACE",
  [Level.DEBUG]: "DEBUG",
  [Level.INFO]: "INFO",
  [Level.WARN]: "WARN",
  [Level.ERROR]: "ERROR",
  [Level.CRITICAL]: "CRITICAL",
};

const levelToFormatter: Record<Level, (str: string) => string> = {
  [Level.DISABLED]: (str) => gray(str),
  [Level.TRACE]: (str) => bold(magenta(str)),
  [Level.DEBUG]: (str) => bold(cyan(str)),
  [Level.INFO]: (str) => bold(green(str)),
  [Level.WARN]: (str) => bold(yellow(str)),
  [Level.ERROR]: (str) => bold(red(str)),
  [Level.CRITICAL]: (str) => bold(bgRed(str)),
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
   * Defaults to true if supported by the terminal environment.
   *
   * @default true
   */
  color?: boolean;
  /**
   * Abbreviate long field values.
   *
   * @default false
   */
  abbreviateLongFieldValues?: boolean | number;
};

/**
 * The FmtSubscriber class is a subscriber which logs events to the console in a human-readable format.
 *
 * @example
 * ```ts
 * import { FmtSubscriber } from "@bcheidemann/tracing";
 *
 * // Initialize the subscriber and set it as the default global subscriber
 * // This should be called at the beginning of your program
 * FmtSubscriber.setGlobalDefault();
 * ```
 */
export class FmtSubscriber extends ManagedSubscriber {
  private color: boolean;

  constructor(private readonly options: FmtSubscriberOptions = {}) {
    super(options.level ?? Level.INFO);

    if (typeof options.color === "boolean") {
      this.color = options.color;
    } else {
      this.color = supportsColor();
    }
  }

  /**
   * Initialises the FmtSubscriber as the default global subscriber.
   *
   * @deprecated Use `FmtSubscriber.setGlobalDefault()` instead
   */
  public static init(options: FmtSubscriberOptions = {}): FmtSubscriber {
    return this.setGlobalDefault(options);
  }

  public static setGlobalDefault(
    options: FmtSubscriberOptions = {},
  ): FmtSubscriber {
    const subscriber = new FmtSubscriber(options);
    setDefaultGlobalSubscriber(createSubscriberContext(subscriber));
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
    let message = `${this.displayTimestamp()}${this.displayLevel(event.level)}`;

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
    const levelStr = `[${levelToString[level]}]`;
    return this.color ? levelToFormatter[level](levelStr) : levelStr;
  }

  private displayTimestamp() {
    if (this.options?.timestamp === false) {
      return "";
    }
    const timestamp = `[${this.timestamp}] `;
    return this.color ? gray(timestamp) : timestamp;
  }

  private get timestamp() {
    return new Date().toISOString();
  }

  private displaySpans(spans: SpanAttributes[]) {
    if (!spans.length) {
      return;
    }

    const separator = this.color ? gray(":") : ":";
    return `${
      spans
        .map(this.displaySpan.bind(this))
        .reverse()
        .join(separator)
    }${separator}`;
  }

  private displaySpan(span: SpanAttributes) {
    let message = this.color ? bold(span.message) : span.message;

    const fields = this.displaySpanFields(span);
    if (fields) {
      message += this.color ? gray(fields) : fields;
    }

    return message;
  }

  private displayEventFields(event: Event) {
    const fields = Object.entries(event.fields ?? {});

    if (!fields.length) return;

    const fieldsFmt = this.flattenFields(fields).map(
      ([key, value]) =>
        `${this.color ? italic(key) : key}=${this.displayValue(value, true)}`,
    );
    const fieldsStr = `(${fieldsFmt.join(", ")})`;
    return this.color ? gray(fieldsStr) : fieldsStr;
  }

  private displaySpanFields(span: SpanAttributes) {
    const fields = Object.entries(span.fields ?? {});

    if (!fields.length) return;

    const fieldsFmt = this.flattenFields(fields).map(
      ([key, value]) =>
        `${this.color ? italic(key) : key}=${this.displayValue(value, true)}`,
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
        } else if (
          !entries.length && "constructor" in value
        ) {
          entries.push([
            `${outerKey}`,
            value.constructor.name === "Object"
              ? value
              : value.constructor.name,
          ]);
          return entries;
        }
        return this.flattenFields(entries);
      } else {
        return [[this.displayValue(outerKey), value]];
      }
    });
  }

  private displayValue(value: unknown, isFieldValue?: boolean): string {
    let str: string;
    switch (typeof value) {
      case "bigint":
      case "boolean":
      case "function":
      case "symbol":
        str = value.toString();
        break;
      case "number":
      case "string":
        str = value.toString();
        break;
      case "object":
        str = JSON.stringify(value);
        break;
      case "undefined":
        str = "undefined";
        break;
    }

    if (isFieldValue && this.options.abbreviateLongFieldValues) {
      const maxLength =
        typeof this.options.abbreviateLongFieldValues === "number"
          ? this.options.abbreviateLongFieldValues
          : 32;
      const charsToRemove = str.length - maxLength;
      if (charsToRemove > 3) {
        const startCut = Math.round((str.length - charsToRemove) / 2);
        const endCut = Math.round((str.length + charsToRemove) / 2);
        str = `${str.slice(0, startCut)}...${str.slice(endCut)}`;
      }
    }

    return str;
  }
}
