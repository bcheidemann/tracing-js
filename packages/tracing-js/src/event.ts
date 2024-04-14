import { getContext } from "./context";
import { Level } from "./level";

export type Event = {
  isEvent: true;
  level: Level;
  message: string;
  fields?: Record<string, unknown>;
};

export function event(
  level: Level,
  message: string,
  fields?: Record<string, unknown>,
) {
  const ctx = getContext();

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

export function trace(message: string, fields?: Record<string, unknown>) {
  event(Level.TRACE, message, fields);
}

export function debug(message: string, fields?: Record<string, unknown>) {
  event(Level.DEBUG, message, fields);
}

export function info(message: string, fields?: Record<string, unknown>) {
  event(Level.INFO, message, fields);
}

export function warn(message: string, fields?: Record<string, unknown>) {
  event(Level.WARN, message, fields);
}

export function error(message: string, fields?: Record<string, unknown>) {
  event(Level.ERROR, message, fields);
}

export function critical(message: string, fields?: Record<string, unknown>) {
  event(Level.CRITICAL, message, fields);
}

export const Log = {
  trace,
  debug,
  info,
  warn,
  error,
  critical,
};
