import type { Event } from "../event.ts";
import { Level } from "../level.ts";
import type { SpanAttributes } from "../span.ts";
import type { ISubscriber } from "../subscriber.ts";

type SpanNode = {
  id: symbol;
  attributes: SpanAttributes;
};

type PendingSpanNode = SpanNode & {
  parent: undefined;
};

type EnteredSpanNode = SpanNode & {
  parent: EnteredSpanNode | undefined;
};

/**
 * The ManagedSubscriber class is a base class for subscribers which manage spans across async contexts. It exposes
 * an ergonomic high-level API which makes it easy to create custom subscribers.
 *
 * @example
 * ```ts
 * import { ManagedSubscriber, Event, SpanAttributes, setDefaultGlobalSubscriber } from "@bcheidemann/tracing";
 *
 * class MySubscriber extends ManagedSubscriber {
 *   public static init(): MySubscriber {
 *     const subscriber = new MySubscriber();
 *     // Enter the new subscriber into the current async context
 *     setDefaultGlobalSubscriber(subscriber);
 *     return subscriber;
 *   }
 *
 *   protected onEvent(event: Event, spans: SpanAttributes[]): void {
 *     console.log(event, spans);
 *   }
 * }
 * ```
 */
export abstract class ManagedSubscriber implements ISubscriber<symbol> {
  protected constructor(
    private readonly level: Level = Level.INFO,
    private currentSpan: EnteredSpanNode | undefined = undefined,
    private readonly pendingSpans: Map<symbol, PendingSpanNode> = new Map(),
  ) {}

  enabledForLevel(level: Level): boolean {
    return level >= this.level;
  }

  enabled(_metadata: Event | SpanAttributes): boolean {
    return true;
  }

  newSpan(attributes: SpanAttributes): symbol {
    const span: PendingSpanNode = {
      id: Symbol(),
      parent: undefined,
      attributes,
    };

    this.pendingSpans.set(span.id, span);

    return span.id;
  }

  event(event: Event): void {
    const spans = this.currentSpan ? [this.currentSpan] : [];
    let next: EnteredSpanNode | undefined;
    while ((next = spans.at(-1)?.parent)) {
      spans.push(next);
    }
    this.onEvent(event, spans.map((span) => span.attributes));
  }

  enter(span: symbol): void {
    const pendingSpan = this.pendingSpans.get(span);
    if (!pendingSpan) {
      throw new Error("Invalid span");
    }

    (pendingSpan as EnteredSpanNode).parent = this.currentSpan;

    this.currentSpan = pendingSpan;
  }

  exit(span: symbol): void {
    const exitSpan = (node: EnteredSpanNode | undefined) => {
      if (!node) {
        this.currentSpan = undefined;
        return;
      }

      if (node.id === span) {
        this.currentSpan = node.parent;
        return;
      }

      // TODO: Log warning in debug mode

      exitSpan(node.parent);
    };
    exitSpan(this.currentSpan);
  }

  clone(): ISubscriber<symbol> {
    const newPendingSpans = new Map<symbol, PendingSpanNode>();
    for (const [id, span] of this.pendingSpans) {
      newPendingSpans.set(id, { ...span });
    }
    return new ClonedManagedSubscriber(
      this.level,
      this.currentSpan,
      newPendingSpans,
      this.onEvent.bind(this),
    );
  }

  // Abstract methods

  protected abstract onEvent(event: Event, spans: SpanAttributes[]): void;
}

class ClonedManagedSubscriber extends ManagedSubscriber {
  constructor(
    level: Level,
    currentSpan: EnteredSpanNode | undefined,
    pendingSpans = new Map<symbol, PendingSpanNode>(),
    protected readonly onEvent: (event: Event, spans: SpanAttributes[]) => void,
  ) {
    super(level, currentSpan, pendingSpans);
  }
}
