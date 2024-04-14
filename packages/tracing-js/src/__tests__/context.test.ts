import { describe, it, expect } from "vitest";
import { context, createContext, getContext } from "../context";
import { createTestSubscriber } from "./subscriber";

describe("context", () => {
  describe("getContext", () => {
    it("should throw an error if no context is found", () => {
      // Act
      const fn = () => getContext();

      // Assert
      expect(fn).toThrowError("No context found");
    });

    it("should return the current context", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      const result = getContext();

      // Assert
      expect(result).toBe(ctx);
    });
  });

  describe("Context.clone", () => {
    it("should clone the subscriber when context.clone is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      const result = ctx.clone();

      // Assert
      expect(subscriber.clone).toHaveBeenCalled();
    });

    it("should use the cloned subscriber when context.clone is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      const clonedSubscriber = createTestSubscriber();
      subscriber.clone.mockReturnValue(clonedSubscriber);

      // Act
      const result = ctx.clone();

      // Assert
      expect(result.subscriber).toBe(clonedSubscriber);
    });
  });
});
