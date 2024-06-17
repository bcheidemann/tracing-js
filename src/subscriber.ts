import { SpanAttributes } from "./span.ts";
import { Event } from "./event.ts";
import { Level } from "./level.ts";

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
}
