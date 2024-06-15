import { getContext } from "./context.ts";
import { Level } from "./level.ts";

declare global {
  interface SymbolConstructor {
    readonly dispose: unique symbol;
  }
}

export type AnonymousSpanId = {
  __anonymousSpanId?: true;
};

export type SpanAttributes = {
  isSpan: true;
  level: Level;
  message: string;
  fields?: Record<string, unknown>;
};

export type EnteredSpan = {
  exit: () => void;
  [Symbol.dispose]: () => void;
};

export type Span<TSpanId> = {
  id?: TSpanId;
  enter(): EnteredSpan;
};

export function span(
  level: Level, message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  const ctx = getContext();

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
    if (enabled) {
      ctx.subscriber.enter(spanId);
    }

    return {
      exit,
      [Symbol.dispose]: exit,
    };

    function exit() {
      if (enabled) {
        ctx.subscriber.exit(spanId);
      }
    }
  }
}

export function traceSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function traceSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function traceSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.TRACE, messageOrFields as string, fields);
}

export function debugSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function debugSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function debugSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.DEBUG, messageOrFields as string, fields);
}

export function infoSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function infoSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function infoSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.INFO, messageOrFields as string, fields);
}

export function warnSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function warnSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function warnSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.WARN, messageOrFields as string, fields);
}

export function errorSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function errorSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function errorSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.ERROR, messageOrFields as string, fields);
}

export function criticalSpan<TSpanId>(
  parent: AnonymousSpanId, message: string, fields?: Record<string, unknown>
): Span<TSpanId>;
export function criticalSpan(
  message: string, fields?: Record<string, unknown>
): Span<AnonymousSpanId>;
export function criticalSpan(
  parentOrMessage: AnonymousSpanId | string,
  messageOrFields?: string | Record<string, unknown>,
  fields?: Record<string, unknown>
): Span<AnonymousSpanId> {
  return (span as any)(parentOrMessage, Level.CRITICAL, messageOrFields as string, fields);
}
