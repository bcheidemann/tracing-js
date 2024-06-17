import { describe, it, expect } from "vitest";
import { createTestSubscriber } from "./subscriber";
import { context, createContext } from "../context";
import { Level } from "../level";
import {
  field,
  instrument,
  instrumentCallback,
  level,
  log,
  logEnter,
  logError,
  logExit,
  message,
  skip,
  skipAll,
  skipThis,
  target,
} from "../instrument";

describe("instrument", () => {
  describe("method decorator", () => {
    it("should call subscriber.newSpan on subscriber when an instrumented method is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument()
        test(arg0: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            0: "arg0",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the message attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(message("test message"))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the target attribute for classes", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("SomeClass", "someMethod", true))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "SomeClass",
            method: "someMethod",
            private: true,
          },
          args: {
            this: instance,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the level attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(level(Level.TRACE))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.TRACE,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the target attribute for functions", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(target("someFunction"))
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            function: "someFunction",
          },
          args: {
            this: instance,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the skip attribute by param name", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip("arg0", "arg2"))
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            1: "arg1",
            3: "arg3",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the skip attribute by mask", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(true, false, true, false))
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            1: "arg1",
            3: "arg3",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the skip attribute by index", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skip(0, 2))
        test(arg0: string, arg1: string, arg2: string, arg3: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1", "arg2", "arg3");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            1: "arg1",
            3: "arg3",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the skipAll attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skipAll)
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: [],
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the skipThis attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(skipThis)
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            0: "arg0",
            1: "arg1",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the field attribute with literal value", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("fieldKey", "fieldValue"))
        test(arg0: string, arg1: string) {}
      }
      const instance = new Example();

      // Act
      instance.test("arg0", "arg1");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            0: "arg0",
            1: "arg1",
          },
          fieldKey: "fieldValue",
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the field attribute with mapped", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(field("sum", ([arg0, arg1]) => arg0 + arg1))
        test(arg0: number, arg1: number) {}
      }
      const instance = new Example();

      // Act
      instance.test(40, 2);

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "Example.test",
        fields: {
          target: {
            class: "Example",
            method: "test",
            private: false,
          },
          args: {
            this: instance,
            0: 40,
            1: 2,
          },
          sum: 42,
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    // TODO: Add log tests for async methods
    it("should apply the logEnter attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logEnter)
        test() {}
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledOnce();
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Entering Example.test",
        fields: undefined,
      });
    });

    it("should apply the logExit attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logExit)
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      instance.test();

      // Assert
      expect(subscriber.event).toHaveBeenCalledOnce();
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Exiting Example.test",
        fields: {
          returnValue: 42,
        },
      });
    });

    it("should apply the logError attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(logError)
        test() {
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {}

      // Assert
      expect(subscriber.event).toHaveBeenCalledOnce();
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });

    it("should apply the log attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log)
        test() {
          return 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {}

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
        fields: {
          returnValue: 42,
        },
      });
    });

    it("should apply the log attribute for errors", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      class Example {
        @instrument(log)
        test() {
          throw 42;
        }
      }
      const instance = new Example();

      // Act
      try {
        instance.test();
      } catch {}

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
        message: "Error in Example.test",
        fields: {
          error: 42,
        },
      });
    });
  });

  describe("function decorator", () => {
    it("should call subscriber.newSpan on subscriber when an instrumented method is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      function test(arg0: string) {}

      // Act
      instrumentCallback(test)("arg0");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test",
        fields: {
          target: {
            function: "test",
          },
          args: {
            this: undefined,
            0: "arg0",
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    it("should apply the message attribute", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      const testFn = instrumentCallback(
        [message("test message")],
        function test() {},
      );

      // Act
      testFn();

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalledOnce();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: Level.INFO,
        message: "test message",
        fields: {
          target: {
            function: "test",
          },
          args: {
            this: undefined,
          },
        },
      });
      expect(subscriber.enter).toHaveBeenCalledOnce();
      expect(subscriber.exit).toHaveBeenCalledOnce();
    });

    // TODO: Add tests for all attributes
  });
});
