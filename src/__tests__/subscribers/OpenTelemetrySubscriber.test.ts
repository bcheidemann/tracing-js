import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "expect";
import { event } from "../../event.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
import { getSubscriberContext } from "../../context.ts";
import { instrumentCallback, message } from "../../instrument.ts";
import { OpenTelemetrySubscriber } from "../../subscribers/OpenTelemetrySubscriber.ts";
import { InMemorySpanProcessor } from "../otel.ts";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { trace } from "@opentelemetry/api";

describe("OpenTelemetrySubscriber", () => {
  const spanProcessor = new InMemorySpanProcessor();
  const provider = new NodeTracerProvider({
    spanProcessors: [spanProcessor],
  });
  provider.register();

  const tracer = trace.getTracer("test");

  beforeEach(() => {
    spanProcessor.reset();
  });

  it("should record a span without events", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const guard = span(Level.INFO, "test span").enter();
    guard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].events).toHaveLength(0);
  });

  it("should record a span with attributes", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const guard = span(Level.INFO, "test span", {
      stringAttr: "example string",
      numberAttr: 42,
      booleanAttr: true,
      nullAttr: null,
      bigintAttr: BigInt(42),
      functionAttr: function exampleFunction() {},
      classAttr: class ExampleClass {},
      dateAttr: new Date(0),
      errorAttr: new Error("example error"),
      instanceAttr: new class ExampleClass {
        public message = "Hello World!";
      }(),
      objectAttr: {
        title: "Greeting",
        message: "Hello World!",
      },
      nestedObjectAttr: {
        type: "email",
        content: {
          html: "<h1>Hello World!</h1>",
          text: "Hello World!",
        },
      },
      mixedArrayAttr: ["example string", 42, true, null],
      emptyArrayAttr: [],
      stringArrayAttr: [null, "1", "2", "3"],
      numberArrayAttr: [null, 1, 2, 3],
      booleanArrayAttr: [null, true, false, true],
    }).enter();
    guard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].attributes).toBeDefined();
    expect(spans[0].attributes).toMatchObject({
      stringAttr: "example string",
      numberAttr: 42,
      booleanAttr: true,
      nullAttr: "null",
      bigintAttr: "42",
      functionAttr: "function exampleFunction() {}",
      classAttr: expect.stringContaining("class ExampleClass"),
      dateAttr: "1970-01-01T00:00:00.000Z",
      "errorAttr.name": "Error",
      "errorAttr.message": "example error",
      "errorAttr.stack": expect.stringContaining("Error: example error\n"),
      instanceAttr: "ExampleClass",
      "instanceAttr.message": "Hello World!",
      "objectAttr.title": "Greeting",
      "objectAttr.message": "Hello World!",
      "nestedObjectAttr.type": "email",
      "nestedObjectAttr.content.html": "<h1>Hello World!</h1>",
      "nestedObjectAttr.content.text": "Hello World!",
      mixedArrayAttr: ["example string", "42", "true", null],
      emptyArrayAttr: [],
      stringArrayAttr: [null, "1", "2", "3"],
      numberArrayAttr: [null, 1, 2, 3],
      booleanArrayAttr: [null, true, false, true],
    });
    expect(spans[0].events).toHaveLength(0);
  });

  it("should record a nested span without events", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const outerGuard = span(Level.INFO, "outer span").enter();
    const innerGuard = span(Level.INFO, "inner span").enter();
    innerGuard.exit();
    outerGuard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(2);
    expect(spans[0].name).toEqual("inner span");
    expect(spans[0].events).toHaveLength(0);
    expect(spans[1].name).toEqual("outer span");
    expect(spans[1].events).toHaveLength(0);
    expect(spans[0].parentSpanContext?.spanId).toEqual(
      spans[1].spanContext().spanId,
    );
  });

  it("should record events on a span", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const guard = span(Level.INFO, "test span").enter();
    event(Level.INFO, "test event");
    guard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].events).toHaveLength(1);
    expect(spans[0].events[0].name).toEqual("test event");
  });

  it("should record events with attributes on a span", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const guard = span(Level.INFO, "test span").enter();
    event(Level.INFO, "test event", {
      stringAttr: "example string",
      numberAttr: 42,
      booleanAttr: true,
      nullAttr: null,
      bigintAttr: BigInt(42),
      functionAttr: function exampleFunction() {},
      classAttr: class ExampleClass {},
      dateAttr: new Date(0),
      errorAttr: new Error("example error"),
      instanceAttr: new class ExampleClass {
        public message = "Hello World!";
      }(),
      objectAttr: {
        title: "Greeting",
        message: "Hello World!",
      },
      nestedObjectAttr: {
        type: "email",
        content: {
          html: "<h1>Hello World!</h1>",
          text: "Hello World!",
        },
      },
      mixedArrayAttr: ["example string", 42, true, null],
      emptyArrayAttr: [],
      stringArrayAttr: [null, "1", "2", "3"],
      numberArrayAttr: [null, 1, 2, 3],
      booleanArrayAttr: [null, true, false, true],
    });
    guard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].events).toHaveLength(1);
    expect(spans[0].events[0].name).toEqual("test event");
    expect(spans[0].events[0].attributes).toMatchObject({
      stringAttr: "example string",
      numberAttr: 42,
      booleanAttr: true,
      nullAttr: "null",
      bigintAttr: "42",
      functionAttr: "function exampleFunction() {}",
      classAttr: expect.stringContaining("class ExampleClass"),
      dateAttr: "1970-01-01T00:00:00.000Z",
      "errorAttr.name": "Error",
      "errorAttr.message": "example error",
      "errorAttr.stack": expect.stringContaining("Error: example error\n"),
      instanceAttr: "ExampleClass",
      "instanceAttr.message": "Hello World!",
      "objectAttr.title": "Greeting",
      "objectAttr.message": "Hello World!",
      "nestedObjectAttr.type": "email",
      "nestedObjectAttr.content.html": "<h1>Hello World!</h1>",
      "nestedObjectAttr.content.text": "Hello World!",
      mixedArrayAttr: ["example string", "42", "true", null],
      emptyArrayAttr: [],
      stringArrayAttr: [null, "1", "2", "3"],
      numberArrayAttr: [null, 1, 2, 3],
      booleanArrayAttr: [null, true, false, true],
    });
  });

  it("should record events on a nested span", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    // Act
    const guard = span(Level.INFO, "outer span").enter();
    const innerGuard = span(Level.INFO, "inner span").enter();
    event(Level.INFO, "test event");
    innerGuard.exit();
    guard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(2);
    expect(spans[0].name).toEqual("inner span");
    expect(spans[0].events).toHaveLength(1);
    expect(spans[0].events[0].name).toEqual("test event");
    expect(spans[1].name).toEqual("outer span");
    expect(spans[1].events).toHaveLength(0);
    expect(spans[0].parentSpanContext?.spanId).toEqual(
      spans[1].spanContext().spanId,
    );
  });

  it("should record fields on the span before it is entered", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });
    const newSpan = span(Level.INFO, "test span");

    // Act
    newSpan.record("test1", "testA").record("test2", "testB").enter().exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].attributes).toMatchObject(
      expect.objectContaining({
        test1: "testA",
        test2: "testB",
      }),
    );
  });

  it("should record fields on the span after it is entered", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });
    const newSpan = span(Level.INFO, "test span");

    // Act
    newSpan.enter().record("test1", "testA").record("test2", "testB").exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].attributes).toMatchObject(
      expect.objectContaining({
        test1: "testA",
        test2: "testB",
      }),
    );
  });

  it("should record fields on the span before and after it is entered", () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });
    const newSpan = span(Level.INFO, "test span");

    // Act
    newSpan.record("beforeEnter", "A").enter().record("afterEnter", "B").exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toEqual("test span");
    expect(spans[0].attributes).toMatchObject(
      expect.objectContaining({
        beforeEnter: "A",
        afterEnter: "B",
      }),
    );
  });

  it("should handle concurrent contexts correctly", async () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });
    async function first() {
      const inner = span(Level.INFO, "first inner").enter();
      await new Promise((resolve) => setTimeout(resolve, 10));
      event(Level.INFO, "first");
      await new Promise((resolve) => setTimeout(resolve, 20));
      inner.exit();
    }
    async function second() {
      const inner = span(Level.INFO, "second inner").enter();
      await new Promise((resolve) => setTimeout(resolve, 20));
      event(Level.INFO, "second");
      await new Promise((resolve) => setTimeout(resolve, 20));
      inner.exit();
    }

    // Act
    const outerGuard = span(Level.INFO, "outer").enter();
    await Promise.all([
      instrumentCallback([message("first function")], first)(),
      instrumentCallback([message("second function")], second)(),
    ]);
    outerGuard.exit();

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    expect(spans).toHaveLength(5);

    expect(spans[0].name).toEqual("first inner");
    expect(spans[0].events).toHaveLength(1);
    expect(spans[0].events[0].name).toEqual("first");
    expect(spans[1].name).toEqual("first function");
    expect(spans[1].events).toHaveLength(0);

    expect(spans[2].name).toEqual("second inner");
    expect(spans[2].events).toHaveLength(1);
    expect(spans[2].events[0].name).toEqual("second");
    expect(spans[3].name).toEqual("second function");
    expect(spans[3].events).toHaveLength(0);

    expect(spans[4].name).toEqual("outer");
    expect(spans[4].events).toHaveLength(0);

    expect(spans[0].parentSpanContext?.spanId).toEqual(
      spans[1].spanContext().spanId,
    );
    expect(spans[1].parentSpanContext?.spanId).toEqual(
      spans[4].spanContext().spanId,
    );

    expect(spans[2].parentSpanContext?.spanId).toEqual(
      spans[3].spanContext().spanId,
    );
    expect(spans[3].parentSpanContext?.spanId).toEqual(
      spans[4].spanContext().spanId,
    );
  });

  it.skip("should handle delayed execution on inner spans", async () => {
    // Arrange
    OpenTelemetrySubscriber.setGlobalDefault({ tracer });

    const { promise: testCompletion, resolve: completeTest } = Promise
      .withResolvers<true>();

    const delayedFn = instrumentCallback(async function delayedFn() {
      const inner = span(Level.INFO, "inner").enter();
      await new Promise((resolve) => setTimeout(resolve, 10));
      event(Level.INFO, "delayed event");
      await new Promise((resolve) => setTimeout(resolve, 20));
      inner.exit();

      // Complete the test in the next event loop cycle
      setTimeout(() => completeTest(true));
    });

    const main = instrumentCallback(function main() {
      // TODO: This is a bit of a hack and only preserves the OTEL span
      //       heirarchy... We need to provide some API with which to bind a
      //       callback to the current tracing span, even if the current span
      //       exits before the callback executes.
      getSubscriberContext()!.subscriber.runInContext(
        () => {
          setTimeout(() => delayedFn(), 10);
        },
        null,
        [],
      );
    });

    // Act
    main();
    await testCompletion;

    // Assert
    const spans = spanProcessor.getFinishedSpans();
    const processedSpans = spans.map((span) => ({
      name: span.name,
      id: span.spanContext().spanId,
      parentId: span.parentSpanContext?.spanId,
    }));
    console.error(JSON.stringify(processedSpans, null, 2));
    expect(spans).toHaveLength(3);

    expect(spans[0].name).toEqual("main");
    expect(spans[0].events).toHaveLength(0);
    expect(spans[1].name).toEqual("inner");
    expect(spans[1].events).toHaveLength(1);
    expect(spans[1].events[0].name).toEqual("delayed event");
    expect(spans[2].name).toEqual("delayedFn");
    expect(spans[2].events).toHaveLength(0);

    expect(spans[1].parentSpanContext?.spanId).toEqual(
      spans[2].spanContext().spanId,
    );
    expect(spans[2].parentSpanContext?.spanId).toEqual(
      spans[0].spanContext().spanId,
    );
  });
});
