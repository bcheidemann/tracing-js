import { describe, it } from "@std/testing/bdd";
import { returnsNext, stub } from "@std/testing/mock";
import { supportsColor } from "../../utils/supportsColor.ts";
import { assertEquals } from "@std/assert";
import { Deno } from "../../utils/stubbable/deno.ts";

describe("supportsColor", () => {
  describe("Deno", () => {
    const testCases: [
      isTerminal: boolean,
      noColor: boolean,
      expectedResult: boolean,
    ][] = [
      [true, true, false],
      [true, false, true],
      [false, false, false],
      [false, true, false],
    ];
    for (const [isTerminal, noColor, expectedResult] of testCases) {
      it(`should return ${expectedResult} if stdin ${isTerminal ? "is" : "is not"} a terminal and NO_COLOR ${noColor ? "was" : "was not"} set at program start`, () => {
        // Arrange
        using _isTerminal = stub(
          Deno.stdin,
          "isTerminal",
          returnsNext([isTerminal]),
        );
        using _noColor = stub(
          Deno,
          "noColor",
          returnsNext([noColor]),
        );

        // Act
        const result = supportsColor();

        // Assert
        assertEquals(result, expectedResult);
      });
    }
  });

  describe("Node", () => {
    const testCases: [
      name: string,
      stdin: unknown,
      NO_COLOR: string | undefined,
      expectedResult: boolean,
    ][] = [
      [
        "should return false when stdin is undefined",
        undefined,
        undefined,
        false,
      ],
      [
        "should return false when stdin.isTTY is false",
        { isTTY: false },
        undefined,
        false,
      ],
      [
        "should return false when stdin.isTTY is true but NO_COLOR is set",
        { isTTY: false },
        "true",
        false,
      ],
      [
        "should return true when stdin.isTTY is true and NO_COLOR is not set",
        { isTTY: true },
        undefined,
        true,
      ],
    ];
    for (const [name, stdin, NO_COLOR, expectedResult] of testCases) {
      it(name, () => {
        // Arrange
        const Deno = globalThis.Deno;
        // @ts-expect-error -- intentionally deleting Deno global
        delete globalThis.Deno;
        // @ts-expect-error -- intentionally setting process
        globalThis.process = {
          stdin,
          env: {
            NO_COLOR,
          },
        };
        using _restore = {
          [Symbol.dispose]() {
            globalThis.Deno = Deno;
            // @ts-expect-error -- process is known to be set
            delete globalThis.process;
          },
        };

        // Act
        const result = supportsColor();

        // Assert
        assertEquals(result, expectedResult);
      });
    }
  });

  describe("unknown runtime", () => {
    it("should return false", () => {
      // Arrange
      const Deno = globalThis.Deno;
      // @ts-expect-error -- intentionally deleting Deno global
      delete globalThis.Deno;
      using _restore = {
        [Symbol.dispose]() {
          globalThis.Deno = Deno;
        },
      };

      // Act
      const result = supportsColor();

      // Assert
      assertEquals(result, false);
    });
  });
});
