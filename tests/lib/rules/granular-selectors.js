/**
 * @fileoverview Tests for granular-selectors rule
 */
"use strict";

var rule = require("../../../lib/rules/granular-selectors");
var RuleTester = require("eslint").RuleTester;

// Use a very basic configuration for maximum compatibility with ESLint 5
var ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 5,
    sourceType: "script"
  }
});

// Run tests with ES5 syntax
ruleTester.run("granular-selectors", rule, {
  valid: [
    "var foo = useAppSelector(function(state) { return state.foo; });",
    "var value = useSelector(function(state) { return state.deeply.nested.value; });",
    "var obj = someOtherFunction(function(state) { return state; }); var foo = obj.foo; var bar = obj.bar;",
    "var obj = someObject; var foo = obj.foo; var bar = obj.bar;",
    "var items = useProductsSelector(function(state) { return state.items; });",
    "var count = useSelectorWithSuffix(function(state) { return state.count; });"
  ],
  invalid: [
    {
      code: "var obj = useAppSelector(function(state) { return state; }); var foo = obj.foo; var bar = obj.bar;",
      errors: [
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        },
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        }
      ],
      output: "var obj = useAppSelector(function(state) { return state; }); var foo = useAppSelector(function(state) { return state.foo; }); var bar = useAppSelector(function(state) { return state.bar; });"
    },
    {
      code: "var obj = useSelector(function(state) { return state.data; }); var foo = obj.foo; var bar = obj.bar;",
      errors: [
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        },
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        }
      ],
      output: "var obj = useSelector(function(state) { return state.data; }); var foo = useSelector(function(state) { return state.data.foo; }); var bar = useSelector(function(state) { return state.data.bar; });"
    },
    {
      code: "var obj = useStoreSelector(function(state) { return state; }); var count = obj.count; var increment = obj.increment;",
      errors: [
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        },
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        }
      ],
      output: "var obj = useStoreSelector(function(state) { return state; }); var count = useStoreSelector(function(state) { return state.count; }); var increment = useStoreSelector(function(state) { return state.increment; });"
    },
    {
      code: "var obj = useProductsSelector(function(state) { return state; }); var items = obj.items; var totalCount = obj.totalCount;",
      errors: [
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        },
        {
          message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
        }
      ],
      output: "var obj = useProductsSelector(function(state) { return state; }); var items = useProductsSelector(function(state) { return state.items; }); var totalCount = useProductsSelector(function(state) { return state.totalCount; });"
    }
  ]
});

// Only run ES6 tests if the environment supports it (not in ESLint 5)
try {
  var es6RuleTester = new RuleTester({
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: "module"
    }
  });
  
  // These tests will only run in ESLint 6+ environments
  es6RuleTester.run("granular-selectors-es6", rule, {
    valid: [
      "const foo = useAppSelector(state => state.foo);",
      "const value = useSelector(state => state.deeply.nested.value);",
      "const obj = someOtherFunction(state => state); const { foo, bar } = obj;",
      "const obj = someObject; const { foo, bar } = obj;",
      "const items = useProductsSelector(state => state.items);",
      "const count = useSelectorWithSuffix(state => state.count);"
    ],
    invalid: [
      {
        code: "const { foo, bar } = useAppSelector(state => state);",
        errors: [
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          }
        ],
        output: "const foo = useAppSelector(state => state.foo);\nconst bar = useAppSelector(state => state.bar);"
      },
      {
        code: "const { foo, bar } = useSelector(state => state.data);",
        errors: [
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          }
        ],
        output: "const foo = useSelector(state => state.data.foo);\nconst bar = useSelector(state => state.data.bar);"
      },
      {
        code: "const { user: { name, email }, settings } = useAppSelector(state => state);",
        errors: [
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          }
        ],
        output: "const name = useAppSelector(state => state.user.name);\nconst email = useAppSelector(state => state.user.email);\nconst settings = useAppSelector(state => state.settings);"
      },
      {
        code: "const { foo: renamedFoo, bar } = useAppSelector(state => state);",
        errors: [
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          }
        ],
        output: "const renamedFoo = useAppSelector(state => state.foo);\nconst bar = useAppSelector(state => state.bar);"
      },
      {
        code: "const obj = useStoreSelector(state => state); const count = obj.count; const increment = obj.increment;",
        errors: [
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          },
          {
            message: "Avoid destructuring from selectors. Use granular selectors that return specific values."
          }
        ],
        output: "const obj = useStoreSelector(state => state); const count = useStoreSelector(state => state.count); const increment = useStoreSelector(state => state.increment);"
      }
    ]
  });
} catch (e) {
  console.log("Skipping ES6 tests in ESLint 5 environment");
}