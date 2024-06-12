import { Context, context, getContext } from "./context.ts";
import { Level } from "./level.ts";

type NameAttribute = {
  kind: 0;
  name: string;
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

type SkipAttribute = {
  kind: 3;
  skip: number[];
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
  | NameAttribute
  | TargetAttribute
  | LevelAttribute
  | SkipAttribute
  | SkipAllAttribute
  | SkipThisAttribute
  | FieldAttribute<TArgs>;

type InstrumentDecorator<TMethod extends (this: any, ...args: any[]) => any> = (
  target: TMethod,
  context: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
) => TMethod;

export function name(name: string): NameAttribute {
  return { kind: 0, name };
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

export function skip(...skip: number[]): SkipAttribute {
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
  ...attributes: Attributes<Parameters<TMethod>>[]
): InstrumentDecorator<TMethod> {
  return function instrumentDecorator(
    target: TMethod,
    ctx: ClassMethodDecoratorContext<ThisParameterType<TMethod>, TMethod>,
  ) {
    return function instrumentedMethod(
      this: ThisParameterType<TMethod>,
      ...args: Parameters<TMethod>
    ): ReturnType<TMethod> {
      const self = this;
      const ctx = getContext().clone();
      return context.run(ctx, function () {
        return target.apply(self, args);
      }) 
    };
  } as InstrumentDecorator<TMethod>;
}

export function instrumentCallback<TCallback extends (this: any, ...args: any[]) => any>(
  fn: TCallback,
  ...attributes: Attributes<Parameters<TCallback>>[]
): TCallback {
  return function instrumentedCallback(
    this: ThisParameterType<TCallback>,
    ...args: Parameters<TCallback>
  ) {
    const self = this;
    const ctx = getContext().clone();
    return context.run(ctx, function () {
      return fn.apply(self, args);
    });
  } as TCallback;
}
