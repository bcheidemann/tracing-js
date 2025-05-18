import "../__utils__/snapshotHelper.ts";
import {
  debug,
  errorSpan,
  field,
  FmtSubscriber,
  info,
  infoSpan,
  instrument,
  Level,
  log,
  logEnter,
  logError,
  logExit,
  logReturnValue,
  message,
  redact,
  skip,
  skipAll,
  target,
  trace,
} from "@bcheidemann/tracing";

FmtSubscriber.setGlobalDefault({
  level: Level.DEBUG,
});

{
  using _infoGuard = infoSpan("info span 1", { key: "value" }).enter();
  trace("SHOULD NOT BE LOGGED");
  debug("this should be logged");
  info("this should be logged with a value", { key: "value" });
  {
    using _errorGuard = errorSpan("error span").enter();
    trace("SHOULD NOT BE LOGGED");
    debug("this should be logged");
    info("this should be logged with a value", { key: "value" });
  }
}

class Example {
  @instrument()
  basicInstrumention() {
    info("basic instrumentation");
  }

  @instrument(message("custom message"))
  customMessage() {
    info("custom message");
  }

  @instrument(target("ExampleClass", "targetMethod"))
  target() {
    info("target");
  }

  @instrument(skip("_arg1"))
  skipByName(_arg0: string, _arg1: string, _arg2: string) {
    info("skip by name");
  }

  @instrument(skipAll)
  skipAll(_arg0: string, _arg1: string, _arg2: string) {
    info("skip all");
  }

  @instrument(redact(0))
  redactByIndex(_arg0: string, _arg1: string, _arg2: string) {
    info("redact by index");
  }

  @instrument(redact("_arg0"))
  redactByName(_arg0: string, _arg1: string, _arg2: string) {
    info("redact by name");
  }

  @instrument(redact(0, (arg0) => arg0.password))
  redactFieldByIndex(
    _arg0: { username: string; password: string },
    _arg1: string,
    _arg2: string,
  ) {
    info("redact field by index");
  }

  @instrument(redact("_arg0", (arg0) => arg0.password))
  redactFieldByName(
    _arg0: { username: string; password: string },
    _arg1: string,
    _arg2: string,
  ) {
    info("redact field by name");
  }

  @instrument(redact(0, (arg0) => arg0.req.credentials.password))
  redactDeepFieldByIndex(
    _arg0: { req: { credentials: { username: string; password: string } } },
    _arg1: string,
    _arg2: string,
  ) {
    info("redact field by index");
  }

  @instrument(redact("_arg0", (arg0) => arg0.req.credentials.password))
  redactDeepFieldByName(
    _arg0: { req: { credentials: { username: string; password: string } } },
    _arg1: string,
    _arg2: string,
  ) {
    info("redact field by name");
  }

  @instrument(field("key", "value"))
  field() {
    info("field");
  }

  @instrument(logEnter())
  logEnter() {
    info("log enter");
  }

  @instrument(logExit())
  logExit() {
    info("log exit");
  }

  @instrument(logReturnValue())
  logReturnValue() {
    info("log return value");
    return "return value";
  }

  @instrument(logError())
  logError() {
    info("log error");
    throw new Error("whoops!");
  }

  @instrument(log())
  log() {
    info("log");
  }
}

const example = new Example();

example.basicInstrumention();
example.customMessage();
example.field();
example.log();
example.logEnter();
try {
  example.logError();
} catch (_error) {
  // Do nothing
}
example.logExit();
example.logReturnValue();
example.skipAll("arg0", "arg1", "arg2");
example.skipByName("arg0", "arg1", "arg2");
example.redactByName("arg0", "arg1", "arg2");
example.redactByIndex("arg0", "arg1", "arg2");
example.redactFieldByName(
  { username: "test", password: "Pa$$word" },
  "arg1",
  "arg2",
);
example.redactFieldByIndex(
  { username: "test", password: "Pa$$word" },
  "arg1",
  "arg2",
);
example.redactDeepFieldByName(
  { req: { credentials: { username: "test", password: "Pa$$word" } } },
  "arg1",
  "arg2",
);
example.redactDeepFieldByIndex(
  { req: { credentials: { username: "test", password: "Pa$$word" } } },
  "arg1",
  "arg2",
);
example.target();
