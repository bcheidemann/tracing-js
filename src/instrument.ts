/**
 * @module
 * This module provides functions for instrumenting methods and functions.
 */

import {
  type ParamNode,
  paramNodeToParamName,
  parseParamNodesFromFunction,
} from "@bcheidemann/parse-params";
import { context, getSubscriberContext } from "./context.ts";
import { event } from "./event.ts";
import { Level } from "./level.ts";
import { span } from "./span.ts";

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
  Redact: 11 as const,
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

// TODO: Support array methods
type RedactProxy = {
  [key: string | number | symbol]: RedactProxy;
} & Record<typeof REDACT_PROXY_PATH_SYMBOL, (string | symbol)[]>;
type RedactAttribute = {
  kind: AttributeKind["Redact"];
  param: string | number;
  redact?: (param: RedactProxy) => RedactProxy | RedactProxy[];
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
  | LogAttribute
  | RedactAttribute;

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
 * @param className The class name to use for the target field
 * @param method The method name to use for the target field
 * @returns The target attribute
 */
export function target(className: string, method: string): TargetAttribute;
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
 * @param functionName The function name to use for the target field
 * @returns The target attribute
 */
export function target(functionName: string): TargetAttribute;
export function target(
  classOrFunctionName: string,
  method?: string,
): TargetAttribute {
  if (method !== undefined) {
    return {
      kind: AttributeKind.Target,
      class: classOrFunctionName,
      method,
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
 *
 * @returns The logEnter attribute
 */
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(): LogEnterAttribute<TArgs>;
/**
 * The logEnter attribute is used to log a message when entering the instrumented method or function.
 *
 * The logEnter attribute supports the following syntax:
 *
 * - `logEnter()`: Log the default message when entering with the default log level
 * - `logEnter("Custom message")`: Log a custom message when entering with the default log level
 * - `logEnter((args) => arg[0])`: Log a custom message mapped from arguments when entering with the default log level
 * - `logEnter(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logEnter(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logEnter(Level.TRACE, (args) => arg[0])`: Log a custom message mapped from arguments when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter("my message"))
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
 *   [logEnter("my message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message The message to log when entering
 * @returns The logEnter attribute
 */
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  message: string,
): LogEnterAttribute<TArgs>;
/**
 * The logEnter attribute is used to log a message when entering the instrumented method or function.
 *
 * The logEnter attribute supports the following syntax:
 *
 * - `logEnter()`: Log the default message when entering with the default log level
 * - `logEnter("Custom message")`: Log a custom message when entering with the default log level
 * - `logEnter((args) => arg[0])`: Log a custom message mapped from arguments when entering with the default log level
 * - `logEnter(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logEnter(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logEnter(Level.TRACE, (args) => arg[0])`: Log a custom message mapped from arguments when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter((args) => `entering with ${args.length} args`))
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
 *   [logEnter((args) => `entering with ${args.length} args`)],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message Callback to map function arguments to the message to log when entering the function
 * @returns The logEnter attribute
 */
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  message: (args: TArgs) => string,
): LogEnterAttribute<TArgs>;
/**
 * The logEnter attribute is used to log a message when entering the instrumented method or function.
 *
 * The logEnter attribute supports the following syntax:
 *
 * - `logEnter()`: Log the default message when entering with the default log level
 * - `logEnter("Custom message")`: Log a custom message when entering with the default log level
 * - `logEnter((args) => arg[0])`: Log a custom message mapped from arguments when entering with the default log level
 * - `logEnter(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logEnter(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logEnter(Level.TRACE, (args) => arg[0])`: Log a custom message mapped from arguments when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter(Level.TRACE))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logEnter, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logEnter(Level.TRACE)],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @returns The logEnter attribute
 */
// deno-lint-ignore no-explicit-any
export function logEnter<TArgs extends any[]>(
  level: Level,
): LogEnterAttribute<TArgs>;
/**
 * The logEnter attribute is used to log a message when entering the instrumented method or function.
 *
 * The logEnter attribute supports the following syntax:
 *
 * - `logEnter()`: Log the default message when entering with the default log level
 * - `logEnter("Custom message")`: Log a custom message when entering with the default log level
 * - `logEnter((args) => arg[0])`: Log a custom message mapped from arguments when entering with the default log level
 * - `logEnter(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logEnter(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logEnter(Level.TRACE, (args) => arg[0])`: Log a custom message mapped from arguments when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logEnter, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logEnter(Level.TRACE, "my message"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logEnter, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logEnter(Level.TRACE, "my message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @param message The message to log when entering
 * @returns The logEnter attribute
 */
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
    // deno-coverage-ignore-start
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new Error(
        `Invalid type for logEnter attribute value. Received "${typeof levelOrMessage}" but expected: "string | number | function | undefined"`,
      );
      // deno-coverage-ignore-stop
  }
}

/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logExit(Level.TRACE, (args) => args[0])`: Log a custom message mapped from args when entering with a custom log level
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
 *
 * @returns The logExit attribute
 */
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(): LogExitAttribute<TArgs>;
/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logExit(Level.TRACE, (args) => args[0])`: Log a custom message mapped from args when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logExit } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit("my message"))
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
 *   [logExit("my message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message The message to log when exiting
 * @returns The logExit attribute
 */
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  message: string,
): LogExitAttribute<TArgs>;
/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logExit(Level.TRACE, (args) => args[0])`: Log a custom message mapped from args when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logExit } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit((args) => args[0]))
 *   test(arg0: string) {
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
 *   [logExit((args) => args[0])],
 *   function test(arg0: string) {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message Callback to map function arguments to the message to log when exiting the function
 * @returns The logExit attribute
 */
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  message: (args: TArgs) => string,
): LogExitAttribute<TArgs>;
/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logExit(Level.TRACE, (args) => args[0])`: Log a custom message mapped from args when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logExit, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit(Level.TRACE))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logExit, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logExit(Level.TRACE)],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @returns The logExit attribute
 */
// deno-lint-ignore no-explicit-any
export function logExit<TArgs extends any[]>(
  level: Level,
): LogExitAttribute<TArgs>;
/**
 * The logExit attribute is used to log a message when exiting the instrumented method or function.
 *
 * The logExit attribute supports the following syntax:
 *
 * - `logExit()`: Log the default message when entering with the default log level
 * - `logExit("Custom message")`: Log a custom message when entering with the default log level
 * - `logExit((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logExit(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logExit(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logExit(Level.TRACE, (args) => args[0])`: Log a custom message mapped from args when entering with a custom log level
 *
 * The default log level is `Level.INFO`, unless the `log` attribute is provided with a different log level.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logExit, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logExit(Level.TRACE, "my message"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logExit, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logExit(Level.TRACE, "my message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @param message The message to log when exiting
 * @returns The logExit attribute
 */
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
    // deno-coverage-ignore-start
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new Error(
        `Invalid type for logExit attribute value. Received "${typeof levelOrMessage}" but expected "string | number | function | undefined".`,
      );
      // deno-coverage-ignore-stop
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
 * @example Instrument a method and log the return value when exiting
 * ```ts
 * import { instrument, logReturnValue } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logReturnValue())
 *   test() {
 *     return "test";
 *   }
 * }
 * ```
 *
 * @example Instrument a method and log the mappped return value when exiting
 * ```ts
 * import { instrument, logReturnValue } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logReturnValue((returnValue, args) => returnValue.toUpperCase())
 *   test() {
 *     return "test";
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log the return value when exiting
 * ```ts
 * import { instrumentCallback, logReturnValue } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logReturnValue()],
 *   function test() {
 *     return "test";
 *   }
 * );
 * ```
 *
 * @example Instrument a function and log the mapped return value when exiting
 * ```ts
 * import { instrumentCallback, logReturnValue } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logReturnValue((returnValue, args) => returnValue.toUpperCase()],
 *   function test() {
 *     return "test";
 *   }
 * );
 * ```
 *
 * @param map The function to map the return value to a custom value
 * @returns The logReturnValue attribute
 */
// deno-lint-ignore no-explicit-any
export function logReturnValue<TArgs extends any[], TReturn>(
  map?: LogReturnValueAttribute<TArgs, TReturn>["map"],
): LogReturnValueAttribute<TArgs, TReturn> {
  return { kind: AttributeKind.LogReturnValue, map };
}

/**
 * The logError attribute is used to log a message when the instrumented method or function throws an error.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logError(Level.TRACE, (args) => args[0])`: Log a custom message mapped from return value and args when entering with a custom log level
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
 *
 * @returns The logError attribute
 */
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(): LogErrorAttribute<TArgs>;
/**
 * The logError attribute is used to log a message when the instrumented method or function throws an error.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logError(Level.TRACE, (args) => args[0])`: Log a custom message mapped from return value and args when entering with a custom log level
 *
 * The default log level is `Level.ERROR`.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logError } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError("my message"))
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
 *   [logError("my message")],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message The message to log on error
 * @returns The logError attribute
 */
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  message: string,
): LogErrorAttribute<TArgs>;
/**
 * The logError attribute is used to log a message when the instrumented method or function throws an error.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logError(Level.TRACE, (args) => args[0])`: Log a custom message mapped from return value and args when entering with a custom log level
 *
 * The default log level is `Level.ERROR`.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logError } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError((args) => args[0]))
 *   test(arg0: string) {
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
 *   [logError((args) => args[0])],
 *   function test(arg0: string) {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param message Callback to map function arguments to the message to log on error
 * @returns The logError attribute
 */
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  message: (args: TArgs) => string,
): LogErrorAttribute<TArgs>;
/**
 * The logError attribute is used to log a message when the instrumented method or function throws an error.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logError(Level.TRACE, (args) => args[0])`: Log a custom message mapped from return value and args when entering with a custom log level
 *
 * The default log level is `Level.ERROR`.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logError, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError(Level.CRITICAL))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logError, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logError(Level.CRITICAL)],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @returns The logError attribute
 */
// deno-lint-ignore no-explicit-any
export function logError<TArgs extends any[]>(
  level: Level,
): LogErrorAttribute<TArgs>;
/**
 * The logError attribute is used to log a message when the instrumented method or function throws an error.
 *
 * The logError attribute supports the following syntax:
 *
 * - `logError()`: Log the default message when entering with the default log level
 * - `logError("Custom message")`: Log a custom message when entering with the default log level
 * - `logError((args) => args[0])`: Log a custom message mapped from args when entering with the default log level
 * - `logError(Level.TRACE)`: Log the default message when entering with a custom log level
 * - `logError(Level.TRACE, "Custom message")`: Log a custom message when entering with a custom log level
 * - `logError(Level.TRACE, (args) => args[0])`: Log a custom message mapped from return value and args when entering with a custom log level
 *
 * The default log level is `Level.ERROR`.
 *
 * @example Instrument a method and log a message when entering
 * ```ts
 * import { instrument, logErrorm, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(logError(Level.CRITICAL, "my message"))
 *   test() {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a function and log a message when entering
 * ```ts
 * import { instrumentCallback, logError, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [logError(logError(Level.CRITICAL, "my message"))],
 *   function test() {
 *     // ...
 *   }
 * );
 * ```
 *
 * @param level The log level to use when logging the message
 * @param message The message to log on error
 * @returns The logError attribute
 */
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
    // deno-coverage-ignore-start
    // deno-lint-ignore no-case-declarations
    default:
      const _: never = levelOrMessage;
      throw new Error(
        `Invalid type for logError attribute value. Received "${typeof levelOrMessage}" but expected "string | number | function | undefined".`,
      );
      // deno-coverage-ignore-stop
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
 * @example Instrument a method and log a message when entering, exiting, or when an error occurs (with level)
 * ```ts
 * import { instrument, log, Level } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(log(Level.TRACE))
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
 *
 * @example Instrument a function and log a message when entering, exiting, or when an error occurs (with level)
 * ```ts
 * import { instrumentCallback, log, Level } from "@bcheidemann/tracing";
 *
 * const test = instrumentCallback(
 *   [log(Level.TRACE)],
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
 * The redact attribute is used to redact all or part of a parameter. It acts similarly to the skip attribute, but the
 * parameter (or field) is replaced with the string "[REDACTED]" in the logs.
 *
 * @example Instrument a method and redact a sensitive field
 * ```ts
 * import { instrument, redact } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(redact("credentials", credentials => credentials.password))
 *   login(credentials) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a method and redact multiple sensitive fields
 * ```ts
 * import { instrument, redact } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(redact(
 *     "credentials",
 *     credentials => [credentials.email, credentials.password],
 *   ))
 *   login(credentials) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example Instrument a method and redact a parameter
 * ```ts
 * import { instrument, redact } from "@bcheidemann/tracing";
 *
 * class Example {
 *   @instrument(redact("credentials"))
 *   login(credentials) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @param param The parameter name or index to skip.
 * @param redact Used to specify one or more fields to redact. If omitted, the whole parameter will be redacted.
 */
export function redact(
  param: string | number,
  redact?: (param: RedactProxy) => RedactProxy | RedactProxy[],
): RedactAttribute {
  return { kind: AttributeKind.Redact, param, redact };
}

const REDACT_PROXY_PATH_SYMBOL = Symbol.for("tracing:redactProxyPath");
const REDACT_PROXY_TARGET = {} as RedactProxy;
function createRedactProxy(
  path: (string | number | symbol)[] = [],
): RedactProxy {
  return new Proxy<RedactProxy>(REDACT_PROXY_TARGET, {
    apply() {
      throw new Error("Cannot apply RedactProxy");
    },
    construct() {
      throw new Error("Cannot construct RedactProxy");
    },
    defineProperty() {
      throw new Error("Cannot define property on RedactProxy");
    },
    deleteProperty() {
      throw new Error("Cannot delete property on RedactProxy");
    },
    get(_, key) {
      if (key === REDACT_PROXY_PATH_SYMBOL) {
        return path;
      }
      return createRedactProxy([...path, key]);
    },
    getOwnPropertyDescriptor() {
      throw new Error(
        "Cannot call Object.getOwnPropertyDescriptor on RedactProxy",
      );
    },
    getPrototypeOf() {
      throw new Error("Cannot get prototype of RedactProxy");
    },
    has() {
      throw new Error(
        "Cannot use 'in' operator on RedactProxy (properties should be accessed unconditionally)",
      );
    },
    isExtensible() {
      throw new Error("Cannot call Object.isExtensible on RedactProxy");
    },
    ownKeys() {
      throw new Error("Cannot call Reflect.ownKeys on RedactProxy");
    },
    preventExtensions() {
      throw new Error("Cannot call Object.preventExtensions on RedactProxy");
    },
    set() {
      throw new Error("Cannot set property on RedactProxy");
    },
    setPrototypeOf() {
      throw new Error("Cannot call Object.setPrototypeOf on RedactProxy");
    },
  });
}
const REDACT_PROXY: RedactProxy = createRedactProxy();

interface InstrumentDecorator<TMethod extends AnyFunction> {
  (
    target: TMethod,
    context: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
  ): TMethod;
  (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<TMethod>,
  ): TypedPropertyDescriptor<TMethod>;
}

/**
 * The instrument decorator is used to instrument a class method. This will create a span when the method
 * is entered. By default, the span message will be the name of the method, and the arguments will be included
 * in the fields. This behaviour can be customised using attributes.
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
  function instrumentDecorator(
    targetOrClass: unknown,
    ctxOrPropertyKey:
      | ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>
      | (string | symbol),
    descriptor?: TypedPropertyDescriptor<TMethod>,
  ) {
    // ES Decorator
    if (typeof ctxOrPropertyKey === "object") {
      const ctx = ctxOrPropertyKey;
      return instrumentCallbackImpl(targetOrClass as TMethod, attributes, {
        kind: "method",
        methodName: typeof ctx.name === "symbol"
          ? ctx.name.toString()
          : ctx.name,
      });
    } // Legacy Decorator
    else {
      const propertyKey = ctxOrPropertyKey;
      const target = descriptor!.value;
      const methodName = typeof propertyKey === "symbol"
        ? propertyKey.toString()
        : propertyKey;

      if (!target) {
        throw new Error(`Failed to decorate method: ${methodName}`);
      }

      descriptor!.value = instrumentCallbackImpl(target, attributes, {
        kind: "method",
        methodName,
      });

      return descriptor!;
    }
  }

  return instrumentDecorator as InstrumentDecorator<TMethod>;
}

/**
 * The instrumentCallback function is used to instrument a function. This will create a span when the function
 * is entered. By default, the span message will be the name of the function, and the arguments will be included
 * in the fields. This behaviour can be customised using attributes.
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
export function instrumentCallback<TCallback extends AnyFunction>(
  fn: TCallback,
): TCallback;
/**
 * The instrumentCallback function is used to instrument a function. This will create a span when the function
 * is entered. By default, the span message will be the name of the function, and the arguments will be included
 * in the fields. This behaviour can be customised using attributes.
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
 * @param attributes The attributes to apply to the instrumented function
 * @param fn The function to instrument
 * @returns The instrumented function
 */
export function instrumentCallback<TCallback extends AnyFunction>(
  attributes: Attributes<Parameters<TCallback>, ReturnType<TCallback>>[],
  fn: TCallback,
): TCallback;
export function instrumentCallback<TCallback extends AnyFunction>(
  attributesOrFn:
    | TCallback
    | Attributes<Parameters<TCallback>, ReturnType<TCallback>>[],
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
  [AttributeKind.Redact]: RedactAttribute[];
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
    [AttributeKind.Redact]: [],
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
      case AttributeKind.Redact:
        attributesByKind[AttributeKind.Redact].push(attribute);
        break;
      // deno-coverage-ignore-start
      // deno-lint-ignore no-case-declarations
      default:
        const _: never = attribute;
        throw new Error(
          `Invalid attribute kind. Received "${
            // deno-lint-ignore no-explicit-any
            (attribute as any).kind}" but expected "${
            Object.keys(AttributeKind).join(" | ")
          }".`,
        );
        // deno-coverage-ignore-stop
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
    methodName: string;
  };

type ParamNodeWithMeta = ParamNode & { paramName: string; index: number };
// deno-lint-ignore ban-types
const ParsedFunctionParams = new WeakMap<Function, ParamNodeWithMeta[]>();

// deno-lint-ignore no-explicit-any
function getParsedParamsForFunction(fn: (...args: any[]) => any) {
  const parsedParams = ParsedFunctionParams.get(fn);
  if (parsedParams) {
    return parsedParams;
  }
  const params = parseParamNodesFromFunction(fn).map(
    (param, index): ParamNodeWithMeta => ({
      ...param,
      paramName: paramNodeToParamName(param, {
        returnIdentifierForParamAssignmentExpressions: true,
      }),
      index,
    }),
  );
  ParsedFunctionParams.set(fn, params);
  return params;
}

function instrumentCallbackImpl<TCallback extends AnyFunction>(
  fn: TCallback,
  attributes: Attributes<Parameters<TCallback>, ReturnType<TCallback>>[],
  instrumentCtx: Context,
): TCallback {
  return function instrumentedCallback(
    this: ThisParameterType<TCallback>,
    ...args: Parameters<TCallback>
  ) {
    const ctx = getSubscriberContext()?.clone();

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
          return undefined;
        }
        for (const skipAttribute of attributesByKind[AttributeKind.Skip]) {
          skipAttribute.skip.forEach((skip, index) => {
            switch (typeof skip) {
              case "string": {
                const parsedParams = getParsedParamsForFunction(fn);
                const paramToSkip = parsedParams.find(
                  (param) => param.paramName === skip,
                );
                if (!paramToSkip) {
                  break;
                }
                const isLast = paramToSkip.index === parsedParams.length - 1;
                if (isLast && paramToSkip.type === "RestElement") {
                  for (
                    let index = parsedParams.length - 1;
                    index < args.length;
                    index += 1
                  ) {
                    delete logArgs[index];
                  }
                } else {
                  delete logArgs[paramToSkip.index];
                }
                break;
              }
              case "number":
                delete logArgs[skip];
                break;
              case "boolean":
                if (skip) {
                  delete logArgs[index];
                }
                break;
              default:
                throw new Error(
                  `Invalid type for skip attribute value. Received "${typeof skip}" but expected "string | number | boolean".`,
                );
            }
          });
        }
        for (const redactAttribute of attributesByKind[AttributeKind.Redact]) {
          // TODO: Implement redact attribute
          switch (typeof redactAttribute.param) {
            case "string": {
              const parsedParams = getParsedParamsForFunction(fn);
              const paramToRedact = parsedParams.find(
                (param) => param.paramName === redactAttribute.param,
              );
              if (!paramToRedact) {
                break;
              }
              const isLast = paramToRedact.index === parsedParams.length - 1;
              if (isLast && paramToRedact.type === "RestElement") {
                for (
                  let index = parsedParams.length - 1;
                  index < args.length;
                  index += 1
                ) {
                  redactArg(logArgs, index, redactAttribute);
                }
              } else {
                redactArg(logArgs, paramToRedact.index, redactAttribute);
              }
              break;
            }
            case "number":
              redactArg(logArgs, redactAttribute.param, redactAttribute);
              break;
            default:
              throw new Error(
                `Invalid type for redact attribute value. Received "${typeof redactAttribute
                  .param}" but expected "string | number".`,
              );
          }
        }
        return Object.keys(logArgs).length === 0 ? undefined : logArgs;
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
      if (logArgs) {
        fields.args = logArgs;
      }
      const guard = span(spanLevel, message, fields).enter();
      try {
        if (logEnter) {
          if (
            "message" in logEnter &&
            typeof logEnter.message !== "undefined"
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
              if (logExit || logReturnValue) {
                const fields = logReturnValue && {
                  returnValue: logReturnValue.map
                    ? logReturnValue.map(returnValue, args)
                    : returnValue,
                };
                if (
                  logExit && "message" in logExit &&
                  typeof logExit.message !== "undefined"
                ) {
                  const message = typeof logExit.message === "function"
                    ? logExit.message(args)
                    : logExit.message;
                  event(logExit.level ?? Level.ERROR, message, fields);
                } else {
                  event(
                    logExit?.level ?? defaultEventLevel,
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
        if (logExit || logReturnValue) {
          const fields = logReturnValue && {
            returnValue: logReturnValue.map
              ? logReturnValue.map(returnValue, args)
              : returnValue,
          };
          if (logExit && "message" in logExit && typeof logExit.message !== "undefined") {
            const message = typeof logExit.message === "function"
              ? logExit.message(args)
              : logExit.message;
            event(logExit.level ?? Level.ERROR, message, fields);
          } else {
            event(
              logExit?.level ?? defaultEventLevel,
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

function redactArg(
  args: Record<number, unknown>,
  idx: number,
  redactAttribute: RedactAttribute,
) {
  if (!redactAttribute.redact) {
    args[idx] = "[REDACTED]";
    return;
  }

  const redactedPaths = (() => {
    const maybeArray = redactAttribute.redact(REDACT_PROXY);
    return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
  })().map((redacted) => redacted[REDACT_PROXY_PATH_SYMBOL]);

  if (redactedPaths.some((path) => path.length === 0)) {
    args[idx] = "[REDACTED]";
    return;
  }

  args[idx] = structuredClone(args[idx]);

  nextPath: for (const redactPath of redactedPaths) {
    const lastKey = redactPath.pop()!;
    let current = args[idx];

    if (!isNotNullObject(current)) {
      continue nextPath;
    }

    for (const key of redactPath) {
      current = current[key];

      if (!isNotNullObject(current)) {
        continue nextPath;
      }
    }

    current[lastKey] = "[REDACTED]";
  }
}

function isNotNullObject(
  maybeObj: unknown,
): maybeObj is Record<string | symbol, unknown> {
  return typeof maybeObj === "object" && maybeObj !== null;
}
