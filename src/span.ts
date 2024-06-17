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
  level: Level,
  message: string,
  fields?: Record<string, unknown>,
): Span<AnonymousSpanId> {
  const ctx = getContext();

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
