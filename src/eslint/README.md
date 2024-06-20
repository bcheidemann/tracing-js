# ESLint Plugin Rules

## prefer-explicit-resource-management

### Bad

```ts
{
  const guard = span(Level.INFO, "my span").enter();

  // Do stuff...

  guard.exit();
}
```

### Good

```ts
{
  using _guard = span(Level.INFO, "my span").enter();

  // Do stuff...
} // _guard.exit() automatically called here
```

### Explanation

When manually exiting spans, it is easy to forget to exit spans, which may lead
to unexpected results.

For example:

```ts
function doStuff() {
  const guard = span(Level.INFO, "my span").enter();

  // Do stuff...

  if (someCondition) {
    return; // Span was not exited
  }

  // Do more stuff...

  guard.exit();
}
```

In the above example, if `someCondition` is truthy, the span will remain entered
even after the function has returned.
