import { describe, it } from "@std/testing/bdd";
import { createTestSubscriber } from "./subscriber.ts";
import { context, createSubscriberContext } from "../context.ts";
import {
  criticalSpan,
  currentSpan,
  debugSpan,
  errorSpan,
  infoSpan,
  traceSpan,
  warnSpan,
} from "../span.ts";
import { Level } from "../level.ts";
import { expect } from "expect";
import { fn } from "jest-mock";

describe("span", () => {
  const testCases: [spanFunction: typeof infoSpan, expectedLevel: Level][] = [
    [traceSpan, Level.TRACE],
    [debugSpan, Level.DEBUG],
    [infoSpan, Level.INFO],
    [warnSpan, Level.WARN],
    [errorSpan, Level.ERROR],
    [criticalSpan, Level.CRITICAL],
  ];

  for (const [spanFunction, expectedLevel] of testCases) {
    it(`should create a span of level ${expectedLevel} when the ${spanFunction.name} function is called`, () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);

      // Act
      spanFunction("test");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalled();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: expectedLevel,
        message: "test",
        fields: undefined,
      });
    });
  }
});

describe("currentSpan", () => {
  it("should return the current span", () => {
    // Arrange
    const subscriber = createTestSubscriber({
      currentSpan: fn().mockReturnValue("spanId"),
    });
    const ctx = createSubscriberContext(subscriber);
    context.enterWith(ctx);

    // Act
    const span = currentSpan();

    // Assert
    expect(span).toBeDefined();
  });

  it("should return undefined when no span is entered", () => {
    // Arrange
    const subscriber = createTestSubscriber({
      currentSpan: fn().mockReturnValue(undefined),
    });
    const ctx = createSubscriberContext(subscriber);
    context.enterWith(ctx);

    // Act
    const span = currentSpan();

    // Assert
    expect(span).toBeUndefined();
  });
});
