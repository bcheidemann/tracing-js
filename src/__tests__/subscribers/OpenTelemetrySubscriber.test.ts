import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "expect";
import { event } from "../../event.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
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
});
