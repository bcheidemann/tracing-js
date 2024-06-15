# TracingJS

## Overview

`@bcheidemann/tracing` is a framework for collecting event based tracing, logging, and diagnostic information from JavaScript applications at runtime.

## Motivation

Implementing good logging is hard - especially in asynchronous applications! To get a view of what happened during a particular asynchronous task (e.g. an API request) we often need to pass around contextual information, such as request IDs, so that we can reconcile all of the logs for that task after the fact. Doing this properly is a lot of work, and can add excessive boilerplate to your application.

## Prior Art

This package was heavily inspired by the [`tracing` crate](https://crates.io/crates/tracing) in the Rust ecosystem.

## Core Concepts

### Spans

Spans represent a discrete unit of work. For example, in a web server, they may be used to represent the lifetime of a request. Spans can be entered and exited. When an event is logged, the context of any entered spans will be included with the event automatically.

### Events

Unlike spans, which represent a period of time during the execution of the program, events represent a single point of time. When an event is logged, any subscribers will be notified of the event, and all spans which are entered at that point it time.

### Subscribers

Subscribers are responsible for handling events. Typically, these are used for logging.

### Levels

Spans and events both have levels. Levels are used by subscribers to decide whether or not they are interested in a particular span or event. Note that spans and events are discrete from one another, meaning even if an entered span is below the minimum level for a subscriber, the subscriber is still notified of events which happen during that span if they are above the minimum level.

## Usage

### Recording Spans

Spans can be created and entered like this:

```ts
const guard = span(Level.INFO, "an example span").enter();
```

Note the guard being returned. This allows us to exit the span, either implicitly or explicitly.

To explicitly exit the span, you can simply call `guard.exit()`. However, if you are using TypeScript, with a bundler which supports [TC39 `using` declarations](https://github.com/tc39/proposal-explicit-resource-management), then you can automatically exit the span at the end of the scope.

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

Additional context can be recorded against a span using span fields. These fields will be made available to subscribers when an event is emitted, along with the spans message and level.

```ts
span(Level.INFO, "info span with fields", {
  key: 'value',
});
```

This can be used to capture arbitrary context about the span, for example, a web server may use this to capture the request ID.

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

Additional context can be recorded against an event using event fields. These fields will be made available to subscribers when the event is emitted, along with the events message and level.

```ts
event(Level.INFO, "info event with fields", {
  key: 'value',
});
```

### Instrumenting Methods

When using classes, you can instument methods as follows:

```ts
class Application {
  @instrument()
  async example() {
    // Do stuff
  }
}
```

A span is automatically entered when the function is called, and exited when the function ends. Note you must be using TypeScript with a bundler that supports [TC39 decorators](https://github.com/tc39/proposal-decorators).

## Usage Considerations

### Usage in Asynchronous Code

`tracing-js` is designed to be compatible with asynchronous code without requrining any additional configuration. However, there's a couple of pitfalls when working with asynchronous code. Consider the following code:

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

You might expect "Log from inner", to be logged within the "outer" span. However, because the call to `inner` is not awaited, the "outer" span is exited before "Log from inner" is logged. This can be avoided by instrumenting `inner`.

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

When a function instrumented with `instrumentCallback` is entered, the current context and it's subscriber will be cloned, and the function will run in this cloned context. Because cloned subscribers maintain their own span stack, when the `outer` function exits, the "outer" span will not be popped from the span stack in the inner contexts.

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

The above techniques can also be applied to prevent concurrent contexts from interfering with eachother. Consider the following:

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

Because the `first` and `second` function share the same context, "Log from first" may be logged in the "second" span, and visa versa. As before, this problem can be avoided by using `instrumentCallback` or `@instrument` (if working with class methods).

### Unused Spans

Generally, it is recommended not to dynamically create spans which might not be entered. This is because subscribers need to hold onto references to these spans, as they cannot know that the span will not be entered. Therefore, an unentered span cannot be garbage collected until the subscriber itself is collected. If this is performed in a loop, this can lead to memory leaks if the subscriber lives for a long time. Take the following example:

```ts
function leak() {
  span(Level.INFO, "memory leak");
}

function createMemoryLeak() {
  FmtSubscriber.init();
  setInterval(leak, 100);
}
```

In the above code, we initialise a format subscriber in the current asynchronous context, and then set an interval which creates a span every 100ms. Because the subscriber is tied to the asynchronous context of the interval, and because the interval lives for the remained of the life of the program, any unused spans registered on the subscriber cannot be garbage collected until the program exists. Therefore, after calling `createMemoryLeak`, this program will leak memory continually.

One way to ensure that memory leaks are not created is to use instrumented functions. Consider the following modification of the above program:

```ts
function leak() {
  span(Level.INFO, "memory leak");
}

function createMemoryLeak() {
  FmtSubscriber.init();
  setInterval(instrumentCallback(leak), 100);
}
```

This version of the program does not leak because each time the instrumented `leak` function is called, it clones the current context. As long as leak does not create any asynchronous resources which outlive its execution, then the cloned context will eventually be garbage collected after the function exits.

### Performance

If performance is critical to your application, it may be worth avoiding instrumenting functions where it is not neccessary for any of the reasons listed in [Usage in Asynchronous Code](#usage-in-asynchronous-code). This is because an instrumented function or method will always clone the context on entry, even if it is not necessary. Particularly in methods which are called often, this will create a significant amount of garbage which needs to be collected.
