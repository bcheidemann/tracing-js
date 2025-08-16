/**
 * @module
 * This module provides the subscriber interface, and some first party implementations of the subscriber interface.
 */

import type { SpanAttributes } from "./span.ts";
import type { Event } from "./event.ts";
import type { Level } from "./level.ts";

export * from "./subscribers/mod.ts";

/**
 * The subscriber interface. Subscribers are used to receive spans and events. This package is not perscriptive about
 * how subscribers should be implemented, but provides a simple interface which can be used to create custom subscribers.
 * Subscribers are typically used to format and log events.
 *
 * Note that the `ISubscriber` interface is quite low level, and implementing it directly is not recommended for most
 * use cases. This is because implementing subscribers in a way that they correctly handle concurrent async contexts
 * can be quite complex. Instead, consider extending the `ManagedSubscriber` class, which handles async contexts
 * automatically, and exposes a much more ergonomic high-level API.
 */
export interface ISubscriber<TSpanId> {
  /**
   * Returns whether the subscriber is enabled for the given level.
   * This can be used to efficiently skip creating new spans or events.
   */
  enabledForLevel?(level: Level): boolean;
  /**
   * Returns whether the subscriber is enabled for the given metadata.
   * If possible, use `enabledForLevel` instead, as this is called before
   * creating a new span or event.
   */
  enabled?(metadata: SpanAttributes | Event): boolean;
  /**
   * Called when a new span is created if the subscriber is enabled.
   */
  newSpan(attributes: SpanAttributes): TSpanId;
  /**
   * Called when a new event is created if the subscriber is enabled.
   */
  event(event: Event): void;
  /**
   * Called when a span is entered if the subscriber is enabled.
   */
  enter(span: TSpanId): void;
  /**
   * Called when a span is exited if the subscriber is enabled.
   */
  exit(span: TSpanId): void;
  /**
   * Record a field on the span.
   */
  record(span: TSpanId, key: string, value: unknown): void;
  /**
   * Returns the current entered span. If no span is entered, `undefined` is returned.
   */
  currentSpan(): TSpanId | undefined;
  /**
   * Called when a new async context is created. A user may choose to
   * enter a new async context at any point. This can be useful when
   * executing async code in parallel (e.g. with `Promise.all`) as it
   * prevents spans from being shared between async tasks. However,
   * methods instrumented with `@instrument` will automatically create
   * a new async context when entered, meaning the `clone` method may be
   * called quite frequently. For this reason, it's important to ensure
   * that the `clone` method is as efficient as possible. Note that the
   * the cloned subscriber may outlive the original subscriber (e.g.
   * when an async function running within a new async context is not
   * awaited).
   */
  clone(): ISubscriber<TSpanId>;
  /**
   * Called when a function might need to be instrumented by the currnet
   * subscriber before immediately running it. For example, the
   * `OpenTelemetrySubscriber` uses this to set the OpenTelemetry context for
   * the instrumented function, ensuring that third party code emitting
   * OpenTelemetry spans and events works as expected. If the subscriber does
   * not needed to instrument the callback, this method should simply call the
   * provided callback with the provided arguments and return the result.
   */
  runInContext<TThis, TArgs extends unknown[], TReturn>(
    callback: (this: TThis, ...args: TArgs) => TReturn,
    thisArg: TThis,
    args: TArgs,
  ): TReturn;
}
