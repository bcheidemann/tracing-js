import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { expect } from "expect";
import { type SpiedFunction, spyOn } from "jest-mock";
import { event } from "../../event.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
import { JsonSubscriber } from "../../subscribers/JsonSubscriber.ts";

describe("JsonSubscriber", () => {
  // deno-lint-ignore no-explicit-any
  let log: SpiedFunction<(...data: any[]) => void>;

  beforeEach(() => {
    log = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockReset();
  });

  it("should log the message to the console", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","spans":[]}',
    );
  });

  it("should log the message to the console without timestamp when options.timestamp is false", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault({ timestamp: false });

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"level":"INFO","message":"test","spans":[]}',
    );
  });

  for (
    const [level, log] of [
      [Level.TRACE, "log"],
      [Level.DEBUG, "log"],
      [Level.INFO, "log"],
      [Level.WARN, "warn"],
      [Level.ERROR, "error"],
      [Level.CRITICAL, "error"],
    ] satisfies [Level, keyof typeof console][]
  ) {
    it("should log the message to the console for level %s with console.%s", () => {
      // Arrange
      const spy = spyOn(console, log).mockImplementation(() => {});
      JsonSubscriber.setGlobalDefault({
        level: Level.TRACE,
      });

      // Act
      event(level, "test");

      // Assert
      expect(spy).toHaveBeenCalled();
    });
  }

  it("should log the message to the console with a field", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    event(Level.INFO, "test", {
      key: "value",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","fields":{"key":"value"},"spans":[]}',
    );
  });

  it("should log the message to the console with object fields", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    event(Level.INFO, "test", {
      target: {
        class: "Example",
        method: "test",
      },
      args: ["arg0"],
      objArray: [
        {
          key: "value",
          key2: { value: "innerValue" },
        },
      ],
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","fields":{"target":{"class":"Example","method":"test"},"args":["arg0"],"objArray":[{"key":"value","key2":{"value":"innerValue"}}]},"spans":[]}',
    );
  });

  it("should log the message to the console with fields", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    event(Level.INFO, "test", {
      key: "value",
      key2: "value2",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","fields":{"key":"value","key2":"value2"},"spans":[]}',
    );
  });

  it("should log the message to the console with a span", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "test span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","spans":[{"level":"INFO","message":"test span"}]}',
    );
  });

  it("should log the message to the console with spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "outer span").enter();
    span(Level.INFO, "inner span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","spans":[{"level":"INFO","message":"inner span"},{"level":"INFO","message":"outer span"}]}',
    );
  });

  it("should log fields from spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "outer span", {
      outerSpanKey: "outer",
    }).enter();
    span(Level.INFO, "inner span", {
      innerSpanKey: "inner",
    }).enter();
    event(Level.INFO, "test", {
      eventKey: "event",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","fields":{"eventKey":"event"},"spans":[{"level":"INFO","message":"inner span","fields":{"innerSpanKey":"inner"}},{"level":"INFO","message":"outer span","fields":{"outerSpanKey":"outer"}}]}',
    );
  });

  it("should log object fields from spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "Example.test", {
      spanKey: "spanValue",
    }).enter();
    event(Level.INFO, "test", {
      eventKey: "eventValue",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '{"timestamp":"1970-01-01T00:00:00.000Z","level":"INFO","message":"test","fields":{"eventKey":"eventValue"},"spans":[{"level":"INFO","message":"Example.test","fields":{"spanKey":"spanValue"}}]}',
    );
  });

  it("should log errors correctly", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "Example.test", {
      spanError: new Error("span error"),
    }).enter();
    event(Level.INFO, "test", {
      eventError: new Error("event error"),
    });

    // Assert
    expect(log).toHaveBeenCalled();
    const loggedValue = JSON.parse(log.mock.calls[0][0]);
    expect(typeof loggedValue.fields.eventError.stack).toBe("string");
    expect(typeof loggedValue.spans[0].fields.spanError.stack).toBe("string");
    expect(loggedValue).toEqual({
      fields: {
        eventError: {
          message: "event error",
          name: "Error",
          stack: expect.any(String),
        },
      },
      level: "INFO",
      message: "test",
      spans: [
        {
          fields: {
            spanError: {
              message: "span error",
              name: "Error",
              stack: expect.any(String),
            },
          },
          level: "INFO",
          message: "Example.test",
        },
      ],
      timestamp: "1970-01-01T00:00:00.000Z",
    });
  });

  it("should log dates correctly", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    JsonSubscriber.setGlobalDefault();

    // Act
    span(Level.INFO, "Example.test", {
      spanDate: new Date(0),
    }).enter();
    event(Level.INFO, "test", {
      eventDate: new Date(0),
    });

    // Assert
    expect(log).toHaveBeenCalled();
    const loggedValue = JSON.parse(log.mock.calls[0][0]);
    expect(loggedValue).toEqual({
      fields: {
        eventDate: "1970-01-01T00:00:00.000Z",
      },
      level: "INFO",
      message: "test",
      spans: [
        {
          fields: {
            spanDate: "1970-01-01T00:00:00.000Z",
          },
          level: "INFO",
          message: "Example.test",
        },
      ],
      timestamp: "1970-01-01T00:00:00.000Z",
    });
  });
});
