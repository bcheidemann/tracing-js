import { Event } from "../event";
import { Level } from "../level";
import { SpanAttributes } from "../span";
import { ISubscriber } from "../subscriber";

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

export abstract class ManagedSubscriber implements ISubscriber<symbol> {
  protected constructor(
    private readonly level: Level = Level.INFO,
    private currentSpan: EnteredSpanNode | undefined = undefined,
    private readonly pendingSpans = new Map<symbol, PendingSpanNode>(),
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
    let spans = this.currentSpan ? [this.currentSpan] : [];
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
    const self = this;
    exitSpan(this.currentSpan);

    function exitSpan(node: EnteredSpanNode | undefined): void {
      if (!node) {
        self.currentSpan = undefined;
        return;
      }

      if (node.id === span) {
        self.currentSpan = node.parent;
        return;
      }

      // TODO: Log warning in debug mode

      exitSpan(node.parent);
    }
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
