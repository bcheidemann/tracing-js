import { describe, it } from "jsr:@std/testing@^0.225.2/bdd";
// @deno-types="@types/eslint"
import { RuleTester } from "eslint";
import { preferExplicitResourceManagementRule } from "./rules/preferExplicitResourceManagement.ts";
import typescriptEslintParser from "@typescript-eslint/parser";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescriptEslintParser,
  },
});

describe("eslint plugin", () => {
  it(preferExplicitResourceManagementRule.name, () => {
    ruleTester.run(
      preferExplicitResourceManagementRule.name,
      preferExplicitResourceManagementRule,
      {
        valid: [
          ...[
            "span",
            "traceSpan",
            "debugSpan",
            "infoSpan",
            "warnSpan",
            "errorSpan",
            "criticalSpan",
          ].flatMap((spanName) => [
            {
              code: `using _guard = ${spanName}("message").enter();`,
            },
            {
              code: `using _guard = ${spanName}("message");`,
            },
            {
              code: `using _guard = ${spanName}("message").dummy();`,
            },
          ]),
        ],
        invalid: [
          ...[
            "span",
            "traceSpan",
            "debugSpan",
            "infoSpan",
            "warnSpan",
            "errorSpan",
            "criticalSpan",
          ].flatMap((spanName) => [
            {
              code: `const guard = ${spanName}("message").enter();`,
              errors: [{ messageId: "preferExplicitResourceManagement" }],
            },
            {
              code: `${spanName}("message").enter();`,
              errors: [{ messageId: "preferExplicitResourceManagement" }],
            },
          ]),
        ],
      },
    );
  });
});
