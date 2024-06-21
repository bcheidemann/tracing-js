import "../__utils__/snapshotHelper.ts";
import { critical, debug, error, info, trace, warn } from "../../event.ts";
import { Level } from "../../level.ts";
import { infoSpan } from "../../span.ts";
import { FmtSubscriber } from "../../subscriber.ts";

FmtSubscriber.setGlobalDefault({
  level: Level.DISABLED,
});

using _guard = infoSpan("basic-example", { dummy: "value" }).enter();

trace("This is a trace message", { key: "value" });
debug("This is a debug message", { key: "value" });
info("This is an info message", { key: "value" });
warn("This is a warn message", { key: "value" });
error("This is an error message", { key: "value" });
critical("This is a critical message", { key: "value" });
