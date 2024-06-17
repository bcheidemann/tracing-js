import { parseParamNamesFromFunction } from "@bcheidemann/parse-params";
import { context, getContext } from "./context.ts";
import { event } from "./event.ts";
import { Level } from "./level.ts";
import { span } from "./span.ts";
import { AssertionError } from "node:assert";

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

type TargetAttribute = {
  kind: AttributeKind["Target"];
} & (
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

type SkipByMask<TArgs extends any[]> = {
  [index in keyof TArgs]: boolean;
};
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

type InstrumentDecorator<TMethod extends (this: any, ...args: any[]) => any> = (
  target: TMethod,
  context: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
) => TMethod;

export function message(message: string): MessageAttribute {
  return { kind: AttributeKind.Message, message };
}

export function target(
  className: string,
  method: string,
  isPrivate?: boolean,
): TargetAttribute;
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

export function level(level: Level): LevelAttribute {
  return { kind: AttributeKind.Level, level };
}

export function skip<TArgs extends any[]>(
  ...mask: SkipByMask<TArgs>
): SkipAttribute<TArgs>;
export function skip(...paramNames: string[]): SkipAttribute<any>;
export function skip(...paramIndices: number[]): SkipAttribute<any>;
export function skip<TArgs extends any[]>(
  ...skip: SkipAttribute<TArgs>["skip"]
): SkipAttribute<TArgs> {
  return { kind: AttributeKind.Skip, skip };
}

export const skipAll: SkipAllAttribute = { kind: AttributeKind.SkipAll };

export const skipThis: SkipThisAttribute = { kind: AttributeKind.SkipThis };

export function field<TArgs extends any[]>(
  name: string,
  mapValue: (args: NoInfer<TArgs>) => unknown,
): FieldAttribute<TArgs>;
export function field<TArgs extends any[], TValue>(
  name: string,
  value: TValue extends (...args: any[]) => any ? never : TValue,
): FieldAttribute<TArgs>;
export function field<TArgs extends any[]>(
  name: string,
  value: unknown | ((...args: TArgs[]) => unknown),
): FieldAttribute<TArgs> {
  return { kind: AttributeKind.Field, name, value };
}

export const logEnter: LogEnterAttribute = { kind: AttributeKind.LogEnter };

export const logExit: LogExitAttribute = { kind: AttributeKind.LogExit };

export const logError: LogErrorAttribute = { kind: AttributeKind.LogError };

export const log: LogAttribute = { kind: AttributeKind.Log };

export function instrument<TMethod extends (this: any, ...args: any[]) => any>(
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

export function instrumentCallback<
  TCallback extends (this: any, ...args: any[]) => any,
>(fn: TCallback): TCallback;
export function instrumentCallback<
  TCallback extends (this: any, ...args: any[]) => any,
>(attributes: Attributes<Parameters<TCallback>>[], fn: TCallback): TCallback;
export function instrumentCallback<
  TCallback extends (this: any, ...args: any[]) => any,
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
      default:
        const _: never = attribute;
        throw new AssertionError({
          message: "Invalid attribute kind",
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

const ParsedFunctionParams = new WeakMap<Function, string[]>();

function instrumentCallbackImpl<
  TCallback extends (this: any, ...args: any[]) => any,
>(
  fn: TCallback,
  attributes: Attributes<Parameters<TCallback>>[],
  instrumentCtx: Context,
): TCallback {
  return function instrumentedCallback(
    this: ThisParameterType<TCallback>,
    ...args: Parameters<TCallback>
  ) {
    const fnName = fn.name || "[unknown function]";
    const defaults: Defaults = {
      [AttributeKind.Message]:
        instrumentCtx.kind === "function"
          ? message(fn.name)
          : message(
              `${this?.constructor?.name ?? "[unknown class]"}.${fnName}`,
            ),
      [AttributeKind.Target]:
        instrumentCtx.kind === "function"
          ? target(fnName)
          : target(
              this?.constructor?.name ?? "[unknown class]",
              instrumentCtx.methodName,
              instrumentCtx.isPrivate,
            ),
      [AttributeKind.Level]: level(Level.INFO),
    };
    const attributesByKind = collectAttributes(attributes, defaults);
    const self = this;
    const ctx = getContext().clone();
    return context.run(ctx, function () {
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
          logArgs["this"] = self;
        }
        for (const skipAttribute of attributesByKind[AttributeKind.Skip]) {
          skipAttribute.skip.forEach((skip, index) => {
            switch (typeof skip) {
              case "string":
                const paramNames =
                  ParsedFunctionParams.get(fn) ??
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
          acc[field.name] =
            typeof field.value === "function" ? field.value(args) : field.value;
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
        const returnValue = fn.apply(self, args);

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
