import "../__utils__/snapshotHelper.ts";
import { FmtSubscriber, info, instrument, Level } from "@bcheidemann/tracing";

FmtSubscriber.setGlobalDefault({
  level: Level.DEBUG,
});

class Example {
  @instrument()
  basicInstrumention() {
    info("basic instrumentation");
  }
}

const example = new Example();

example.basicInstrumention();
