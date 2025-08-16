import { describe, it } from "@std/testing/bdd";
import { createTestSubscriber } from "./subscriber.ts";
import { context, createSubscriberContext } from "../context.ts";
import { Level } from "../level.ts";
import {
  field,
  instrument,
  instrumentCallback,
  level,
  log,
  logEnter,
  logError,
  logExit,
  logReturnValue,
  message,
  redact,
  skip,
  skipAll,
  subscriberData,
  target,
} from "../instrument.ts";
import { expect } from "expect";

describe("instrument", () => {
  describe("method decorator", () => {
    it("should not throw when used without a registered subscriber", () => {
      // Arrange
      class Example {
        @instrument(log())
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();
    });

    it("should call subscriber.newSpan on subscriber when an instrumented method is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument()
        // deno-lint-ignore no-unused-vars
        test(arg0: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "arg0",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the message attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(message("test message"))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for classes", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("SomeClass", "someMethod"))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "SomeClass.someMethod",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the level attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(level(Level.TRACE))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.TRACE,
        message: "Example.test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for functions", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("someFunction"))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "someFunction",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by param name", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip("arg0", "arg2"))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by mask", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(true, false, true, false))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by index", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(0, 2))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skipAll attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skipAll)
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with literal value", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("fieldKey", "fieldValue"))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "arg0",
            1: "arg1",
          },
          fieldKey: "fieldValue",
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with mapped", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("sum", ([arg0, arg1]) => arg0 + arg1))
        // deno-lint-ignore no-unused-vars
        test(arg0: number, arg1: number) {}
      }
      const instance = new Example();

      // Act
      instance.test(40, 2);

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: 40,
            1: 2,
          },
          sum: 42,
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    // TODO: Add tests for different logEnter syntaxes
    it("should apply the logEnter attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logEnter())
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
    });

    // TODO: Add tests for different logExit syntaxes
    it("should apply the logExit attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logExit())
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: undefined,
      });
    });

    it("should apply the logReturnValue attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logReturnValue())
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: {
          returnValue: 42,
        },
      });
    });

    it("should apply the logReturnValue attribute with map function", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(
          logReturnValue((returnValue) =>
            `[${typeof returnValue}] ${returnValue}`
          ),
        )
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: {
          returnValue: "[number] 42",
        },
      });
    });

    it("should apply the logReturnValue attribute async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logReturnValue())
        async test() {
          return await Promise.resolve(42);
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: {
          returnValue: 42,
        },
      });
    });

    it("should apply the logReturnValue attribute with map function async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(
          logReturnValue((returnValue) =>
            `[${typeof returnValue}] ${returnValue}`
          ),
        )
        async test() {
          return await Promise.resolve(42);
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: {
          returnValue: "[number] 42",
        },
      });
    });

    // TODO: Add tests for different logError syntaxes
    it("should apply the logError attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logError())
        test() {
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.ERROR,
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });

    // TODO: Add tests for different log syntaxes
    it("should apply the log attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log())
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: undefined,
      });
    });

    it("should apply the log attribute for errors", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log())
        test() {
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.ERROR,
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });
  });

  describe("async method decorator", () => {
    it("should not throw when used without a registered subscriber", async () => {
      // Arrange
      class Example {
        @instrument(log())
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();
    });

    it("should call subscriber.newSpan on subscriber when an instrumented method is called", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument()
        // deno-lint-ignore no-unused-vars
        async test(arg0: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "arg0",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the message attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(message("test message"))
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for classes", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("SomeClass", "someMethod"))
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "SomeClass.someMethod",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the level attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(level(Level.TRACE))
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.TRACE,
        message: "Example.test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for functions", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("someFunction"))
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "someFunction",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by param name", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip("arg0", "arg2"))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string, arg2: string, arg3: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by rest param name", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip("...args"))
        // deno-lint-ignore no-unused-vars
        async test(...args: string[]) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by rest param name for trailing rest param", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip("...args"))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, ...args: string[]) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "arg0",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by mask", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(true, false, true, false))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string, arg2: string, arg3: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by index", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(0, 2))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string, arg2: string, arg3: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skipAll attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skipAll)
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact("arg0"))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "[REDACTED]",
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact("arg0"))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "[REDACTED]",
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute by index", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0))
        // deno-lint-ignore no-unused-vars
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "[REDACTED]",
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute by index async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "[REDACTED]",
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute and redact a field", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0, (param) => param.secret))
        // deno-lint-ignore no-unused-vars
        test(arg0: { secret: string; visible: string }, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test({ secret: "secret", visible: "visible" }, "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: {
              secret: "[REDACTED]",
              visible: "visible",
            },
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute and redact a field async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0, (param) => param.secret))
        // deno-lint-ignore no-unused-vars
        async test(arg0: { secret: string; visible: string }, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test({ secret: "secret", visible: "visible" }, "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: {
              secret: "[REDACTED]",
              visible: "visible",
            },
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute and redact multiple fields", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0, (param) => [param.secret1, param.secret2]))
        // deno-lint-ignore no-unused-vars
        test(arg0: { secret1: string; secret2: string }, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test({ secret1: "secret", secret2: "secret" }, "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: {
              secret1: "[REDACTED]",
              secret2: "[REDACTED]",
            },
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the redact attribute and redact multiple fields async", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(redact(0, (param) => [param.secret1, param.secret2]))
        // deno-lint-ignore no-unused-vars
        async test(arg0: { secret1: string; secret2: string }, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test({ secret1: "secret", secret2: "secret" }, "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: {
              secret1: "[REDACTED]",
              secret2: "[REDACTED]",
            },
            1: "arg1",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    const invalidOperations: ({
      name: string;
      // deno-lint-ignore no-explicit-any
      operation: (redactProxy: any) => any;
      error: string;
    })[] = [
      {
        name: "apply",
        operation: (redactProxy) => redactProxy(),
        error: "redactProxy is not a function",
      },
      {
        name: "construct",
        operation: (redactProxy) => new redactProxy(),
        error: "redactProxy is not a constructor",
      },
      {
        name: "define a property on",
        operation: (redactProxy) =>
          Object.defineProperty(redactProxy, "prop", {}),
        error: "Cannot define property on RedactProxy",
      },
      {
        name: "delete a property on",
        operation: (redactProxy) => {
          delete redactProxy.prop;
        },
        error: "Cannot delete property on RedactProxy",
      },
      {
        name: "get own property descriptor on",
        operation: (redactProxy) =>
          Object.getOwnPropertyDescriptor(redactProxy, "prop"),
        error: "Cannot call Object.getOwnPropertyDescriptor on RedactProxy",
      },
      {
        name: "get the prototype of",
        operation: (redactProxy) => Object.getPrototypeOf(redactProxy),
        error: "Cannot get prototype of RedactProxy",
      },
      {
        name: "use the 'in' keyword on",
        operation: (redactProxy) => "prop" in redactProxy,
        error:
          "Cannot use 'in' operator on RedactProxy (properties should be accessed unconditionally)",
      },
      {
        name: "call Object.isExtensible on",
        operation: (redactProxy) => Object.isExtensible(redactProxy),
        error: "Cannot call Object.isExtensible on RedactProxy",
      },
      {
        name: "call Object.getOwnPropertyNames on",
        operation: (redactProxy) => Object.getOwnPropertyNames(redactProxy),
        error: "Cannot call Object.getOwnPropertyNames on RedactProxy",
      },
      {
        name: "call Object.preventExtensions on",
        operation: (redactProxy) => Object.preventExtensions(redactProxy),
        error: "Cannot call Object.preventExtensions on RedactProxy",
      },
      {
        name: "set a property on",
        operation: (redactProxy) => {
          redactProxy.prop = 42;
        },
        error: "Cannot set property on RedactProxy",
      },
      {
        name: "call Object.setPrototypeOf on",
        operation: (redactProxy) => Object.setPrototypeOf(redactProxy, null),
        error: "Cannot call Object.setPrototypeOf on RedactProxy",
      },
    ];

    for (const invalidOperation of invalidOperations) {
      it(`cannot ${invalidOperation.name} the redact proxy`, () => {
        // Arrange
        const subscriber = createTestSubscriber();
        const ctx = createSubscriberContext(subscriber);
        context.enterWith(ctx);
        class Example {
          @instrument(redact(0, invalidOperation.operation))
          // deno-lint-ignore no-unused-vars
          test(arg0: string) {}
        }
        const instance = new Example();

        // Act
        const act = () => instance.test("arg0");

        // Assert
        expect(act).toThrowError(invalidOperation.error);
      });
    }

    it("should apply the field attribute with literal value", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("fieldKey", "fieldValue"))
        // deno-lint-ignore no-unused-vars
        async test(arg0: string, arg1: string) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: "arg0",
            1: "arg1",
          },
          fieldKey: "fieldValue",
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with mapped", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("sum", ([arg0, arg1]) => arg0 + arg1))
        // deno-lint-ignore no-unused-vars
        async test(arg0: number, arg1: number) {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test(40, 2);

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          args: {
            0: 40,
            1: 2,
          },
          sum: 42,
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the logEnter attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logEnter())
        async test() {
          await Promise.resolve();
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
    });

    it("should apply the logExit attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logExit())
        async test() {
          await Promise.resolve();
          return 42;
        }
      }
      const instance = new Example();

      // Act
      await instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: undefined,
      });
    });

    it("should apply the logError attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logError())
        async test() {
          await Promise.resolve();
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        await instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.ERROR,
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });

    it("should apply the log attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log())
        async test() {
          await Promise.resolve();
          return 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        await instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: undefined,
      });
    });

    it("should apply the log attribute for errors", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log())
        async test() {
          await Promise.resolve();
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        await instance.test();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.ERROR,
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });
  });

  describe("function decorator", () => {
    it("should not throw when used without a registered subscriber", () => {
      // Arrange
      const test = instrumentCallback([log()], function test() {});

      // Act
      test();
    });

    it("should call subscriber.newSpan on subscriber when an instrumented method is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      // deno-lint-ignore no-unused-vars
      function test(arg0: string) {}

      // Act
      instrumentCallback(test)("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: "arg0",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the message attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [message("test message")],
        function test() {},
      );

      // Act
      testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for classes", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [target("SomeClass", "someMethod")],
        function test() {},
      );

      // Act
      testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "SomeClass.someMethod",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the level attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [level(Level.TRACE)],
        function test() {},
      );

      // Act
      testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.TRACE,
        message: "test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for functions", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [target("someFunction")],
        function test() {},
      );

      // Act
      testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "someFunction",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by param name", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip("arg0", "arg2")],
        function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {},
      );

      // Act
      testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by mask", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip(true, false, true, false)],
        function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {},
      );

      // Act
      testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by index", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip(0, 2)],
        function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {},
      );

      // Act
      testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skipAll attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skipAll],
        // deno-lint-ignore no-unused-vars
        function test(arg0: string, arg1: string) {},
      );

      // Act
      testFn("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with literal value", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [field("fieldKey", "fieldValue")],
        // deno-lint-ignore no-unused-vars
        function test(arg0: string, arg1: string) {},
      );

      // Act
      testFn("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: "arg0",
            1: "arg1",
          },
          fieldKey: "fieldValue",
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with mapped", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [field("sum", ([arg0, arg1]) => arg0 + arg1)],
        // deno-lint-ignore no-unused-vars
        function test(arg0: number, arg1: number) {},
      );

      // Act
      testFn(40, 2);

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: 40,
            1: 2,
          },
          sum: 42,
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the logEnter attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logEnter()], function test() {});

      // Act
      testFn();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
    });

    it("should apply the logExit attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logExit()], function test() {
        return 42;
      });

      // Act
      testFn();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting test",
      });
    });

    it("should apply the logError attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logError()], function test() {
        throw 42;
      });

      // Act
      try {
        testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.ERROR,
        message: "Error in test",
        fields: {
          error: 42,
        },
      });
    });

    it("should apply the log attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([log()], function test() {
        return 42;
      });

      // Act
      try {
        testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.INFO,
        message: "Exiting test",
      });
    });

    it("should apply the log attribute for errors", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([log()], function test() {
        throw 42;
      });

      // Act
      try {
        testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.ERROR,
        message: "Error in test",
        fields: {
          error: 42,
        },
      });
    });

    it("should apply the subscriberData attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(subscriberData({ test: { data: 42 } }))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {},
        subscriberData: {
          test: {
            data: 42,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the subscriberData attribute multiple times", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(
          subscriberData({ test1: { data: "original" } }),
          subscriberData({ test2: { data: "original" } }),
          subscriberData({ test1: { data: "override" } }),
        )
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {},
        subscriberData: {
          test1: {
            data: "override",
          },
          test2: {
            data: "original",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });
  });

  describe("async function decorator", () => {
    it("should not throw when used without a registered subscriber", async () => {
      // Arrange
      const test = instrumentCallback([log()], async function test() {
        await Promise.resolve();
      });

      // Act
      await test();
    });

    it("should call subscriber.newSpan on subscriber when an instrumented method is called", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      // deno-lint-ignore no-unused-vars
      async function test(arg0: string) {
        await Promise.resolve();
      }

      // Act
      await instrumentCallback(test)("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: "arg0",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the message attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [message("test message")],
        async function test() {
          await Promise.resolve();
        },
      );

      // Act
      await testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for classes", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [target("SomeClass", "someMethod")],
        async function test() {
          await Promise.resolve();
        },
      );

      // Act
      await testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "SomeClass.someMethod",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the level attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const test = instrumentCallback(
        [level(Level.TRACE)],
        async function test() {
          await Promise.resolve();
        },
      );

      // Act
      await test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.TRACE,
        message: "test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the target attribute for functions", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [target("someFunction")],
        async function test() {},
      );

      // Act
      await testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "someFunction",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by param name", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip("arg0", "arg2")],
        async function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {
          await Promise.resolve();
        },
      );

      // Act
      await testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by mask", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip(true, false, true, false)],
        async function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {
          await Promise.resolve();
        },
      );

      // Act
      await testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skip attribute by index", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skip(0, 2)],
        async function test(
          // deno-lint-ignore no-unused-vars
          arg0: string,
          // deno-lint-ignore no-unused-vars
          arg1: string,
          // deno-lint-ignore no-unused-vars
          arg2: string,
          // deno-lint-ignore no-unused-vars
          arg3: string,
        ) {},
      );

      // Act
      await testFn("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            1: "arg1",
            3: "arg3",
          },
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the skipAll attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [skipAll],
        // deno-lint-ignore no-unused-vars
        async function test(arg0: string, arg1: string) {
          await Promise.resolve();
        },
      );

      // Act
      await testFn("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {},
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with literal value", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [field("fieldKey", "fieldValue")],
        // deno-lint-ignore no-unused-vars
        async function test(arg0: string, arg1: string) {
          await Promise.resolve();
        },
      );

      // Act
      await testFn("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: "arg0",
            1: "arg1",
          },
          fieldKey: "fieldValue",
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the field attribute with mapped", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [field("sum", ([arg0, arg1]) => arg0 + arg1)],
        // deno-lint-ignore no-unused-vars
        async function test(arg0: number, arg1: number) {
          await Promise.resolve();
        },
      );

      // Act
      await testFn(40, 2);

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledTimes(1);
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          args: {
            0: 40,
            1: 2,
          },
          sum: 42,
        },
        subscriberData: {},
      });
      expect(subscriber.enter).toHaveBeenCalledTimes(1);
      expect(subscriber.exit).toHaveBeenCalledTimes(1);
    });

    it("should apply the logEnter attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logEnter()], async function test() {
        await Promise.resolve();
      });

      // Act
      await testFn();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
    });

    it("should apply the logExit attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logExit()], async function test() {
        await Promise.resolve();
        return 42;
      });

      // Act
      await testFn();

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting test",
        fields: undefined,
      });
    });

    it("should apply the logError attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([logError()], async function test() {
        await Promise.resolve();
        throw 42;
      });

      // Act
      try {
        await testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(1);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.ERROR,
        message: "Error in test",
        fields: {
          error: 42,
        },
      });
    });

    it("should apply the log attribute", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([log()], async function test() {
        await Promise.resolve();
        return 42;
      });

      // Act
      try {
        await testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenNthCalledWith(1, {
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenNthCalledWith(2, {
        isEvent: true,
        level: Level.INFO,
        message: "Exiting test",
        fields: undefined,
      });
    });

    it("should apply the log attribute for errors", async () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback([log()], async function test() {
        await Promise.resolve();
        throw 42;
      });

      // Act
      try {
        await testFn();
      } catch {
        // Do nothing
      }

      // Assert
      expect(subscriber.event).toHaveBeenCalledTimes(2);
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering test",
        fields: undefined,
      });
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.ERROR,
        message: "Error in test",
        fields: {
          error: 42,
        },
      });
    });
  });
});
