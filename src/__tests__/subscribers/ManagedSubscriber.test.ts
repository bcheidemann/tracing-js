import { vi, describe, it, expect } from "vitest";
import { ManagedSubscriber } from "../../subscribers/ManagedSubscriber";
import { event } from "../../event";
import { span } from "../../span";
import { context, createContext } from "../../context";
import { Level } from "../../level";
import { instrumentCallback, level } from "../../instrument";

class TestSubscriber extends ManagedSubscriber {
  public onEvent = vi.fn();

  public static init(): TestSubscriber {
    const subscriber = new TestSubscriber();
    context.enterWith(createContext(subscriber));
    return subscriber;
  }
}

describe("ManagedSubscriber", () => {
  it("should call onEvent when an event is emitted", () => {
    // Arrange
    const subscriber = TestSubscriber.init();

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.INFO,
        message: "test",
        fields: undefined,
      }),
      [],
    );
  });

  it("should call onEvent with fields when an event is emitted with fields", () => {
    // Arrange
    const subscriber = TestSubscriber.init();

    // Act
    event(Level.INFO, "test", {
      test: "test",
    });

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.INFO,
        message: "test",
        fields: {
          test: "test",
        },
      }),
      [],
    );
  });

  it("should call onEvent with a span when an event is emitted within a span", () => {
    // Arrange
    const subscriber = TestSubscriber.init();
    span(Level.INFO, "test span").enter();

    // Act
    event(Level.WARN, "test");

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.WARN,
        message: "test",
        fields: undefined,
      }),
      [expect.objectContaining({
        level: Level.INFO,
        message: "test span",
        fields: undefined,
      })],
    );
  });

  it("should call onEvent with a span which has fields when an event is emitted within a span which has fields", () => {
    // Arrange
    const subscriber = TestSubscriber.init();
    span(Level.INFO, "test span", {
      test: "test",
    }).enter();

    // Act
    event(Level.WARN, "test");

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.WARN,
        message: "test",
        fields: undefined,
      }),
      [expect.objectContaining({
        level: Level.INFO,
        message: "test span",
        fields: {
          test: "test",
        },
      })],
    );
  });

  it("should handle nested spans", () => {
    // Arrange
    const subscriber = TestSubscriber.init();
    span(Level.INFO, "span1").enter();
    span(Level.INFO, "span2").enter();

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.INFO,
        message: "test",
        fields: undefined,
      }),
      [
        expect.objectContaining({
          level: Level.INFO,
          message: "span2",
          fields: undefined,
        }),
        expect.objectContaining({
          level: Level.INFO,
          message: "span1",
          fields: undefined,
        }),
      ],
    );
  });

  it("should handle exiting spans correctly", () => {
    // Arrange
    const subscriber = TestSubscriber.init();
    const span1 = span(Level.INFO, "span1").enter();
    const span2 = span(Level.INFO, "span2").enter();
    span2.exit();
    span1.exit();

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalled();
    expect(subscriber.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: Level.INFO,
        message: "test",
        fields: undefined,
      }),
      [],
    );
  });

  it("should handle concurrent contexts correctly", async () => {
    // Arrange
    const subscriber = TestSubscriber.init();
    span(Level.INFO, "outer").enter();
    async function first() {
      const inner = span(Level.INFO, "first").enter();
      await new Promise((resolve) => setTimeout(resolve, 10));
      event(Level.INFO, "first");
      await new Promise((resolve) => setTimeout(resolve, 20));
      inner.exit();
    }
    async function second() {
      const inner = span(Level.INFO, "second").enter();
      await new Promise((resolve) => setTimeout(resolve, 20));
      event(Level.INFO, "second");
      await new Promise((resolve) => setTimeout(resolve, 10));
      inner.exit();
    }

    // Act
    await Promise.all([
      instrumentCallback(first)(),
      instrumentCallback(second)(),
    ]);

    // Assert
    expect(subscriber.onEvent).toHaveBeenCalledTimes(2);
    expect(subscriber.onEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: Level.INFO,
        message: "first",
        fields: undefined,
      }),
      [
        expect.objectContaining({
          isSpan: true,
          level: Level.INFO,
          message: "first",
          fields: undefined,
        }),
        // Instrumented span
        expect.objectContaining({
          isSpan: true,
        }),
        expect.objectContaining({
          isSpan: true,
          level: Level.INFO,
          message: "outer",
          fields: undefined,
        }),
      ],
    );
    expect(subscriber.onEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: Level.INFO,
        message: "second",
        fields: undefined,
      }),
      [
        expect.objectContaining({
          level: Level.INFO,
          message: "second",
          fields: undefined,
        }),
        // Instrumented span
        expect.objectContaining({
          isSpan: true,
        }),
        expect.objectContaining({
          level: Level.INFO,
          message: "outer",
          fields: undefined,
        }),
      ],
    );
  });
});
