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

### Configuration Options

The rule accepts the following options:

```js
{
  'granular-selectors/granular-selectors': ['error', {
    // Array of patterns to include for selector function detection
    include: ['use.*Selector.*', 'createSelector', 'select.*'],
    
    // Array of patterns to exclude from selector function detection
    exclude: ['useSelectOptions', 'useSelectorRef'],
    
    // Code patterns to ignore (e.g., specific variable names or patterns)
    ignorePatterns: ['.*ForceDestructure.*', '.*IgnoreThis.*']
  }]
}
```

#### include

An array of strings that will be converted to regular expressions to match selector function names. The default is `['use.*Selector.*']`, which matches common patterns like `useSelector`, `useAppSelector`, `useStoreSelector`, etc.

You can customize this to match your specific selector naming conventions:

```js
// Example: Match Redux's createSelector and reselect patterns
{
  'granular-selectors/granular-selectors': ['error', {
    include: [
      'use.*Selector.*',  // React hooks style selectors
      'createSelector',   // Redux/Reselect
      'select.*',         // Custom selectors like selectUserData
      'get.*State'        // Getters like getUserState
    ]
  }]
}
```

#### exclude

An array of strings that will be converted to regular expressions to exclude specific function names from being treated as selectors, even if they match the `include` patterns.

```js
// Example: Exclude specific functions that match the general pattern
{
  'granular-selectors/granular-selectors': ['error', {
    include: ['use.*Selector.*'],
    exclude: [
      'useSelectOptions',     // Not a state selector
      'useSelectorRef',       // Not a state selector
      'useSelectorComponent'  // Not a state selector
    ]
  }]
}
```

#### ignorePatterns

An array of strings that will be converted to regular expressions to ignore specific code patterns. This is useful for ignoring specific variable names or code patterns where you want to allow destructuring from selectors.

```js
// Example: Ignore specific patterns
{
  'granular-selectors/granular-selectors': ['error', {
    ignorePatterns: [
      '.*ForceDestructure.*',  // Ignore variables with ForceDestructure in the name
      '.*IgnoreThis.*',        // Ignore variables with IgnoreThis in the name
      '.*// eslint-disable-line.*'  // Ignore lines with inline disable comments
    ]
  }]
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

// ES6: Destructuring from selector variables
const obj = useSelector(state => state);
const { a } = obj;
const { b } = obj;

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
12. **Handles object literals in selectors**: Correctly processes selectors that return object literals with explicit property mappings

## How It Works

The rule looks for:
1. ES6 destructuring from selector hooks: `const { foo, bar } = useSelector(...)`
2. ES6 destructuring from selector variables: `const obj = useSelector(...); const { a } = obj;`
3. ES5 variable assignments from selector results: `var obj = useSelector(...); var foo = obj.foo;`
4. Destructuring from selectors that return object literals: `const { foo, bar } = useSelector(state => ({ foo: state.a.foo, bar: state.b.bar }))`

When it finds such patterns, it transforms them into individual granular selector calls for each property, preserving your code style (ES5 or ES6) and type annotations. For destructuring patterns with subsequent property accesses, it performs a coordinated transformation that eliminates intermediate variables entirely.

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

### Example 3: ES6 Destructuring from Selector Variables

```js
// Before
const obj = useSelector(state => state);
const { a } = obj;
const { b } = obj;

// After (auto-fixed)
const obj = useSelector(state => state);
const a = useSelector(state => state.a);
const b = useSelector(state => state.b);
```

### Example 3.5: Coordinated Transformation (Destructuring + Property Accesses)

```js
// Before
const {userSubmissions} = useSelector(state => state);
const userEducationLabel = userSubmissions.educationLevelLabel;
const userEducationLevel = userSubmissions.educationLevel;

// After (auto-fixed with coordinated transformation)
const userEducationLabel = useSelector(state => state.userSubmissions.educationLevelLabel);
const userEducationLevel = useSelector(state => state.userSubmissions.educationLevel);
```

### Example 4: ES5 Coordinated Transformation

```js
// Before
var obj = useAppSelector(function(state) { return state; });
var foo = obj.foo;
var bar = obj.bar;

// After (auto-fixed with coordinated transformation)
var foo = useAppSelector(function(state) { return state.foo; });
var bar = useAppSelector(function(state) { return state.bar; });
```

### Example 5: TypeScript with Type Annotations

```ts
// Before
const { count, user } = useAppSelector((state: RootState) => state);

// After (auto-fixed)
const count = useAppSelector((state: RootState) => state.count);
const user = useAppSelector((state: RootState) => state.user);
```

### Example 6: TypeScript with Complex Type Annotations

```ts
// Before
const { items, totalCount } = useProductsSelector((state: Store<ProductState>) => state);

// After (auto-fixed)
const items = useProductsSelector((state: Store<ProductState>) => state.items);
const totalCount = useProductsSelector((state: Store<ProductState>) => state.totalCount);
```

### Example 7: Property aliases and default values

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

### Example 10: Object literals in selectors

```js
// ❌ Bad
const {
  countryCode,
  followProfileError,
  isLoggedIn,
} = useSelector((state) => ({
  countryCode: state.profile.countryCode,
  followProfileError: state.notifications?.err,
  isLoggedIn: state.user.isLoggedIn,
}));

// ✅ Good
const countryCode = useSelector((state) => state.profile.countryCode);
const followProfileError = useSelector((state) => state.notifications?.err);
const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request!

If you think I solved one of your headaches, feel free to [tip me](https://revolut.me/attilanknz) with as much money as you see fit. This is a Revolut payment link that you can use with Apple Pay too. 

You will find the Repo [here](https://github.com/vrsttl/eslint-plugin-granular-selectors).

## Changelog

### Version 1.3.3
- **Fixed coordinated transformation bug**: Fixed issue where ES6 destructuring from selector variables followed by property accesses was not being detected and transformed
- Added coordinated transformation that eliminates intermediate destructuring variables entirely when followed by property accesses
- Enhanced test coverage for coordinated transformation patterns
- Improved auto-fixing logic to prevent duplicate transformations
- Added proper documentation and examples for coordinated transformation pattern

### Version 1.3.1
- **Fixed ESLint 9 compatibility**: Resolved `TypeError: context.getScope is not a function` error
- Added support for ESLint 9.x flat config format while maintaining backwards compatibility
- Updated `context.getScope()` usage to be compatible with ESLint 9+ API changes
- Added `test:eslint9` script for testing with ESLint 9.31.0
- Improved RuleTester configuration to automatically detect and use appropriate config format
- All tests now pass across ESLint 5.16.0 through 9.31.0
- Enhanced TypeScript parser usage to eliminate unused variables

### Version 1.3.0
- Added support for object literals in selectors
- Fixed handling of selectors that return explicit property mappings
- Improved TypeScript support with better handling of optional chaining
- Enhanced configuration options for greater flexibility:
  - Added `include` option for specifying selector patterns to match
  - Added `exclude` option for excluding specific function names from being treated as selectors
  - Added `ignorePatterns` option for ignoring specific code patterns
- Maintained backward compatibility with previous configuration options
- Fixed handling of object literals in selectors with proper parentheses preservation

### Version 1.2.3
- Initial release
- Support for ES5 and ES6+ code styles
- Compatible with ESLint 5 and above
- Support for TypeScript type annotations
- Handling of property aliases and default values
- Support for nested destructuring patterns
- Preservation of fallback logic (|| and ??)
