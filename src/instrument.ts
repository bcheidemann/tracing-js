/**
 * @module
 * This module provides functions for instrumenting methods and functions.
 */

import { parseParamNamesFromFunction } from "@bcheidemann/parse-params";
import { context, getContext } from "./context.ts";
import { event } from "./event.ts";
import { Level } from "./level.ts";
import { span } from "./span.ts";
import { AssertionError } from "node:assert";

// deno-lint-ignore no-explicit-any
type AnyFunction = (this: any, ...args: any[]) => any;

const AttributeKind = {
  Message: 0 as const,
  Target: 1 as const,
  Level: 2 as const,
  Skip: 3 as const,
  SkipAll: 4 as const,
  SkipThis: 5 as const,
  Field: 6 as const,
  LogEnter: 7 as const,
  LogExit: 8 as const,
  LogError: 9 as const,
  Log: 10 as const,
};

type AttributeKind = typeof AttributeKind;

type MessageAttribute = {
  kind: AttributeKind["Message"];
  message: string;
};

type TargetAttribute =
  & {
    kind: AttributeKind["Target"];
  }
  & (
    | {
      class: string;
      method: string;
      private?: boolean;
    }
    | {
      function: string;
    }
  );

type LevelAttribute = {
  kind: AttributeKind["Level"];
  level: Level;
};

// deno-lint-ignore no-explicit-any
type SkipByMask<TArgs extends any[]> = {
  [index in keyof TArgs]: boolean;
};
// deno-lint-ignore no-explicit-any
type SkipAttribute<TArgs extends any[]> = {
  kind: AttributeKind["Skip"];
  skip: SkipByMask<TArgs> | string[] | number[];
};

type SkipAllAttribute = {
  kind: AttributeKind["SkipAll"];
};

type SkipThisAttribute = {
  kind: AttributeKind["SkipThis"];
};

// deno-lint-ignore no-explicit-any
type FieldAttribute<TArgs extends any[]> = {
  kind: AttributeKind["Field"];
  name: string;
  value: unknown | ((args: TArgs[]) => unknown);
};

type LogEnterAttribute = {
  kind: AttributeKind["LogEnter"];
};

type LogExitAttribute = {
  kind: AttributeKind["LogExit"];
};

type LogErrorAttribute = {
  kind: AttributeKind["LogError"];
};

type LogAttribute = {
  kind: AttributeKind["Log"];
};

// deno-lint-ignore no-explicit-any
type Attributes<TArgs extends any[]> =
  | MessageAttribute
  | TargetAttribute
  | LevelAttribute
  | SkipAttribute<TArgs>
  | SkipAllAttribute
  | SkipThisAttribute
  | FieldAttribute<TArgs>
  | LogEnterAttribute
  | LogExitAttribute
  | LogErrorAttribute
  | LogAttribute;

type InstrumentDecorator<TMethod extends AnyFunction> = (
  target: TMethod,
  context: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
) => TMethod;

/**
 * The message attribute is used to override the message of the span created by the instrumented method or function.
 *
 * @example Instrument a method with a custom message
 * ```ts
 * import { instrument, message } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(message("Custom message"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom message
 * ```ts
 * import { instrumentCallback, message } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [message("Custom message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message The message to use for the span created by the instrumented method or function
 * @returns The message attribute
 */
export function message(message: string): MessageAttribute {
  return { kind: AttributeKind.Message, message };
}

/**
 * The target attribute is used to override the target field of the span created by the instrumented method or function.
 *
 * @example Instrument a method with a custom target
 * ```ts
 * import { instrument, target } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(target("Example", "test"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom target
 * ```ts
 * import { instrumentCallback, target } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [target("test")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param className The class name to use for the target field
 * @param method The method name to use for the target field
 * @param isPrivate Whether the method is private (optional)
 * @returns The target attribute
 */
export function target(
  className: string,
  method: string,
  isPrivate?: boolean,
): TargetAttribute;
/**
 * The target attribute is used to override the target field of the span created by the instrumented method or function.
 *
 * @example Instrument a method with a custom target
 * ```ts
 * import { instrument, target } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(target("Example", "test"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom target
 * ```ts
 * import { instrumentCallback, target } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [target("test")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param functionName The function name to use for the target field
 * @returns The target attribute
 */
export function target(functionName: string): TargetAttribute;
export function target(
  classOrFunctionName: string,
  method?: string,
  isPrivate?: boolean,
): TargetAttribute {
  if (method !== undefined) {
    return {
      kind: AttributeKind.Target,
      class: classOrFunctionName,
      method,
      private: isPrivate ?? false,
    };
  }
  return { kind: AttributeKind.Target, function: classOrFunctionName };
}

/**
 * The level attribute is used to override the level of the span created by the instrumented method or function.
 *
 * @example Instrument a method with a custom level
 * ```ts
 * import { instrument, level, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(level(Level.TRACE))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom level
 * ```ts
 * import { instrumentCallback, level, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [level(Level.TRACE)],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The level to use for the span created by the instrumented method or function
 * @returns The level attribute
 */
export function level(level: Level): LevelAttribute {
  return { kind: AttributeKind.Level, level };
}

/**
 * The skip attribute is used to skip logging of specific arguments of the instrumented method or function.
 *
 * The skip attribute supports the following syntax:
 * - `skip("arg0")`: Skip arguments by name (doesn't work in minified code)
 * - `skip(0)`: Skip arguments by index
 * - `skip(true, false, false)`: Skip arguments by mask
 *
 * @example Instrument a method and skip logging of the first argument
 * ```ts
 * import { instrument, skip } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(true, false)
 *   test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and skip logging of the first argument
 * ```ts
 * import { instrumentCallback, skip } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [skip(true, false)],
 *   function test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param mask The arguments to skip
 * @returns The skip attribute
 */
// deno-lint-ignore no-explicit-any
export function skip<TArgs extends any[]>(
  ...mask: SkipByMask<TArgs>
): SkipAttribute<TArgs>;
/**
 * The skip attribute is used to skip logging of specific arguments of the instrumented method or function.
 *
 * The skip attribute supports the following syntax:
 * - `skip("arg0")`: Skip arguments by name (doesn't work in minified code)
 * - `skip(0)`: Skip arguments by index
 * - `skip(true, false, false)`: Skip arguments by mask
 *
 * @example Instrument a method and skip logging of the first argument
 * ```ts
 * import { instrument, skip } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument("arg0")
 *   test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and skip logging of the first argument
 * ```ts
 * import { instrumentCallback, skip } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [skip("arg0")],
 *   function test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param paramNames The arguments to skip by name
 * @returns The skip attribute
 */
// deno-lint-ignore no-explicit-any
export function skip(...paramNames: string[]): SkipAttribute<any>;
/**
 * The skip attribute is used to skip logging of specific arguments of the instrumented method or function.
 *
 * The skip attribute supports the following syntax:
 * - `skip("arg0")`: Skip arguments by name (doesn't work in minified code)
 * - `skip(0)`: Skip arguments by index
 * - `skip(true, false, false)`: Skip arguments by mask
 *
 * @example Instrument a method and skip logging of the first argument
 * ```ts
 * import { instrument, skip } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(0)
 *   test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and skip logging of the first argument
 * ```ts
 * import { instrumentCallback, skip } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [skip(0)],
 *   function test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param paramIndices The arguments to skip by index
 * @returns The skip attribute
 */
// deno-lint-ignore no-explicit-any
export function skip(...paramIndices: number[]): SkipAttribute<any>;
// deno-lint-ignore no-explicit-any
export function skip<TArgs extends any[]>(
  ...skip: SkipAttribute<TArgs>["skip"]
): SkipAttribute<TArgs> {
  return { kind: AttributeKind.Skip, skip };
}

/**
 * The skipAll attribute is used to skip logging of all arguments and the `this` value of the instrumented method or function.
 *
 * @example Instrument a method and skip logging of all arguments and the `this` value
 * ```ts
 * import { instrument, skipAll } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(skipAll)
 *   test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and skip logging of all arguments and the `this` value
 * ```ts
 * import { instrumentCallback, skipAll } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [skipAll],
 *   function test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * );
 * ```
 */
export const skipAll: SkipAllAttribute = { kind: AttributeKind.SkipAll };

/**
 * The skipThis attribute is used to skip logging of the `this` value of the instrumented method or function.
 *
 * @example Instrument a method and skip logging of the `this` value
 * ```ts
 * import { instrument, skipThis } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(skipThis)
 *   test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and skip logging of the `this` value
 * ```ts
 * import { instrumentCallback, skipThis } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [skipThis],
 *   function test(arg0: string, arg1: number) {
 *     // ...
 *   }
 * );
 * ```
 */
export const skipThis: SkipThisAttribute = { kind: AttributeKind.SkipThis };

/**
 * The field attribute is used to add custom fields to the span created by the instrumented method or function.
 *
 * The field attribute supports the following syntax:
 * - `field("fieldName", "fieldValue")`: Add a field with a static value
 * - `field("fieldName", (args) => args[0])`: Add a field with a dynamic value
 *
 * @example Instrument a method with a custom field
 * ```ts
 * import { instrument, field } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(field("fieldName", "fieldValue"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom field
 * ```ts
 * import { instrumentCallback, field } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [field("fieldName", "fieldValue")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param name The name of the field
 * @param mapValue The value of the field
 * @returns The field attribute
 */
// deno-lint-ignore no-explicit-any
export function field<TArgs extends any[]>(
  name: string,
  mapValue: (args: NoInfer<TArgs>) => unknown,
): FieldAttribute<TArgs>;
/**
 * The field attribute is used to add custom fields to the span created by the instrumented method or function.
 *
 * The field attribute supports the following syntax:
 * - `field("fieldName", "fieldValue")`: Add a field with a static value
 * - `field("fieldName", (args) => args[0])`: Add a field with a dynamic value
 *
 * @example Instrument a method with a custom field
 * ```ts
 * import { instrument, field } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(field("fieldName", (args) => args[0]))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function with a custom field
 * ```ts
 * import { instrumentCallback, field } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [field("fieldName", (args) => args[0]))],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param name The name of the field
 * @param mapValue The value of the field
 * @returns The field attribute
 */
// deno-lint-ignore no-explicit-any
export function field<TArgs extends any[], TValue>(
  name: string,
  value: TValue extends AnyFunction ? never : TValue,
): FieldAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function field<TArgs extends any[]>(
  name: string,
  value: unknown | ((...args: TArgs[]) => unknown),
): FieldAttribute<TArgs> {
  return { kind: AttributeKind.Field, name, value };
}

/**
 * The logEnter attribute is used to log a message when entering the instrumented method or function.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter)
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logEnter } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logEnter],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
export const logEnter: LogEnterAttribute = { kind: AttributeKind.LogEnter };

/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * @example Instrument a method and log a message when exiting
 * ```ts
 * import { instrument, logExit } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit)
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when exiting
 * ```ts
 * import { instrumentCallback, logExit } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logExit],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
export const logExit: LogExitAttribute = { kind: AttributeKind.LogExit };

/**
 * The logError attribute is used to log a message when an error occurs in the instrumented method or function.
 *
 * @example Instrument a method and log a message when an error occurs
 * ```ts
 * import { instrument, logError } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError)
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when an error occurs
 * ```ts
 * import { instrumentCallback, logError } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logError],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
export const logError: LogErrorAttribute = { kind: AttributeKind.LogError };

/**
 * The log attribute is used to log a message when entering, exiting, or when an error occurs in the instrumented method or function.
 *
 * @example Instrument a method and log a message when entering, exiting, or when an error occurs
 * ```ts
 * import { instrument, log } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(log)
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering, exiting, or when an error occurs
 * ```ts
 * import { instrumentCallback, log } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [log],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
export const log: LogAttribute = { kind: AttributeKind.Log };

/**
 * The instrument decorator is used to instrument a method with the provided attributes.
 *
 * @example Instrument a method
 * ```ts
 * import { instrument } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument()
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a method with a custom message
 * ```ts
 * import { instrument, message } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(message("Custom message"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @param attributes The attributes to use for the instrumented method
 * @returns The instrument decorator
 */
export function instrument<TMethod extends AnyFunction>(
  ...attributes: Attributes<Parameters<TMethod>>[]
): InstrumentDecorator<TMethod> {
  return function instrumentDecorator(
    target: TMethod,
    ctx: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
  ) {
    return instrumentCallbackImpl(target, attributes, {
      kind: "method",
      isPrivate: ctx.private,
      methodName: typeof ctx.name === "symbol" ? ctx.name.toString() : ctx.name,
    });
  };
}

/**
 * The instrumentCallback function is used to instrument a function with the provided attributes.
 *
 * @example Instrument a function
 * ```ts
 * import { instrumentCallback } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(function test() {
 *   // ...
 * });
 * ```
 *
 * @example Instrument a function with a custom message
 * ```ts
 * import { instrumentCallback, message } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [message("Custom message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param fn The function to instrument
 * @returns The instrumented function
 */
export function instrumentCallback<
  TCallback extends AnyFunction,
>(fn: TCallback): TCallback;
export function instrumentCallback<
  TCallback extends AnyFunction,
>(attributes: Attributes<Parameters<TCallback>>[], fn: TCallback): TCallback;
export function instrumentCallback<
  TCallback extends AnyFunction,
>(
  attributesOrFn: TCallback | Attributes<Parameters<TCallback>>[],
  fn?: TCallback,
): TCallback {
  if (fn) {
    return instrumentCallbackImpl(
      fn,
      attributesOrFn as Attributes<Parameters<TCallback>>[],
      { kind: "function" },
    );
  }

  return instrumentCallbackImpl(attributesOrFn as TCallback, [], {
    kind: "function",
  });
}

type Defaults = {
  [AttributeKind.Message]: MessageAttribute;
  [AttributeKind.Target]: TargetAttribute;
  [AttributeKind.Level]: LevelAttribute;
};

// deno-lint-ignore no-explicit-any
function collectAttributes<TArgs extends any[]>(
  attributes: Attributes<TArgs>[],
  defaults: Defaults,
): {
  [AttributeKind.Message]: MessageAttribute;
  [AttributeKind.Target]: TargetAttribute;
  [AttributeKind.Level]: LevelAttribute;
  [AttributeKind.Skip]: SkipAttribute<TArgs>[];
  [AttributeKind.SkipAll]?: SkipAllAttribute;
  [AttributeKind.SkipThis]?: SkipThisAttribute;
  [AttributeKind.Field]: FieldAttribute<TArgs>[];
  [AttributeKind.LogEnter]?: LogEnterAttribute;
  [AttributeKind.LogExit]?: LogExitAttribute;
  [AttributeKind.LogError]?: LogErrorAttribute;
  [AttributeKind.Log]?: LogAttribute;
} {
  const attributesByKind: ReturnType<typeof collectAttributes<TArgs>> = {
    [AttributeKind.Message]: defaults[AttributeKind.Message],
    [AttributeKind.Target]: defaults[AttributeKind.Target],
    [AttributeKind.Level]: defaults[AttributeKind.Level],
    [AttributeKind.Skip]: [],
    [AttributeKind.SkipAll]: undefined,
    [AttributeKind.SkipThis]: undefined,
    [AttributeKind.Field]: [],
    [AttributeKind.LogEnter]: undefined,
    [AttributeKind.LogExit]: undefined,
    [AttributeKind.LogError]: undefined,
    [AttributeKind.Log]: undefined,
  };

  for (const attribute of attributes) {
    switch (attribute.kind) {
      case AttributeKind.Message:
        attributesByKind[AttributeKind.Message] = attribute;
        break;
      case AttributeKind.Target:
        attributesByKind[AttributeKind.Target] = attribute;
        break;
      case AttributeKind.Level:
        attributesByKind[AttributeKind.Level] = attribute;
        break;
      case AttributeKind.Skip:
        attributesByKind[AttributeKind.Skip].push(attribute);
        break;
      case AttributeKind.SkipAll:
        attributesByKind[AttributeKind.SkipAll] = attribute;
        break;
      case AttributeKind.SkipThis:
        attributesByKind[AttributeKind.SkipThis] = attribute;
        break;
      case AttributeKind.Field:
        attributesByKind[AttributeKind.Field].push(attribute);
        break;
      case AttributeKind.LogEnter:
        attributesByKind[AttributeKind.LogEnter] = attribute;
        break;
      case AttributeKind.LogExit:
        attributesByKind[AttributeKind.LogExit] = attribute;
        break;
      case AttributeKind.LogError:
        attributesByKind[AttributeKind.LogError] = attribute;
        break;
      case AttributeKind.Log:
        attributesByKind[AttributeKind.Log] = attribute;
        break;
      // deno-lint-ignore no-case-declarations
      default:
        const _: never = attribute;
        throw new AssertionError({
          message: "Invalid attribute kind",
          // deno-lint-ignore no-explicit-any
          actual: (attribute as any).kind,
          expected: Object.keys(AttributeKind).join(" | "),
        });
    }
  }

  return attributesByKind;
}

type Context =
  | {
    kind: "function";
  }
  | {
    kind: "method";
    isPrivate: boolean;
    methodName: string;
  };

// deno-lint-ignore ban-types
const ParsedFunctionParams = new WeakMap<Function, string[]>();

function instrumentCallbackImpl<
  TCallback extends AnyFunction,
>(
  fn: TCallback,
  attributes: Attributes<Parameters<TCallback>>[],
  instrumentCtx: Context,
): TCallback {
  return function instrumentedCallback(
    this: ThisParameterType<TCallback>,
    ...args: Parameters<TCallback>
  ) {
    const ctx = getContext()?.clone();

    if (!ctx) {
      return fn.apply(this, args);
    }

    const fnName = fn.name || "[unknown function]";
    const defaults: Defaults = {
      [AttributeKind.Message]: instrumentCtx.kind === "function"
        ? message(fn.name)
        : message(
          `${this?.constructor?.name ?? "[unknown class]"}.${fnName}`,
        ),
      [AttributeKind.Target]: instrumentCtx.kind === "function"
        ? target(fnName)
        : target(
          this?.constructor?.name ?? "[unknown class]",
          instrumentCtx.methodName,
          instrumentCtx.isPrivate,
        ),
      [AttributeKind.Level]: level(Level.INFO),
    };
    const attributesByKind = collectAttributes(attributes, defaults);
    return context.run(ctx, () => {
      const level = attributesByKind[AttributeKind.Level].level;
      const message = attributesByKind[AttributeKind.Message].message;
      const target = (() => {
        const targetAttribute = attributesByKind[AttributeKind.Target];
        if ("class" in targetAttribute) {
          return {
            class: targetAttribute.class,
            method: targetAttribute.method,
            private: targetAttribute.private,
          };
        }
        return {
          function: targetAttribute.function,
        };
      })();
      const logArgs = (() => {
        const logArgs: Record<number, unknown> & { this?: unknown } = {
          ...args,
        };
        if (attributesByKind[AttributeKind.SkipAll] !== undefined) {
          return [];
        }
        if (attributesByKind[AttributeKind.SkipThis] === undefined) {
          logArgs["this"] = this;
        }
        for (const skipAttribute of attributesByKind[AttributeKind.Skip]) {
          skipAttribute.skip.forEach((skip, index) => {
            switch (typeof skip) {
              // deno-lint-ignore no-case-declarations
              case "string":
                const paramNames = ParsedFunctionParams.get(fn) ??
                  parseParamNamesFromFunction(fn);
                ParsedFunctionParams.set(fn, paramNames);
                const skipIndex = paramNames.indexOf(skip);
                delete logArgs[skipIndex];
                break;
              case "number":
                delete logArgs[skip];
                break;
              case "boolean":
                if (skip) {
                  delete logArgs[index];
                }
                break;
              default:
                throw new AssertionError({
                  message: "Invalid type for skip attribute value",
                  actual: typeof skip,
                  expected: "string | number | boolean",
                });
            }
          });
        }
        return logArgs;
      })();
      const log = Boolean(attributesByKind[AttributeKind.Log]);
      const logEnter = log || Boolean(attributesByKind[AttributeKind.LogEnter]);
      const logExit = log || Boolean(attributesByKind[AttributeKind.LogExit]);
      const logError = log || Boolean(attributesByKind[AttributeKind.LogError]);
      const fields = attributesByKind[AttributeKind.Field].reduce(
        (acc, field) => {
          acc[field.name] = typeof field.value === "function"
            ? field.value(args)
            : field.value;
          return acc;
        },
        {} as Record<string, unknown>,
      );
      const guard = span(level, message, {
        target,
        args: logArgs,
        ...fields,
      }).enter();
      try {
        if (logEnter) {
          event(level, `Entering ${message}`);
        }
        const returnValue = fn.apply(this, args);

        // Handle async error / success
        if (returnValue instanceof Promise) {
          return returnValue
            .catch((error) => {
              if (logError) {
                event(level, `Error in ${message}`, { error });
              }
              guard.exit();
              throw error;
            })
            .then((returnValue) => {
              if (logExit) {
                event(level, `Exiting ${message}`, { returnValue });
              }
              guard.exit();
              return returnValue;
            });
        }

        // Handle sync success
        if (logExit) {
          event(level, `Exiting ${message}`, { returnValue });
        }
        guard.exit();
        return returnValue;
      } catch (err) {
        // Handle sync errors
        if (logError) {
          event(level, `Error in ${message}`, { error: err });
        }
        guard.exit();
        throw err;
      }
    });
  } as TCallback;
}
