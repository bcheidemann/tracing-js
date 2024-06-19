import { Buffer, mergeReadableStreams } from "@std/streams";
import { assertSnapshot } from "@std/testing/snapshot";
import { assert } from "@std/assert";
import { describe, it } from "jsr:@std/testing@^0.225.2/bdd";

describe("basic example", () => {
  it("should match the snapshot", async (context) => {
    const command = new Deno.Command("deno", {
      args: ["run", "--allow-env=IS_SNAPSHOT_RUN", "src/examples/basic/main.ts"],
      env: {
        IS_SNAPSHOT_RUN: "true",
      },
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const buf = new Buffer();
    mergeReadableStreams(command.stdout, command.stderr).pipeTo(buf.writable);
    const status = await command.status;
    const output = new TextDecoder().decode(buf.bytes());
    assert(status.success, `The command failed:\n\n${output}`);
    await assertSnapshot(context, output);
  });
});
