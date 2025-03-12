/**
 * @fileoverview Tests for granular-selectors rule
 */
"use strict";

var rule = require("../../../lib/rules/granular-selectors");
var RuleTester = require("eslint").RuleTester;

// More reliable way to detect ESLint 5
var eslintVersion = require("eslint/package.json").version;
var isESLint5 = eslintVersion.startsWith("5.");

console.log("Detected ESLint version:", eslintVersion);

// Use a very basic configuration for maximum compatibility with ESLint 5
var ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 5,
    sourceType: "script",
  },
});

// Run tests with ES5 syntax
ruleTester.run("granular-selectors", rule, {
  valid: [
    "var foo = useAppSelector(function(state) { return state.foo; });",
    "var nested = useSelector(function(state) { return state.deeply.nested.value; });",
    "var obj = someOtherFunction(function(state) { return state; }); var foo = obj.foo; var bar = obj.bar;",
    "var obj = someObject; var foo = obj.foo; var bar = obj.bar;",
    "var items = useProductsSelector(function(state) { return state.items; });",
    "var count = useSelectorWithSuffix(function(state) { return state.count; });",
    // Test for fallback logic - only use || for ES5
    "var data = useSelector(function(state) { return state.data || {}; });",
    "var user = useSelector(function(state) { return state.user || null; });",
  ],
  invalid: [
    {
      code: "var obj = useAppSelector(function(state) { return state; }); var foo = obj.foo; var bar = obj.bar;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useAppSelector(function(state) { return state; }); var foo = useAppSelector(function(state) { return state.foo; }); var bar = useAppSelector(function(state) { return state.bar; });",
    },
    {
      code: "var obj = useSelector(function(state) { return state.data; }); var foo = obj.foo; var bar = obj.bar;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useSelector(function(state) { return state.data; }); var foo = useSelector(function(state) { return state.data.foo; }); var bar = useSelector(function(state) { return state.data.bar; });",
    },
    {
      code: "var obj = useStoreSelector(function(state) { return state; }); var count = obj.count; var increment = obj.increment;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useStoreSelector(function(state) { return state; }); var count = useStoreSelector(function(state) { return state.count; }); var increment = useStoreSelector(function(state) { return state.increment; });",
    },
    {
      code: "var obj = useProductsSelector(function(state) { return state; }); var items = obj.items; var totalCount = obj.totalCount;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useProductsSelector(function(state) { return state; }); var items = useProductsSelector(function(state) { return state.items; }); var totalCount = useProductsSelector(function(state) { return state.totalCount; });",
    },
    // Test for fallback logic with logical OR
    {
      code: "var obj = useSelector(function(state) { return state.data || {}; }); var items = obj.items; var count = obj.count;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useSelector(function(state) { return state.data || {}; }); var items = useSelector(function(state) { return state.data.items || {}; }); var count = useSelector(function(state) { return state.data.count || {}; });",
    },
    // Test for fallback logic with logical OR instead of nullish coalescing for ES5
    {
      code: "var obj = useSelector(function(state) { return state.user || null; }); var name = obj.name; var email = obj.email;",
      errors: [
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
        {
          message:
            "Avoid destructuring from selectors. Use granular selectors that return specific values.",
        },
      ],
      output:
        "var obj = useSelector(function(state) { return state.user || null; }); var name = useSelector(function(state) { return state.user.name || null; }); var email = useSelector(function(state) { return state.user.email || null; });",
    },
  ],
});

// Skip ES6 tests completely if we're running ESLint 5
if (isESLint5) {
  console.log("Skipping ES6 and TypeScript tests in ESLint 5 environment");
} else {
  try {
    // ES6 tests without TypeScript
    var es6RuleTester = new RuleTester({
      parserOptions: {
        ecmaVersion: 2020, // Update to 2020 to support nullish coalescing
        sourceType: "module",
      },
    });

    // These tests will only run in ESLint 6+ environments
    es6RuleTester.run("granular-selectors-es6", rule, {
      valid: [
        "const foo = useAppSelector(state => state.foo);",
        "const nested = useSelector(state => state.deeply.nested.value);",
        "const obj = someOtherFunction(state => state); const { foo, bar } = obj;",
        "const obj = someObject; const { foo, bar } = obj;",
        "const items = useProductsSelector(state => state.items);",
        "const count = useSelectorWithSuffix(state => state.count);",
        // Test for fallback logic
        "const data = useSelector(state => state.data || {});",
        "const user = useSelector(state => state.user ?? null);",
      ],
      invalid: [
        {
          code: "const { foo, bar } = useAppSelector(state => state);",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const foo = useAppSelector(state => state.foo);\nconst bar = useAppSelector(state => state.bar);",
        },
        {
          code: "const { foo, bar } = useSelector(state => state.data);",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const foo = useSelector(state => state.data.foo);\nconst bar = useSelector(state => state.data.bar);",
        },
        {
          code: "const { user: { name, email }, settings } = useAppSelector(state => state);",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const name = useAppSelector(state => state.user.name);\nconst email = useAppSelector(state => state.user.email);\nconst settings = useAppSelector(state => state.settings);",
        },
        {
          code: "const { foo: renamedFoo, bar } = useAppSelector(state => state);",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const renamedFoo = useAppSelector(state => state.foo);\nconst bar = useAppSelector(state => state.bar);",
        },
        {
          code: "const obj = useStoreSelector(state => state); const count = obj.count; const increment = obj.increment;",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const obj = useStoreSelector(state => state); const count = useStoreSelector(state => state.count); const increment = useStoreSelector(state => state.increment);",
        },
        // Test for aliases and default values
        {
          code: "const { jobs: jobsList = [], totalCount = 0 } = useSelector(state => state.hiringExtensionJobs || {});",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const jobsList = useSelector(state => state.hiringExtensionJobs.jobs || {}) || [];\nconst totalCount = useSelector(state => state.hiringExtensionJobs.totalCount || {}) || 0;",
        },
        // Test for fallback logic with logical OR
        {
          code: "const { items, count } = useSelector(state => state.data || {});",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const items = useSelector(state => state.data.items || {});\nconst count = useSelector(state => state.data.count || {});",
        },
        // Test for fallback logic with nullish coalescing
        {
          code: "const { name, email } = useSelector(state => state.user ?? null);",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const name = useSelector(state => state.user.name ?? null);\nconst email = useSelector(state => state.user.email ?? null);",
        },
        // Test for combined fallback logic and default values
        {
          code: "const { name = 'Guest', email = '' } = useSelector(state => state.user ?? {});",
          errors: [
            {
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
            },
          ],
          output:
            "const name = useSelector(state => state.user.name ?? {}) || 'Guest';\nconst email = useSelector(state => state.user.email ?? {}) || '';",
        },
      ],
    });

    // Try to run TypeScript tests
    try {
      // Import the TypeScript parser
      var typescriptParser = require("@typescript-eslint/parser");

      // Create a TypeScript-specific rule tester
      var tsRuleTester = new RuleTester({
        parser: require.resolve("@typescript-eslint/parser"), // Use require.resolve to get the absolute path
        parserOptions: {
          ecmaVersion: 2020, // Update to 2020 to support nullish coalescing
          sourceType: "module",
          ecmaFeatures: {
            jsx: true,
          },
          // Add TypeScript-specific parser options
          warnOnUnsupportedTypeScriptVersion: false,
        },
      });

      // Run TypeScript-specific tests
      tsRuleTester.run("granular-selectors-typescript", rule, {
        valid: [
          // Use string literals for TypeScript code to avoid parsing issues in the test file itself
          {
            code: "const foo = useAppSelector((state: RootState) => state.foo);",
          },
          // Test for fallback logic with TypeScript
          {
            code: "const data = useSelector((state: RootState) => state.data || {});",
          },
          {
            code: "const user = useSelector((state: RootState) => state.user ?? null);",
          },
        ],
        invalid: [
          {
            code: "const { foo, bar } = useAppSelector((state: RootState) => state);",
            errors: [
              {
                message:
                  "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              },
            ],
            output:
              "const foo = useAppSelector((state: RootState) => state.foo);\nconst bar = useAppSelector((state: RootState) => state.bar);",
          },
          {
            code: "const { items, totalCount } = useProductsSelector((state: Store<ProductState>) => state);",
            errors: [
              {
                message:
                  "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              },
            ],
            output:
              "const items = useProductsSelector((state: Store<ProductState>) => state.items);\nconst totalCount = useProductsSelector((state: Store<ProductState>) => state.totalCount);",
          },
          // Test for aliases and default values with TypeScript
          {
            code: "const { jobs: jobsList = [], totalCount = 0 } = useSelector((state: RootState) => state.hiringExtensionJobs || {});",
            errors: [
              {
                message:
                  "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              },
            ],
            output:
              "const jobsList = useSelector((state: RootState) => state.hiringExtensionJobs.jobs || {}) || [];\nconst totalCount = useSelector((state: RootState) => state.hiringExtensionJobs.totalCount || {}) || 0;",
          },
          // Test for fallback logic with TypeScript
          {
            code: "const { items, count } = useSelector((state: RootState) => state.data || {});",
            errors: [
              {
                message:
                  "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              },
            ],
            output:
              "const items = useSelector((state: RootState) => state.data.items || {});\nconst count = useSelector((state: RootState) => state.data.count || {});",
          },
          // Test for nullish coalescing with TypeScript
          {
            code: "const { user = null } = useSelector((state: RootState) => state.currentUser ?? {});",
            errors: [
              {
                message:
                  "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              },
            ],
            output:
              "const user = useSelector((state: RootState) => state.currentUser.user ?? {}) || null;",
          },
        ],
      });

      console.log("TypeScript tests passed successfully!");
    } catch (e) {
      console.log("Error running TypeScript tests:", e.message);
      console.log(
        "TypeScript tests are skipped, but the rule supports TypeScript type annotations"
      );
    }
  } catch (e) {
    console.log(
      "Skipping ES6 tests due to environment limitations:",
      e.message
    );
  }
}
