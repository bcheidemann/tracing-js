import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { FakeTime } from "@std/testing/time";
import { expect } from "expect";
import { type SpiedFunction, spyOn } from "jest-mock";
import { event } from "../../event.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
import { FmtSubscriber } from "../../subscribers/FmtSubscriber.ts";

describe("FmtSubscriber", () => {
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
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] test");
  });

  it("should log the message to the console without timestamp when options.timestamp is false", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ timestamp: false, color: false });

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[INFO] test",
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
    it(
      "should log the message to the console for level %s with console.%s",
      () => {
        // Arrange
        const spy = spyOn(console, log).mockImplementation(() => {});
        FmtSubscriber.setGlobalDefault({
          level: Level.TRACE,
          color: false,
        });

        // Act
        event(level, "test");

        // Assert
        expect(spy).toHaveBeenCalled();
      },
    );
  }

  it("should log the message to the console with a field", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    event(Level.INFO, "test", {
      key: "value",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] test (key=value)",
    );
  });

  it("should log the message to the console with object fields", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

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
      "[1970-01-01T00:00:00.000Z] [INFO] test (target.class=Example, target.method=test, args.0=arg0, objArray.0.key=value, objArray.0.key2.value=innerValue)",
    );
  });

  it("should log the message to the console with fields", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    event(Level.INFO, "test", {
      key: "value",
      key2: "value2",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] test (key=value, key2=value2)",
    );
  });

  it("should log the message to the console with a span", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    span(Level.INFO, "test span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] test span: test",
    );
  });

  it("should log the message to the console with spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    span(Level.INFO, "outer span").enter();
    span(Level.INFO, "inner span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] outer span:inner span: test",
    );
  });

  it("should log fields from spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

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
      "[1970-01-01T00:00:00.000Z] [INFO] outer span{outerSpanKey=outer}:inner span{innerSpanKey=inner}: test (eventKey=event)",
    );
  });

  it("should log object fields from spans", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    span(Level.INFO, "Example.test", {
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
    }).enter();
    event(Level.INFO, "test", {
      eventKey: "event",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] Example.test{target.class=Example, target.method=test, args.0=arg0, objArray.0.key=value, objArray.0.key2.value=innerValue}: test (eventKey=event)",
    );
  });

  it("should serialize empty objects correctly", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    span(Level.INFO, "Example.test", {
      emptyObject: {},
    }).enter();
    event(Level.INFO, "test", {
      emptyObject: {},
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] Example.test{emptyObject={}}: test (emptyObject={})",
    );
  });

  it("should serialize errors correctly", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    function makeError(message: string) {
      const error = new Error(message);
      error.stack = "[stack]";
      return error;
    }

    // Act
    span(Level.INFO, "Example.test", {
      error: makeError("span error"),
    }).enter();
    event(Level.INFO, "test", {
      error: makeError("event error"),
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] Example.test{error.name=Error, error.message=span error, error.stack=[stack]}: test (error.name=Error, error.message=event error, error.stack=[stack])",
    );
  });

  it("should serialize dates correctly", () => {
    // Arrange
    using _time = new FakeTime(new Date(0));
    FmtSubscriber.setGlobalDefault({ color: false });

    // Act
    span(Level.INFO, "Example.test", {
      date: new Date(0),
    }).enter();
    event(Level.INFO, "test", {
      date: new Date(0),
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[1970-01-01T00:00:00.000Z] [INFO] Example.test{date=1970-01-01T00:00:00.000Z}: test (date=1970-01-01T00:00:00.000Z)",
    );
  });
});
