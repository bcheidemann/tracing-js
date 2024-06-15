import { context, getContext } from "./context.ts";
import { Level } from "./level.ts";
import { span } from "./span.ts";

type MessageAttribute = {
  kind: 0;
  message: string;
};

type TargetAttribute = {
  kind: 1;
} & ({
  class: string;
  method: string;
} | {
  function: string;
});

type LevelAttribute = {
  kind: 2;
  level: Level;
};

type SkipAttribute<TArgs extends any[]> = {
  kind: 3;
  skip: {
    [index in keyof TArgs]: boolean;
  };
};

type SkipAllAttribute = {
  kind: 4;
};

type SkipThisAttribute = {
  kind: 5;
};

type FieldAttribute<TArgs extends any[]> = {
  kind: 6;
  name: string;
  value: unknown | ((args: TArgs[]) => unknown);
};

type Attributes<TArgs extends any[]> =
  | MessageAttribute
  | TargetAttribute
  | LevelAttribute
  | SkipAttribute<TArgs>
  | SkipAllAttribute
  | SkipThisAttribute
  | FieldAttribute<TArgs>;

type InstrumentDecorator<TMethod extends (this: any, ...args: any[]) => any> = (
  target: TMethod,
  context: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
) => TMethod;

export function message(message: string): MessageAttribute {
  return { kind: 0, message };
}

export function target(className: string, method: string): TargetAttribute;
export function target(functionName: string): TargetAttribute;
export function target(classOrFunctionName: string, method?: string): TargetAttribute {
  if (method !== undefined) {
    return { kind: 1, class: classOrFunctionName, method };
  }
  return { kind: 1, function: classOrFunctionName };
}

export function level(level: Level): LevelAttribute {
  return { kind: 2, level };
}

export function skip<TArgs extends any[]>(...skip: SkipAttribute<TArgs>['skip']): SkipAttribute<TArgs> {
  return { kind: 3, skip };
}

export function skipAll(): SkipAllAttribute {
  return { kind: 4 };
}

export function skipThis(): SkipThisAttribute {
  return { kind: 5 };
}

export function field<TArgs extends any[]>(
  name: string,
  value: unknown | ((args: TArgs[]) => unknown),
): FieldAttribute<TArgs> {
  return { kind: 6, name, value };
}

export function instrument<TMethod extends (this: any, ...args: any[]) => any>(
  // TODO: Add support for attributes
  ...attributes: Attributes<Parameters<TMethod>>[]
): InstrumentDecorator<TMethod> {
  return function instrumentDecorator(
    target: TMethod,
    ctx: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
  ) {
    const isPrivate = ctx.private;
    return instrumentCallbackImpl(target, attributes);
  };
}

export function instrumentCallback<TCallback extends (this: any, ...args: any[]) => any>(
  fn: TCallback,
  ...attributes: Attributes<Parameters<TCallback>>[]
): TCallback {
  return instrumentCallbackImpl(fn, attributes);
}

function instrumentCallbackImpl<TCallback extends (this: any, ...args: any[]) => any>(
  fn: TCallback,
  attributes: Attributes<Parameters<TCallback>>[],
): TCallback {
  return function instrumentedCallback(
    this: ThisParameterType<TCallback>,
    ...args: Parameters<TCallback>
  ) {
    const self = this;
    const ctx = getContext().clone();
    return context.run(ctx, function () {
      const guard = span(Level.INFO, "temp").enter();
      try {
        const result = fn.apply(self, args);

        // Handle async error / success
        if (result instanceof Promise) {
          return result.finally(() => {
            guard.exit();
          });
        }

        // Handle sync success
        guard.exit();
        return result;
      }
      catch (err) {
        // Handle sync errors
        guard.exit();
        throw err;
      }
    });
  } as TCallback;
}
