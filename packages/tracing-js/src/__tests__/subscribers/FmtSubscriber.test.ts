import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { event } from "../../event";
import { span } from "../../span";
import { Level } from "../../level";
import { FmtSubscriber } from "../../subscribers/FmtSubscriber";

describe("FmtSubscriber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  
  it("should log the message to the console", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

    // Act
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] test");
  });

  it.each([
    [Level.TRACE, "log"],
    [Level.DEBUG, "log"],
    [Level.INFO, "log"],
    [Level.WARN, "warn"],
    [Level.ERROR, "error"],
    [Level.CRITICAL, "error"],
  ] satisfies [Level, keyof typeof console][])(
    "should log the message to the console for level %s with console.%s", 
    (level, log) => {
      // Arrange
      const spy = vi.spyOn(console, log).mockImplementation(() => {});
      FmtSubscriber.init({
        level: Level.TRACE
      });

      // Act
      event(level, "test");

      // Assert
      expect(spy).toHaveBeenCalled();
    },
  );

  it("should log the message to the console with a field", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

    // Act
    event(Level.INFO, "test", {
      key: "value",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] test (key=value)");
  });

  it("should log the message to the console with fields", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

    // Act
    event(Level.INFO, "test", {
      key: "value",
      key2: "value2",
    });

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] test (key=value, key2=value2)");
  });

  it("should log the message to the console with a span", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

    // Act
    span(Level.INFO, "test span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] test span : test");
  });

  it("should log the message to the console with spans", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

    // Act
    span(Level.INFO, "outer span").enter();
    span(Level.INFO, "inner span").enter();
    event(Level.INFO, "test");

    // Assert
    expect(log).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] outer span > inner span : test");
  });

  it("should log fields from spans", () => {
    // Arrange
    vi.setSystemTime(new Date(0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    FmtSubscriber.init();

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
    expect(log).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z] [INFO] outer span > inner span : test (eventKey=event, innerSpanKey=inner, outerSpanKey=outer)");
  });
});
