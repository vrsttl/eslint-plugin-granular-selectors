/**
 * @fileoverview ESLint plugin for enforcing granular store selectors
 */
"use strict";

module.exports = {
  rules: {
    "granular-selectors": require("./lib/rules/granular-selectors"),
  },
  configs: {
    recommended: {
      plugins: ["granular-selectors"],
      rules: {
        "granular-selectors/granular-selectors": "error",
      },
    },
  }
};