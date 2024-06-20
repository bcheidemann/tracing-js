// deno-lint-ignore-file verbatim-module-syntax

// @deno-types="@types/eslint"
import { type Rule } from "eslint";

const spanNames = [
  "span",
  "traceSpan",
  "debugSpan",
  "infoSpan",
  "warnSpan",
  "errorSpan",
  "criticalSpan",
];

export const preferExplicitResourceManagementRule: Rule.RuleModule & {
  name: string;
} = {
  name: "prefer-explicit-resource-management",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "When manually exiting spans, it is easy to forget to exit spans, which may lead to unexpected results. Therefore, explicit resource management (using declarations) is preferred.",
      // TODO: url
    },
    schema: [], // no options
    messages: {
      preferExplicitResourceManagement:
        "Prefer explicit resource management over manually exiting spans.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") {
          return;
        }
        const { object, property } = callee;
        if (property.type !== "Identifier" || property.name !== "enter") {
          return;
        }
        if (
          object.type !== "CallExpression" ||
          object.callee.type !== "Identifier" ||
          !spanNames.includes(object.callee.name)
        ) {
          return;
        }
        if (
          node.parent.type === "VariableDeclarator" &&
          node.parent.parent.type === "VariableDeclaration" &&
          (node.parent.parent.kind as string) === "using"
        ) {
          return;
        }
        // guard is not assigned to a using declaration
        context.report({
          messageId: "preferExplicitResourceManagement",
          node,
        });
      },
    };
  },
};
