/**
 * @module
 * This module provides functions for creating spans.
 */

import { getSubscriberContext } from "./context.ts";
import { Level } from "./level.ts";

/**
 * The AnonymousSpanId type represents a span ID produced by an unknown (anonymous) subscriber. It is a branded type, and
 * the `__anonymousSpanId` property does not exist at runtime.
 */
export type AnonymousSpanId = {
  __anonymousSpanId?: true;
};

/**
 * The SpanAttributes type represents the information which is passed to subscribers when a span is created.
 */
export type SpanAttributes = {
  isSpan: true;
  level: Level;
  message: string;
  fields?: Record<string, unknown>;
};

/**
 * The EnteredSpan type represents a span which has been entered. Entered spans are compatible with the stage 3
 * [explicit resource management proposal](https://github.com/tc39/proposal-explicit-resource-management).
 */
export type EnteredSpan = {
  /**
   * Exits the span.
   */
  exit: () => void;
  [Symbol.dispose]: () => void;
};

/**
 * The Span type represents a span which has not yet been entered.
 */
export type Span<TSpanId> = {
  /**
   * The ID of the span. This is an opaque value which is used by the subscriber to identify the span.
   */
  id?: TSpanId;
  /**
   * Enters the span.
   */
  enter(): EnteredSpan;
};

/**
 * Creates a new span and passes it to the current subscriber.
 *
 * @param level The level of the span
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function span(
  level: Level,
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  const ctx = getSubscriberContext();

  if (!ctx) {
    return { enter };
  }

  let enabled = true;

  if (ctx.subscriber.enabledForLevel) {
    enabled = ctx.subscriber.enabledForLevel(level);
  }

  if (!enabled) {
    return { enter };
  }

  const attributes: SpanAttributes = {
    isSpan: true,
    level,
    message,
    fields,
  };

  if (ctx.subscriber.enabled) {
    enabled = ctx.subscriber.enabled(attributes);
  }

  if (!enabled) {
    return { enter };
  }

  const spanId = ctx.subscriber.newSpan(attributes);

  return {
    id: spanId as AnonymousSpanId,
    enter,
  };

  function enter() {
    if (!ctx) {
      return { exit, [Symbol.dispose]: exit };
    }

    if (enabled) {
      ctx.subscriber.enter(spanId);
    }

    return {
      exit,
      [Symbol.dispose]: exit,
    };

    function exit() {
      if (ctx && enabled) {
        ctx.subscriber.exit(spanId);
      }
    }
  }
}

/**
 * Creates a new trace level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function traceSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.TRACE,
    message,
    fields,
  );
}

/**
 * Creates a new debug level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function debugSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.DEBUG,
    message,
    fields,
  );
}

/**
 * Creates a new info level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function infoSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.INFO,
    message,
    fields,
  );
}

/**
 * Creates a new warn level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function warnSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.WARN,
    message,
    fields,
  );
}

/**
 * Creates a new error level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function errorSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.ERROR,
    message,
    fields,
  );
}

/**
 * Creates a new critical level span and passes it to the current subscriber.
 *
 * @param message The message of the span
 * @param fields The fields of the span (optional additional information)
 * @returns An unentered span
 */
export function criticalSpan(
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  return span(
    Level.CRITICAL,
    message,
    fields,
  );
}
