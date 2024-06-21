import {
  createSubscriberContext,
  setDefaultGlobalSubscriber,
} from "../context.ts";
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
 * Options for the JsonSubscriber.
 */
export type JsonSubscriberOptions = {
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
};

/**
 * The JsonSubscriber class is a subscriber which logs events to the console in JSON format.
 *
 * @example
 * ```ts
 * import { JsonSubscriber } from "@bcheidemann/tracing";
 *
 * // Initialize the subscriber and set it as the default global subscriber
 * // This should be called at the beginning of your program
 * JsonSubscriber.setGlobalDefault();
 * ```
 */
export class JsonSubscriber extends ManagedSubscriber {
  constructor(private readonly options: JsonSubscriberOptions = {}) {
    super(options.level ?? Level.INFO);
  }

  /**
   * Initialises the JsonSubscriber as the default global subscriber.
   *
   * @deprecated Use `JsonSubscriber.setGlobalDefault()` instead
   */
  public static init(options: JsonSubscriberOptions = {}): JsonSubscriber {
    return this.setGlobalDefault(options);
  }

  public static setGlobalDefault(
    options: JsonSubscriberOptions = {},
  ): JsonSubscriber {
    const subscriber = new JsonSubscriber(options);
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
    return JSON.stringify({
      ...(this.options.timestamp === false ? {} : {
        timestamp: this.timestamp,
      }),
      level: this.displayLevel(event.level),
      message: event.message,
      fields: event.fields,
      spans: spans.map(this.displaySpan.bind(this)),
    });
  }

  private displaySpan(span: SpanAttributes) {
    return {
      level: this.displayLevel(span.level),
      message: span.message,
      fields: span.fields,
    };
  }

  private displayLevel(level: Level) {
    return levelToString[level];
  }

  private get timestamp() {
    return new Date().toISOString();
  }
}
