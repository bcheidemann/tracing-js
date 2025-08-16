# Tracing <!-- omit in toc -->

[![JSR](https://jsr.io/badges/@bcheidemann/tracing)](https://jsr.io/@bcheidemann/tracing)
[![JSR Score](https://jsr.io/badges/@bcheidemann/tracing/score)](https://jsr.io/@bcheidemann/tracing)
[![NPM](https://img.shields.io/npm/v/%40tracing-js%2Ftracing)](https://www.npmjs.com/package/@tracing-js/tracing)
![publish workflow](https://github.com/bcheidemann/tracing-js/actions/workflows/publish.yml/badge.svg)
[![codecov](https://codecov.io/gh/bcheidemann/tracing-js/graph/badge.svg?token=3GGM1M48D8)](https://codecov.io/gh/bcheidemann/tracing-js)

<a
  style="height: 16px; padding: 5px 10px; font-size: 12px; line-height: 16px; color: #24292f; background-color: #ebf0f4; border-color: #d0d7de; background-image: linear-gradient(180deg, #f6f8fa, #ebf0f4 90%); border-radius: .25em; position: relative; display: inline-flex; text-decoration: none; outline: 0; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;"
  href="https://github.com/bcheidemann/tracing-js" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-star" data-size="large" aria-label="Star bcheidemann/tracing-js on GitHub">
<svg style="display: inline-block; vertical-align: text-top; fill: currentColor; overflow: visible; margin-right: 8px;" viewBox="0 0 16 16" width="16" height="16" class="octicon octicon-star" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path></svg>
Star us on GitHub!
</a>

## Overview

`@bcheidemann/tracing` is a framework for collecting event based tracing,
logging, and diagnostic information from JavaScript applications at runtime.

## Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Installation](#installation)
  - [Deno](#deno)
  - [Node](#node)
  - [Bun](#bun)
- [Motivation](#motivation)
- [Prior Art](#prior-art)
- [Core Concepts](#core-concepts)
  - [Spans](#spans)
  - [Events](#events)
  - [Subscribers](#subscribers)
  - [Levels](#levels)
- [Usage](#usage)
  - [Examples](#examples)
  - [Recording Spans](#recording-spans)
  - [Recording Fields on Spans](#recording-fields-on-spans)
  - [Recording Subscriber Data on Spans](#recording-subscriber-data-on-spans)
  - [Recording Events](#recording-events)
  - [Instrumenting Methods and Functions](#instrumenting-methods-and-functions)
  - [Subscribers](#subscribers-1)
  - [Accessing the Current Span](#accessing-the-current-span)
- [Usage Considerations](#usage-considerations)
  - [Usage in Asynchronous Code](#usage-in-asynchronous-code)
  - [Delayed Execution](#delayed-execution)
  - [Performance](#performance)
  - [Minifiers](#minifiers)
  - [Bundler Support](#bundler-support)
    - [Vite](#vite)
    - [ESBuild](#esbuild)
    - [SWC](#swc)
  - [Runtime Support](#runtime-support)
  - [ES Decorators vs Legacy Decorators](#es-decorators-vs-legacy-decorators)
- [ESLint Plugin (experimental)](#eslint-plugin-experimental)
- [Contributing](#contributing)
  - [First-Party Contributions](#first-party-contributions)
  - [Contributing Subscribers](#contributing-subscribers)
    - [General Guidance](#general-guidance)
    - [Third-Party Subscribers](#third-party-subscribers)
    - [First-Party Subscribers](#first-party-subscribers)

## Installation

### Deno

```sh
deno add @bcheidemann/tracing
```

### Node

The package is published to [JSR](https://jsr.io/@bcheidemann/tracing), a new
package registry for TypeScript. To install JSR packages for Node, you need to
use the `jsr` CLI. After installing it, it will behave just like any other Node
module.

```sh
# npm
npx jsr add @bcheidemann/tracing
```

```sh
# yarn
yarn dlx jsr add @bcheidemann/tracing
```

```sh
# pnpm
pnpm dlx jsr add @bcheidemann/tracing
```

### Bun

```sh
bunx jsr add @bcheidemann/tracing
```

## Motivation

Implementing good logging is hard - especially in asynchronous applications! To
get a view of what happened during a particular asynchronous task (e.g. an API
request) we often need to pass around contextual information, such as request
IDs, so that we can reconcile all of the logs for that task after the fact.
Doing this properly is a lot of work, and can add excessive boilerplate to your
application.

## Prior Art

This package was heavily inspired by the
[`tracing` crate](https://crates.io/crates/tracing) in the Rust ecosystem.

## Core Concepts

### Spans

Spans represent a discrete unit of work. For example, in a web server, they may
be used to represent the lifetime of a request. Spans can be entered and exited.
When an event is logged, the context of any entered spans will be included with
the event automatically.

### Events

Unlike spans, which represent a period of time during the execution of the
program, events represent a single point of time. When an event is logged, any
subscribers will be notified of the event, and all spans which are entered at
that point it time.

### Subscribers

Subscribers are responsible for handling events. Typically, these are used for
logging.

### Levels

Spans and events both have levels. Levels are used by subscribers to decide
whether or not they are interested in a particular span or event. Note that
spans and events are discrete from one another, meaning even if an entered span
is below the minimum level for a subscriber, the subscriber is still notified of
events which happen during that span if they are above the minimum level.

## Usage

### Examples

You can find usage examples
[here](https://github.com/bcheidemann/tracing-js/tree/main/src/examples).

### Recording Spans

Spans can be created and entered like this:

```ts
const guard = span(Level.INFO, "an example span").enter();
```

Note the guard being returned. This allows us to exit the span, either
implicitly or explicitly.

To explicitly exit the span, you can simply call `guard.exit()`. However, if you
are using TypeScript, with a bundler which supports
[TC39 `using` declarations](https://github.com/tc39/proposal-explicit-resource-management),
then you can automatically exit the span at the end of the scope.

```ts
{
  using guard = span(Level.INFO, "an example span").enter();
  // Do stuff
} // <-- span automatically exits here
```

The following shorthands are available:

```ts
traceSpan("a trace span");
debugSpan("a debug span");
infoSpan("an info span");
warnSpan("a warn span");
errorSpan("an error span");
criticalSpan("a critical span");
```

Additional context can be recorded against a span using span fields. These
fields will be made available to subscribers when an event is emitted, along
with the spans message and level.

```ts
span(Level.INFO, "info span with fields", {
  key: "value",
});
```

This can be used to capture arbitrary context about the span, for example, a web
server may use this to capture the request ID.

### Recording Fields on Spans

It is possible to record fields on spans after they have been created.

```ts
const mySpan = infoSpan("info span without fields");
mySpan.record("key", "value");

// Or...

using mySpan = infoSpan("info span without fields").enter();
mySpan.record("key", "value");
```

### Recording Subscriber Data on Spans

Sometimes, a subscriber might require additional subscriber specific span data.
For exmaple, OpenTelemetry has a concept of
[Span Kind](https://opentelemetry.io/docs/concepts/signals/traces/#span-kind).
Such subscriber specific data can be provided via the `subscriberData` argument:

```ts
using _guard = infoSpan("info span with subscriber data", {}, {
  otel: {
    kind: SpanKind.SERVER,
  },
});
```

Subscriber data is always considered optional, but you should consult the
subscribers documentation to understand when it may be beneficial to provide it.
There is no downside to providing this in libary code, if you want to provide
better support for a specific subscriber, since it will simply be ignored if it
is not relevant to the currently registered subscriber.

For third-party subscribers, you may need to make use of the generic argument to
get type safety on the `subscriberData` argument:

```ts
import type { SubscriberData } from "example-subscriber";

using _guard = infoSpan<SubscriberData>("info span with subscriber data", {}, {
  example: {
    // Data for example subscriber
  },
});
```

### Recording Events

Events can be emitted like this:

```ts
event(Level.INFO, "an example event");
```

The following shorthands are available:

```ts
trace("a trace event");
debug("a debug event");
info("an info event");
warn("a warn event");
error("an error event");
critical("a critical event");
```

Additional context can be recorded against an event using event fields. These
fields will be made available to subscribers when the event is emitted, along
with the events message and level.

```ts
event(Level.INFO, "info event with fields", {
  key: "value",
});
```

### Instrumenting Methods and Functions

When using classes, you can instument methods as follows:

```ts
class Application {
  @instrument()
  async example() {
    // Do stuff
  }
}
```

A span is automatically entered when the function is called, and exited when the
function ends. Note you must be using TypeScript with a bundler that supports
[TC39 decorators](https://github.com/tc39/proposal-decorators).

Similarly, functions can be instrumented like this:

```ts
const example = instumentCallback(
  function example() {
    // Do stuff
  },
);
```

By default, the span message will be the fully qualified name of the method
(`<ClassName>.<methodName>`) or function (`<functionName>`). The span will also
include an `args` field, which will include the runtime values of each argument
passed to the method.

You can customise the instrumentation of the function or method using various
attributes. For example, arguments can be omitted from the automatically created
span as follows:

```ts
class AuthService {
  @instrument(skip("password"))
  login(username: string, password: string) {
    // Do stuff
  }
}
```

Or for instrumented functions:

```ts
const example = instumentCallback(
  [skip("password")]
  function login(username: string, password: string) {
    // Do stuff
  }
);
```

The following attributes can be applied:

| Attribute      | Example                                         | Description                                                                                                                 |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| message        | `message("new message")`                        | Changes the instrumented spans message.                                                                                     |
| target         | `target("functionName")`                        | Changes the instrumented spans target field to the provided function name.                                                  |
|                | `target("ClassName", "methodName")`             | Changes the instrumented spans target field to the provided method name.                                                    |
| level          | `level(Level.TRACE)`                            | Changes the instrumented spans level.                                                                                       |
| skip           | `skip("paramName")`                             | Omits the named parameter from the instrumented spans `args` field.                                                         |
|                | `skip(0)`                                       | Omits the indexed parameter from the instrumented spans `args` field.                                                       |
|                | `skip(true, false)`                             | Applies a positional mask to the parameters to omit from the instrumented spans `args` field.                               |
| skipAll        | `skipAll`                                       | Omits all parameters from the instrumented spans `args` field.                                                              |
| redact         | `redact("paramName")`                           | Replaces the named parameter with "[REDACTED]" in the instrumented spans `args` field.                                      |
|                | `redact(0)`                                     | Replaces the indexed parameter with "[REDACTED]" in the instrumented spans `args` field.                                    |
|                | `redact("param", param => param.field)`         | Replaces a field on the named parameter with "[REDACTED]" in the instrumented spans `args` field.                           |
|                | `redact(0, param => param.field)`               | Replaces a field on the indexed parameter with "[REDACTED]" in the instrumented spans `args` field.                         |
|                | `redact("param", param => [param.a, param.b])`  | Replaces multiple fields on the named parameter with "[REDACTED]" in the instrumented spans `args` field.                   |
|                | `redact(0, param => [param.a, param.b])`        | Replaces multiple fields on the indexed parameter with "[REDACTED]" in the instrumented spans `args` field.                 |
| field          | `field("key", "value")`                         | Adds the specified key and value to the instrumented spans fields.                                                          |
|                | `field("key", func)`                            | Adds the specified field to the instrumented spans fields. The provided func will map the arguments to the field value.     |
| logEnter       | `logEnter()`                                    | Logs an event when the function or method is entered.                                                                       |
|                | `logEnter("message")`                           | Logs an event with the provided message when the function or method is entered.                                             |
|                | `logEnter(args => args[0])`                     | Logs an event with a message produced from args when the function or method is entered.                                     |
|                | `logEnter(Level.TRACE)`                         | Logs an event at the provided level when the function or method is entered.                                                 |
|                | `logEnter(Level.TRACE, "message")`              | Logs an event with the provided message at the provided level when the function or method is entered.                       |
|                | `logEnter(Level.TRACE, args => args[0])`        | Logs an event with a message produced from args at the provided level when the function or method is entered.               |
| logExit        | `logExit()`                                     | Logs an event when the function or method returns. Does not log an event if the function throws an error.                   |
|                | `logExit("message")`                            | Logs an event with the provided message when the function or method returns.                                                |
|                | `logExit(args => args[0])`                      | Logs an event with a message produced from args when the function or method returns.                                        |
|                | `logExit(Level.TRACE)`                          | Logs an event at the provided level when the function or method returns.                                                    |
|                | `logExit(Level.TRACE, "message")`               | Logs an event with the provided message at the provided level when the function or method returns.                          |
|                | `logExit(Level.TRACE, args => args[0])`         | Logs an event with a message produced from args at the provided level when the function or method returns.                  |
| logError       | `logError()`                                    | Logs an event when the function or method throws an error.                                                                  |
|                | `logError("message")`                           | Logs an event with the provided message when the function or method throws an error.                                        |
|                | `logError(args => args[0])`                     | Logs an event with a message produced from args when the function or method throws an error.                                |
|                | `logError(Level.TRACE)`                         | Logs an event at the provided level when the function or method throws an error.                                            |
|                | `logError(Level.TRACE, "message")`              | Logs an event with the provided message at the provided level when the function or method throws an error.                  |
|                | `logError(Level.TRACE, args => args[0])`        | Logs an event with a message produced from args at the provided level when the function or method throws an error.          |
| log            | `log()`                                         | Shorthand for `logEnter`, `logExit`, and `logError`. Logs an event when the function or method is entered, exist or throws. |
|                | `log(Level.TRACE)`                              | Logs an event at the provided level when the function or method is entered or exist. Logs at error level on throw.          |
| logReturnValue | `logReturnValue()`                              | Appends the `returnValue` field to the logged exit event.                                                                   |
|                | `logReturnValue((val, args) => val.toString())` | Appends the mapped `returnValue` field to the logged exit event.                                                            |

### Subscribers

A default global subscriber should be registered when your program starts. This
can be done as follows:

```ts
import { FmtSubscriber } from "@bcheidemann/tracing";

FmtSubscriber.setGlobalDefault();

// Rest of program
```

### Accessing the Current Span

Sometimes, it may be necessary to access the current span when there is no
direct reference to it. For example, when within an instrumented method or
function, no reference to the span is normally available.

In such cases, the current span can be accessed using the `currentSpan`
function.

```ts
class Example {
  @instrument()
  public exampleMethod() {
    currentSpan()?.record("key", "value");
  }
}
```

Note that the `currentSpan` function may return `undefined` if no span is
currently entered.

## Usage Considerations

### Usage in Asynchronous Code

`tracing-js` is designed to be compatible with asynchronous code without
requrining any additional configuration. However, there's a couple of pitfalls
when working with asynchronous code. Consider the following code:

```ts
async function inner() {
  // -- await boundary --
  info("Log from inner");
}

async function outer() {
  using _ = span(Level.INFO, "outer");
  info("Log from outer");
  // Not awaited
  inner();
}
```

You might expect "Log from inner", to be logged within the "outer" span.
However, because the call to `inner` is not awaited, the "outer" span is exited
before "Log from inner" is logged. This can be avoided by instrumenting `inner`.

```ts
async function inner() {
  // -- await boundary --
  info("Log from inner");
}

async function outer() {
  using _ = span(Level.INFO, "outer");
  info("Log from outer");
  // Not awaited
  const instrumentedInner = instrumentCallback(inner);
  instrumentedInner();
}
```

When a function instrumented with `instrumentCallback` is entered, the current
context and it's subscriber will be cloned, and the function will run in this
cloned context. Because cloned subscribers maintain their own span stack, when
the `outer` function exits, the "outer" span will not be popped from the span
stack in the inner contexts.

When working with class methods, the `@instrument` decorator can also be used:

```ts
class {
  @instrument()
  async inner() {
    // -- await boundary --
    info("Log from inner");
  }

  async outer() {
    using _ = span(Level.INFO, "outer");
    info("Log from outer");
    // Not awaited
    this.inner();
  }
}
```

The above techniques can also be applied to prevent concurrent contexts from
interfering with eachother. Consider the following:

```ts
async function first() {
  using _ = span(Level.INFO, "first");
  // -- await boundary --
  info("Log from first");
}

async function second() {
  using _ = span(Level.INFO, "second");
  // -- await boundary --
  info("Log from second");
}

async function outer() {
  await Promise.all([
    first(),
    second(),
  ]);
}
```

Because the `first` and `second` function share the same context, "Log from
first" may be logged in the "second" span, and visa versa. As before, this
problem can be avoided by using `instrumentCallback` or `@instrument` (if
working with class methods).

### Delayed Execution

Sometimes, you will want to delay the execution of some code, while retaining
the relationship to the current entered span. Consider the following example:

```ts
import { instrumentCallback } from "@bcheidemann/tracing";

const delayedFunction = instrumentCallback(
  function delayedFunction() {
    using _ = span(Level.INFO, "delayed");
    // Do something
  },
);

{
  using _ = span(Level.INFO, "outer");
  setTimeout(delayedFunction, 500);
}
```

You might expect that the "delayed" span would be a child of the "outer" span.
However, because the "outer" span exits before `delayedFunction` is invoked, the
"delayed" span will not have a parent span.

Currently, the soluton is to modify the above code as follows:

```ts
import {
  context,
  getSubscriberContextOrThrow,
  instrumentCallback,
} from "@bcheidemann/tracing";

const delayedFunction = instrumentCallback(
  function delayedFunction() {
    using _ = span(Level.INFO, "delayed");
    // Do something
  },
);

{
  using _ = span(Level.INFO, "outer");
  // Clone the current subscriber context to preserve the active span
  const clonedSubscriberCtx = getSubscriberContextOrThrow().clone();
  setTimeout(() => context.run(clonedSubscriberCtx, delayedFunction), 500);
}
```

This is a little verbose, and an API is planned to simplify this process.

### Performance

If performance is critical to your application, it may be worth avoiding
instrumenting functions where it is not neccessary for any of the reasons listed
in [Usage in Asynchronous Code](#usage-in-asynchronous-code). This is because an
instrumented function or method will always clone the context on entry, even if
it is not necessary. Particularly in methods which are called often, this will
create a significant amount of garbage which needs to be collected.

### Minifiers

When using the `skip` attribute when instrumenting functions or methods, be
aware that skipping attributes by name is not supported when using a minifier.
Instead, skip function parameters by index, using the skip by mask
(`skip(true, false)`), or skip by index (`skip(0)`) syntax.

### Bundler Support

Some features `@bcheidemann/tracing` make use of TypeScript features which are
not universally supported. The below table outlines bundler support by feature.

> Last updated: 17th May 2025

| Feature                  | JS (no bundler) | TSC | Vite | ESBuild | SWC |
| ------------------------ | --------------- | --- | ---- | ------- | --- |
| spans                    | ✅              | ✅  | ✅   | ✅      | ✅  |
| events                   | ✅              | ✅  | ✅   | ✅      | ✅  |
| subscribers              | ✅              | ✅  | ✅   | ✅      | ✅  |
| function instrumentation | ✅              | ✅  | ✅   | ✅      | ✅  |
| `using` spans            | 🚧*             | ✅  | ✅   | ✅      | ✅  |
| method instrumentation   | ❌              | ✅  | ✅   | ✅      | ✅  |

\* See https://caniuse.com/mdn-javascript_statements_using

#### Vite

Since method instrumentation requires decorator support, you must ensure that
Vite is configured to enable decorators if you wish to use the `@instrument`
decorator. This can be done by adding the following lines to your Vite config.

```patch
import { defineConfig } from 'vite'

export default defineConfig({
+  esbuild: {
+    target: "es2022"
+  }
})
```

#### ESBuild

Since method instrumentation requires decorator support, you must ensure that
ESBuild is configured to enable decorators if you wish to use the `@instrument`
decorator. This can be done by setting the `--target=es2022` flag.

NOTE: If you're using an older version of ESBuild (before 0.21.3) which doesn't
support TC39 decorators, or your project is already using legacy decorators, you
can use the `@instrument` decorator by enabling the `experimentalDecorators`
option in your TypeScript config.

#### SWC

Since method instrumentation requires decorator support, you must ensure that
SWC is configured to enable decorators if you wish to use the `@instrument`
decorator. Please refer to the
[SWC documentation](https://swc.rs/docs/configuration/compilation#jsctransformdecoratorversion)
for configuration options.

### Runtime Support

`@bcheidemann/tracing` works out of the box with Node, Deno and Bun. It also has
full support for CloudFlare workers, but requires the use of the
[nodejs_compat](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/)
flag.

| Runtime            | Supported | Comment                                                                                                          |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| Node               | ✅        |                                                                                                                  |
| Deno               | ✅        |                                                                                                                  |
| Bun                | ✅        |                                                                                                                  |
| CloudFlare Workers | ✅        | Requires [nodejs_compat](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/) flag. |
| Browser            | ❌        | Requires `AsyncLocalStorage` API                                                                                 |

### ES Decorators vs Legacy Decorators

As of TypeScript v5, support has been added for the stage 3 decorators proposal,
while still maintaining support for the legacy experimental decorators behind
the `experimentalDecorators` option. The instrument decorator is agnostic of the
type of decorator your project uses.

## ESLint Plugin (experimental)

`@bcheidemann/tracing` comes with an ESLint plugin, which helps catch common
issues. See
[`@bcheidemann/tracing-eslint`](https://jsr.io/@bcheidemann/tracing-eslint).

We are also working on a Deno lint plugin, which may replace the ESLint plugin.

## Contributing

### First-Party Contributions

If you're contributing to the library itself, or a first-party subscriber, read
the
[CONTRIBUTING.md](https://github.com/bcheidemann/tracing-js/blob/master/CONTRIBUTING.md)
guide.

If you're contributing (to) a first-party subscriber, also read the the
[Contributing Subscribers](#contributing-subscribers) section.

### Contributing Subscribers

This section provides guidance for developers implementing new subscribers.

#### General Guidance

- Review the code for one of the existing first-party subscribers. Where
  possible, aim to maintain a consistent API.
- If you can, extend the `ManagedSubscriber`. This simplifies the process of
  implementing subscribers, and you're less likely to experience bugs during
  concurrent or asynchronous execution.
- If you cannot extend the `ManagedSubscriber`, you must carefully consider how
  your subscriber will handle concurrency, asynchrony, and delayed execution. Be
  sure to add test cases for these behaviours. It is recommended to review the
  test cases covered by existing subscribers.

#### Third-Party Subscribers

- Implementing subscribers isn't straight forward, due to the need to correctly
  handle concurrency, asynchrony, and delayed execution. Feel free to open some
  issue if you'd like some guidance or feedback.

#### First-Party Subscribers

- Remember to update the `SubscriberData` interface. Even if your subscriber
  doesn't accept any additional span data, you should reserve a key by adding
  `<key>?: never;`. This effectively reserves the key for future use by your
  subscriber, reducing the chance of key collisions with third party
  subscribers.
- If your subscriber utilised additional span data, this must be treated as
  optional. Instrumented libraries may not be aware of your subscriber, so we
  cannot depend on this being present. Furthermore, all options should be
  optional.
