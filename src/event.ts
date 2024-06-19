/**
 * @module
 * This module provides functions for creating events.
 */

import { getSubscriberContext } from "./context.ts";
import { Level } from "./level.ts";

/**
 * The Event type represents the information which is passed to subscribers when an event is created.
 */
export type Event = {
  isEvent: true;
  level: Level;
  message: string;
  fields?: Record<string, unknown>;
};

/**
 * Creates a new event and passes it to the current subscriber.
 *
 * @param level The level of the event
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function event(
  level: Level,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const ctx = getSubscriberContext();

  if (!ctx) {
    return;
  }

  if (
    ctx.subscriber.enabledForLevel &&
    !ctx.subscriber.enabledForLevel(level)
  ) {
    return;
  }

  const event: Event = {
    isEvent: true,
    level,
    message,
    fields,
  };

  if (
    ctx.subscriber.enabled &&
    !ctx.subscriber.enabled(event)
  ) {
    return;
  }

  ctx.subscriber.event({
    isEvent: true,
    level,
    message,
    fields,
  });
}

/**
 * Creates a new trace level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function trace(message: string, fields?: Record<string, unknown>) {
  event(Level.TRACE, message, fields);
}

/**
 * Creates a new debug level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function debug(message: string, fields?: Record<string, unknown>) {
  event(Level.DEBUG, message, fields);
}

/**
 * Creates a new info level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function info(message: string, fields?: Record<string, unknown>) {
  event(Level.INFO, message, fields);
}

/**
 * Creates a new warn level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function warn(message: string, fields?: Record<string, unknown>) {
  event(Level.WARN, message, fields);
}

/**
 * Creates a new error level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function error(message: string, fields?: Record<string, unknown>) {
  event(Level.ERROR, message, fields);
}

/**
 * Creates a new critical level event and passes it to the current subscriber.
 *
 * @param message The message of the event
 * @param fields The fields of the event (optional additional information)
 */
export function critical(message: string, fields?: Record<string, unknown>) {
  event(Level.CRITICAL, message, fields);
}

/**
 * The Log object provides functions for creating events. It is a convenience object which provides the same functions
 * as the module itself.
 */
export const Log = {
  trace,
  debug,
  info,
  warn,
  error,
  critical,
};
