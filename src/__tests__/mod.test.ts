import { it } from "@std/testing/bdd";
import { fn } from "jest-mock";
import { expect } from "expect";
import { createTestSubscriber } from "./subscriber.ts";
import { context, createContext } from "../context.ts";
import { span } from "../span.ts";
import { Level } from "../level.ts";
import { createAnonymousSpanId } from "./span.ts";
import { event } from "../event.ts";

it("should not throw when used without a registering a subscriber", () => {
  // Act
  const guard = span(Level.INFO, "test", { foo: "bar" }).enter();
  event(Level.INFO, "test", { foo: "bar" });
  guard.exit();
});

it("should call subscriber.newSpan on subscriber when a new span is created", () => {
  // Arrange
  const subscriber = createTestSubscriber();
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test", { foo: "bar" });

  // Assert
  expect(subscriber.newSpan).toHaveBeenCalled();
  expect(subscriber.newSpan).toHaveBeenCalledWith({
    isSpan: true,
    level: Level.INFO,
    message: "test",
    fields: { foo: "bar" },
  });
});

it("should call subscriber.enter when entering a span", () => {
  // Arrange
  const subscriber = createTestSubscriber();
  const spanId = createAnonymousSpanId();
  subscriber.newSpan.mockReturnValue(spanId);
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test").enter();

  // Assert
  expect(subscriber.enter).toHaveBeenCalled();
  expect(subscriber.enter).toHaveBeenCalledWith(spanId);
});

it("should call subscriber.exit when entering a span", () => {
  // Arrange
  const subscriber = createTestSubscriber();
  const spanId = createAnonymousSpanId();
  subscriber.newSpan.mockReturnValue(spanId);
  const ctx = createContext(subscriber);
  context.enterWith(ctx);
  const guard = span(Level.INFO, "test").enter();

  // Act
  guard.exit();

  // Assert
  expect(subscriber.exit).toHaveBeenCalled();
  expect(subscriber.exit).toHaveBeenCalledWith(spanId);
});

it("should call subscriber.exit when a span is exited via it's dispose", () => {
  // Arrange
  const subscriber = createTestSubscriber();
  const spanId = createAnonymousSpanId();
  subscriber.newSpan.mockReturnValue(spanId);
  const ctx = createContext(subscriber);
  context.enterWith(ctx);
  const guard = span(Level.INFO, "test").enter();

  // Act
  {
    using _ = guard;
  }

  // Assert
  expect(subscriber.enter).toHaveBeenCalled();
  expect(subscriber.enter).toHaveBeenCalledWith(spanId);
});

it("should call subscriber.newSpan when subscriber.enabledForLevel returns true", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(true),
  });
  subscriber.enabledForLevel = undefined;
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).toHaveBeenCalled();
});

it("should not call subscriber.newSpan when subscriber.enabledForLevel returns false", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(false),
  });
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).not.toHaveBeenCalled();
});

it("should call subscriber.newSpan when subscriber.enabledForLevel returns true and subscriber.enabled returns true", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(true),
    enabled: fn().mockReturnValue(true),
  });
  subscriber.enabledForLevel = undefined;
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).toHaveBeenCalled();
});

it("should not call subscriber.newSpan when subscriber.enabledForLevel returns true and subscriber.enabled returns false", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(true),
    enabled: fn().mockReturnValue(false),
  });
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).not.toHaveBeenCalled();
});

it("should call subscriber.newSpan when subscriber.enabled returns true", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(true),
    enabled: fn().mockReturnValue(true),
  });
  subscriber.enabledForLevel = undefined;
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).toHaveBeenCalled();
});

it("should not call subscriber.newSpan when subscriber.enabled returns false", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabledForLevel: fn().mockReturnValue(true),
    enabled: fn().mockReturnValue(false),
  });
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test");

  // Assert
  expect(subscriber.newSpan).not.toHaveBeenCalled();
});

it("should not call subscriber.enter when subscriber.enabled returns false", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabled: fn().mockReturnValue(false),
  });
  const ctx = createContext(subscriber);
  context.enterWith(ctx);

  // Act
  span(Level.INFO, "test").enter();

  // Assert
  expect(subscriber.enter).not.toHaveBeenCalled();
});

it("should not call subscriber.exit when subscriber.enabled returns false", () => {
  // Arrange
  const subscriber = createTestSubscriber({
    enabled: fn().mockReturnValue(false),
  });
  const ctx = createContext(subscriber);
  context.enterWith(ctx);
  const guard = span(Level.INFO, "test").enter();

  // Act
  guard.exit();

  // Assert
  expect(subscriber.exit).not.toHaveBeenCalled();
});
