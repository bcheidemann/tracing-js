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
  Field: 5 as const,
  LogEnter: 6 as const,
  LogExit: 7 as const,
  LogReturnValue: 8 as const,
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

// deno-lint-ignore no-explicit-any
type FieldAttribute<TArgs extends any[]> = {
  kind: AttributeKind["Field"];
  name: string;
  value: unknown | ((args: TArgs[]) => unknown);
};

// deno-lint-ignore no-explicit-any
type LogEnterAttribute<TArgs extends any[]> = {
  kind: AttributeKind["LogEnter"];
  message?: string | ((args: TArgs) => string);
  level?: Level;
};

// deno-lint-ignore no-explicit-any
type LogExitAttribute<TArgs extends any[]> = {
  kind: AttributeKind["LogExit"];
  message?: string | ((args: TArgs) => string);
  level?: Level;
};

// deno-lint-ignore no-explicit-any
type LogReturnValueAttribute<TArgs extends any[], TReturn> = {
  kind: AttributeKind["LogReturnValue"];
  map?: (
    returnValue: TReturn extends Promise<infer TReturnPromise> ? TReturnPromise
      : TReturn,
    args: TArgs,
  ) => unknown;
};

// deno-lint-ignore no-explicit-any
type LogErrorAttribute<TArgs extends any[]> = {
  kind: AttributeKind["LogError"];
  message?: string | ((args: TArgs) => string);
  level?: Level;
};

type LogAttribute = {
  kind: AttributeKind["Log"];
  level?: Level;
};

// deno-lint-ignore no-explicit-any
type Attributes<TArgs extends any[], TReturn> =
  | MessageAttribute
  | TargetAttribute
  | LevelAttribute
  | SkipAttribute<TArgs>
  | SkipAllAttribute
  | FieldAttribute<TArgs>
  | LogEnterAttribute<TArgs>
  | LogExitAttribute<TArgs>
  | LogReturnValueAttribute<TArgs, TReturn>
  | LogErrorAttribute<TArgs>
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
 * The target attribute is used to override the target of the span created by the instrumented method or function.
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
 * The skipAll attribute is used to skip logging of all arguments of the instrumented method or function.
 *
 * @example Instrument a method and skip logging of all arguments
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
 * @example Instrument a function and skip logging of all arguments
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
 * The logEnter attribute supports the following syntax:
 *
 * - `logEnter()`: Log the default message when entering with the default log level
 * - `logEnter("Custom message")`: Log a custom message when entering with the default log level
 * - `logEnter(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logEnter(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter())
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
 *   [logEnter()],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(): LogEnterAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  message: string | ((args: TArgs) => string),
): LogEnterAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  level: Level,
): LogEnterAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  level: Level,
  message: string | ((args: TArgs) => string),
): LogEnterAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  levelOrMessage?: Level | string | ((args: TArgs) => string),
  message?: string | ((args: TArgs) => string),
): LogEnterAttribute<TArgs> {
  switch (typeof levelOrMessage) {
    case "string":
    case "function":
      return { kind: AttributeKind.LogEnter, message: levelOrMessage };
    case "number":
      return { kind: AttributeKind.LogEnter, level: levelOrMessage, message };
    case "undefined":
      return { kind: AttributeKind.LogEnter };
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new AssertionError({
        message: "Invalid type for logEnter attribute value",
        actual: typeof levelOrMessage,
        expected: "string | number | function | undefined",
      });
  }
}

/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logExit } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit())
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logExit } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logExit()],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(): LogExitAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  message: string | ((args: TArgs) => string),
): LogExitAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  level: Level,
): LogExitAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  level: Level,
  message: string | ((args: TArgs) => string),
): LogExitAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  levelOrMessage?: Level | string | ((args: TArgs) => string),
  message?: string | ((args: TArgs) => string),
): LogExitAttribute<TArgs> {
  switch (typeof levelOrMessage) {
    case "string":
    case "function":
      return { kind: AttributeKind.LogExit, message: levelOrMessage };
    case "number":
      return { kind: AttributeKind.LogExit, level: levelOrMessage, message };
    case "undefined":
      return { kind: AttributeKind.LogExit };
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new AssertionError({
        message: "Invalid type for logExit attribute value",
        actual: typeof levelOrMessage,
        expected: "string | number | function | undefined",
      });
  }
}

/**
 * The logReturnValue attribute is used to log a message when exiting the instrumented method or function. It has no effect
 * when used without the `log` or `logExit` attribute.
 *
 * The logReturnValue attribute supports the following syntax:
 * - `logReturnValue()`: Add the returnValue field to the exit message
 * - `logReturnValue((returnValue, args) => returnValue)`: Add the returnValue field to the exit message with a custom value
 *
 * @param map The function to map the return value to a custom value
 */
// deno-lint-ignore no-explicit-any
export function logReturnValue<TArgs extends any[], TReturn>(
  map?: LogReturnValueAttribute<TArgs, TReturn>["map"],
): LogReturnValueAttribute<TArgs, TReturn> {
  return { kind: AttributeKind.LogReturnValue, map };
}

/**
 * The logError attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 *
 * The default log level is `Level.ERROR`.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logError } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError())
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logError } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logError()],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(): LogErrorAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  message: string | ((args: TArgs) => string),
): LogErrorAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  level: Level,
): LogErrorAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  level: Level,
  message: string | ((args: TArgs) => string),
): LogErrorAttribute<TArgs>;
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  levelOrMessage?: Level | string | ((args: TArgs) => string),
  message?: string | ((args: TArgs) => string),
): LogErrorAttribute<TArgs> {
  switch (typeof levelOrMessage) {
    case "string":
    case "function":
      return { kind: AttributeKind.LogError, message: levelOrMessage };
    case "number":
      return { kind: AttributeKind.LogError, level: levelOrMessage, message };
    case "undefined":
      return { kind: AttributeKind.LogError };
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new AssertionError({
        message: "Invalid type for logError attribute value",
        actual: typeof levelOrMessage,
        expected: "string | number | function | undefined",
      });
  }
}

/**
 * The log attribute is used to log a message when entering, exiting, or when an error occurs in the instrumented method or function.
 *
 * @example Instrument a method and log a message when entering, exiting, or when an error occurs
 * ```ts
 * import { instrument, log } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(log())
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
 *   [log()],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 */
export function log(level?: Level): LogAttribute {
  return { kind: AttributeKind.Log, level };
}

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
  ...attributes: Attributes<Parameters<TMethod>, ReturnType<TMethod>>[]
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
>(
  attributes: Attributes<Parameters<TCallback>, ReturnType<TCallback>>[],
  fn: TCallback,
): TCallback;
export function instrumentCallback<
  TCallback extends AnyFunction,
>(
  attributesOrFn: TCallback | Attributes<
    Parameters<TCallback>,
    ReturnType<TCallback>
  >[],
  fn?: TCallback,
): TCallback {
  if (fn) {
    return instrumentCallbackImpl(
      fn,
      attributesOrFn as Attributes<
        Parameters<TCallback>,
        ReturnType<TCallback>
      >[],
      { kind: "function" },
    );
  }

  return instrumentCallbackImpl(attributesOrFn as TCallback, [], {
    kind: "function",
  });
}

type Defaults = {
  [AttributeKind.Level]: LevelAttribute;
};

// deno-lint-ignore no-explicit-any
function collectAttributes<TArgs extends any[], TReturnType>(
  attributes: Attributes<TArgs, TReturnType>[],
  defaults: Defaults,
): {
  [AttributeKind.Level]: LevelAttribute;
  [AttributeKind.Message]?: MessageAttribute;
  [AttributeKind.Target]?: TargetAttribute;
  [AttributeKind.Skip]: SkipAttribute<TArgs>[];
  [AttributeKind.SkipAll]?: SkipAllAttribute;
  [AttributeKind.Field]: FieldAttribute<TArgs>[];
  [AttributeKind.LogEnter]?: LogEnterAttribute<TArgs>;
  [AttributeKind.LogExit]?: LogExitAttribute<TArgs>;
  [AttributeKind.LogReturnValue]?: LogReturnValueAttribute<TArgs, TReturnType>;
  [AttributeKind.LogError]?: LogErrorAttribute<TArgs>;
  [AttributeKind.Log]?: LogAttribute;
} {
  const attributesByKind: ReturnType<
    typeof collectAttributes<TArgs, TReturnType>
  > = {
    [AttributeKind.Level]: defaults[AttributeKind.Level],
    [AttributeKind.Message]: undefined,
    [AttributeKind.Target]: undefined,
    [AttributeKind.Skip]: [],
    [AttributeKind.SkipAll]: undefined,
    [AttributeKind.Field]: [],
    [AttributeKind.LogEnter]: undefined,
    [AttributeKind.LogExit]: undefined,
    [AttributeKind.LogReturnValue]: undefined,
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
      case AttributeKind.Field:
        attributesByKind[AttributeKind.Field].push(attribute);
        break;
      case AttributeKind.LogEnter:
        attributesByKind[AttributeKind.LogEnter] = attribute;
        break;
      case AttributeKind.LogExit:
        attributesByKind[AttributeKind.LogExit] = attribute;
        break;
      case AttributeKind.LogReturnValue:
        attributesByKind[AttributeKind.LogReturnValue] = attribute;
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
  attributes: Attributes<Parameters<TCallback>, ReturnType<TCallback>>[],
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

    const defaults: Defaults = {
      [AttributeKind.Level]: level(Level.INFO),
    };
    const attributesByKind = collectAttributes(attributes, defaults);
    return context.run(ctx, () => {
      const spanLevel = attributesByKind[AttributeKind.Level].level;
      const defaultEventLevel = attributesByKind[AttributeKind.Log]?.level ??
        Level.INFO;
      const target = (() => {
        const targetAttribute = attributesByKind[AttributeKind.Target];
        if (!targetAttribute) {
          return;
        }
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
      const fmtTarget = (() => {
        if (target) {
          return target.function
            ? target.function
            : `${target.class}.${target.method}`;
        }
        const fnName = fn.name || "[unknown function]";
        return instrumentCtx.kind === "function"
          ? fn.name
          : `${this?.constructor?.name ?? "[unknown class]"}.${fnName}`;
      })();
      const message = attributesByKind[AttributeKind.Message]?.message ||
        fmtTarget;
      const logArgs = (() => {
        const logArgs: Record<number, unknown> = {
          ...args,
        };
        if (attributesByKind[AttributeKind.SkipAll] !== undefined) {
          return [];
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
      const log = attributesByKind[AttributeKind.Log];
      const logEnter = log || attributesByKind[AttributeKind.LogEnter];
      const logExit = log || attributesByKind[AttributeKind.LogExit];
      const logReturnValue = attributesByKind[AttributeKind.LogReturnValue];
      const logError = log || attributesByKind[AttributeKind.LogError];
      const fields = attributesByKind[AttributeKind.Field].reduce(
        (acc, field) => {
          acc[field.name] = typeof field.value === "function"
            ? field.value(args)
            : field.value;
          return acc;
        },
        {} as Record<string, unknown>,
      );
      const guard = span(spanLevel, message, {
        args: logArgs,
        ...fields,
      }).enter();
      try {
        if (logEnter) {
          if (
            "message" in logEnter && typeof logEnter.message !== "undefined"
          ) {
            const message = typeof logEnter.message === "function"
              ? logEnter.message(args)
              : logEnter.message;
            event(logEnter.level ?? defaultEventLevel, message);
          } else {
            event(logEnter.level ?? defaultEventLevel, `Entering ${fmtTarget}`);
          }
        }
        const returnValue = fn.apply(this, args);

        // Handle async error / success
        if (returnValue instanceof Promise) {
          return returnValue
            .catch((error) => {
              if (logError) {
                if (
                  "message" in logError &&
                  typeof logError.message !== "undefined"
                ) {
                  const message = typeof logError.message === "function"
                    ? logError.message(args)
                    : logError.message;
                  event(logError.level ?? Level.ERROR, message);
                } else {
                  event(
                    logError.level ?? Level.ERROR,
                    `Error in ${fmtTarget}`,
                    { error },
                  );
                }
              }
              guard.exit();
              throw error;
            })
            .then((returnValue) => {
              if (logExit) {
                const fields = logReturnValue && {
                  returnValue: logReturnValue.map
                    ? logReturnValue.map(returnValue, args)
                    : returnValue,
                };
                if (
                  "message" in logExit && typeof logExit.message !== "undefined"
                ) {
                  const message = typeof logExit.message === "function"
                    ? logExit.message(args)
                    : logExit.message;
                  event(logExit.level ?? Level.ERROR, message, fields);
                } else {
                  event(
                    logExit.level ?? defaultEventLevel,
                    `Exiting ${fmtTarget}`,
                    fields,
                  );
                }
              }
              guard.exit();
              return returnValue;
            });
        }

        // Handle sync success
        // TODO: Tidy up duplicate code
        if (logExit) {
          const fields = logReturnValue && {
            returnValue: logReturnValue.map
              ? logReturnValue.map(returnValue, args)
              : returnValue,
          };
          if (
            "message" in logExit && typeof logExit.message !== "undefined"
          ) {
            const message = typeof logExit.message === "function"
              ? logExit.message(args)
              : logExit.message;
            event(logExit.level ?? Level.ERROR, message, fields);
          } else {
            event(
              logExit.level ?? defaultEventLevel,
              `Exiting ${fmtTarget}`,
              fields,
            );
          }
        }
        guard.exit();
        return returnValue;
      } catch (error) {
        // Handle sync errors
        if (logError) {
          if (
            "message" in logError &&
            typeof logError.message !== "undefined"
          ) {
            const message = typeof logError.message === "function"
              ? logError.message(args)
              : logError.message;
            event(logError.level ?? Level.ERROR, message);
          } else {
            event(logError.level ?? Level.ERROR, `Error in ${fmtTarget}`, {
              error,
            });
          }
        }
        guard.exit();
        throw error;
      }
    });
  } as TCallback;
}
