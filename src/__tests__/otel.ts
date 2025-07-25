import type {
  ReadableSpan,
  Span,
  SpanExporter,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { Context } from "@opentelemetry/api";

export class InMemorySpanExporter implements SpanExporter {
  private _finishedSpans: ReadableSpan[] = [];

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    this._finishedSpans.push(...spans);
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  reset() {
    this._finishedSpans = [];
  }

  getFinishedSpans(): ReadableSpan[] {
    return this._finishedSpans;
  }
}

export class InMemorySpanProcessor implements SpanProcessor {
  private _finishedSpans: ReadableSpan[] = [];

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    this._finishedSpans.push(span);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  reset() {
    this._finishedSpans = [];
  }

  getFinishedSpans(): ReadableSpan[] {
    return this._finishedSpans;
  }
}
