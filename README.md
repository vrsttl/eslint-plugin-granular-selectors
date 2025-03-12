# eslint-plugin-granular-selectors

ESLint plugin to enforce granular store selectors for Redux and Zustand.

## Why Use Granular Selectors?

Using granular selectors provides several benefits:

1. **Performance Optimization**: Components only re-render when the specific pieces of state they depend on change
2. **Code Clarity**: Makes dependencies on state explicit and easier to understand
3. **Maintainability**: Easier to refactor state structure without breaking components
4. **Reduced Bugs**: Prevents unnecessary re-renders caused by changes to unrelated parts of state

## Installation

```bash
npm install --save-dev eslint-plugin-granular-selectors
```

## Compatibility

This plugin is compatible with:
- ESLint 5.0.0 and above
- React Redux, Redux Toolkit, Zustand, and other state management libraries that use selector patterns
- Both ES5 and ES6+ codebases (automatically detects and preserves your code style)
- TypeScript codebases (preserves type annotations)

## Usage

Add to your `.eslintrc.js`:

```js
module.exports = {
  plugins: [
    'granular-selectors'
  ],
  rules: {
    'granular-selectors/granular-selectors': 'error'
  }
}
```

Or use the recommended config:

```js
module.exports = {
  extends: [
    'plugin:granular-selectors/recommended'
  ]
}
```

## Rules

### granular-selectors

This rule enforces granular store selectors for Redux and Zustand to improve performance.

#### ❌ Incorrect

```js
// ES6: Destructuring from selector
const { foo, bar } = useAppSelector(state => state);

// ES6: Destructuring from a nested state path
const { name, email } = useSelector(state => state.user);

// ES6: Destructuring with nested objects
const { user: { name, email }, settings } = useAppSelector(state => state);

// ES6: Destructuring with aliases
const { foo: renamedFoo, bar } = useSelector(state => state);

// ES5: Variable assignments from selector result
var obj = useAppSelector(function(state) { return state; });
var foo = obj.foo;
var bar = obj.bar;

// TypeScript: Destructuring with type annotations
const { foo, bar } = useAppSelector((state: RootState) => state);
```

#### ✅ Correct

```js
// ES6: Granular selectors
const foo = useAppSelector(state => state.foo);
const bar = useAppSelector(state => state.bar);

// ES6: Specific nested properties
const value = useSelector(state => state.nested.specific.value);

// ES6: Accessing nested state properly
const name = useSelector(state => state.user.name);
const email = useSelector(state => state.user.email);

// ES5: Granular selectors
var foo = useAppSelector(function(state) { return state.foo; });
var bar = useAppSelector(function(state) { return state.bar; });

// TypeScript: Granular selectors with type annotations
const foo = useAppSelector((state: RootState) => state.foo);
const bar = useAppSelector((state: RootState) => state.bar);
```

## Features

The plugin supports:

1. **Basic Destructuring Detection**: Identifies when you're destructuring from a selector
2. **Nested Destructuring**: Handles complex patterns like `const { user: { name, email } } = useSelector(...)`
3. **Property Aliases**: Supports renaming properties during destructuring
4. **Base Paths**: Works with selectors that already select a subset of state
5. **Auto-fixing**: Automatically converts destructured selectors to granular ones
6. **Flexible Selector Matching**: Works with any function matching the pattern `use*Selector*`
7. **Code Style Preservation**: Automatically detects and preserves ES5 or ES6+ syntax
8. **TypeScript Support**: Preserves type annotations in the generated code
9. **Supports property aliases and default values in destructuring**
10. **Comprehensive test coverage**
11. **Preserves fallback logic (|| and ?? from selectors)**

## How It Works

The rule looks for:
1. ES6 destructuring from selector hooks: `const { foo, bar } = useSelector(...)`
2. ES5 variable assignments from selector results: `var obj = useSelector(...); var foo = obj.foo;`

When it finds such patterns, it suggests replacing them with individual selector calls for each property, preserving your code style (ES5 or ES6) and type annotations.

## Examples

### Example 1: ES6 Destructuring

```js
// Before
const { count, user } = useAppSelector(state => state);

// After (auto-fixed)
const count = useAppSelector(state => state.count);
const user = useAppSelector(state => state.user);
```

### Example 2: ES6 Nested Destructuring

```js
// Before
const { user: { name, email }, settings } = useAppSelector(state => state);

// After (auto-fixed)
const name = useAppSelector(state => state.user.name);
const email = useAppSelector(state => state.user.email);
const settings = useAppSelector(state => state.settings);
```

### Example 3: ES5 Variable Assignments

```js
// Before
var obj = useAppSelector(function(state) { return state; });
var foo = obj.foo;
var bar = obj.bar;

// After (auto-fixed)
var obj = useAppSelector(function(state) { return state; });
var foo = useAppSelector(function(state) { return state.foo; });
var bar = useAppSelector(function(state) { return state.bar; });
```

### Example 4: TypeScript with Type Annotations

```ts
// Before
const { count, user } = useAppSelector((state: RootState) => state);

// After (auto-fixed)
const count = useAppSelector((state: RootState) => state.count);
const user = useAppSelector((state: RootState) => state.user);
```

### Example 5: TypeScript with Complex Type Annotations

```ts
// Before
const { items, totalCount } = useProductsSelector((state: Store<ProductState>) => state);

// After (auto-fixed)
const items = useProductsSelector((state: Store<ProductState>) => state.items);
const totalCount = useProductsSelector((state: Store<ProductState>) => state.totalCount);
```

### Example 6: Property aliases and default values

```js
// ❌ Bad
const { jobs: jobsList = [], totalCount = 0 } = useSelector(state => state.hiringExtensionJobs || {});

// ✅ Good
const jobsList = useSelector(state => state.hiringExtensionJobs.jobs || {}) || [];
const totalCount = useSelector(state => state.hiringExtensionJobs.totalCount || {}) || 0;
```

### Example 7: Fallback logic preservation

```js
// ❌ Bad
const { items, count } = useSelector(state => state.data || {});

// ✅ Good
const items = useSelector(state => state.data.items || {});
const count = useSelector(state => state.data.count || {});
```

### Example 8: Fallback logic preservation with null check

```js
// ❌ Bad
const { name, email } = useSelector(state => state.user ?? null);

// ✅ Good
const name = useSelector(state => state.user.name ?? null);
const email = useSelector(state => state.user.email ?? null);
```

### Example 9: TypeScript support

```ts
// ❌ Bad
const { items, totalCount } = useProductsSelector((state: Store<ProductState>) => state);

// ✅ Good
const items = useProductsSelector((state: Store<ProductState>) => state.items);
const totalCount = useProductsSelector((state: Store<ProductState>) => state.totalCount);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request!

https://github.com/vrsttl/eslint-plugin-granular-selectors
