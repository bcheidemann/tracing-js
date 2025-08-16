import {spyOn } from "jest-mock";

type ConsoleMethod = "debug" | "info" | "log" | "warn" | "error";
// deno-lint-ignore no-explicit-any
type ConsoleMethodFn = (...data: any[]) => void;

export function consoleMock<TMethod extends ConsoleMethod>(
  method: TMethod,
  mock: ConsoleMethodFn = () => {},
) {
  const mockedFn = spyOn(console, method).mockImplementation(mock);

  return {
    mockedFn,
    [Symbol.dispose]() {
      mockedFn.mockReset();
    },
  };
}
