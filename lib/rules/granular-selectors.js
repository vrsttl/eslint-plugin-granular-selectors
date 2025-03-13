/**
 * @fileoverview Rule to enforce granular store selectors
 */
"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce granular store selectors for Redux and Zustand",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
  },
  create: function (context) {
    function processObjectPattern(objectPattern, selectorInfo, parentPath) {
      parentPath = parentPath || "";
      var selectorName = selectorInfo.selectorName;
      var paramName = selectorInfo.paramName;
      var paramTypeAnnotation = selectorInfo.paramTypeAnnotation || "";
      var hasParentheses = selectorInfo.hasParentheses;
      var basePath = selectorInfo.basePath;
      var objectMap = selectorInfo.objectMap;
      var useES6 = selectorInfo.useES6;
      var fixes = [];
      var properties = objectPattern.properties;

      properties.forEach(function (prop) {
        if (prop.type === "Property") {
          var keyName =
            prop.key.name ||
            (prop.key.value !== undefined ? prop.key.value : "");

          // Build the current path by appending the key name to the parent path
          var currentPath;
          if (parentPath) {
            currentPath = parentPath + "." + keyName;
          } else {
            currentPath = keyName;
          }

          if (prop.value.type === "ObjectPattern") {
            // For nested destructuring like { user: { name, email } }
            // Pass the current path (e.g., "user") as the parent path for nested properties
            var nestedFixes = processObjectPattern(
              prop.value,
              selectorInfo,
              currentPath
            );
            fixes.push.apply(fixes, nestedFixes);
          } else {
            // Handle property aliases and default values
            var alias;
            var defaultValue = "";

            if (prop.value.type === "Identifier") {
              // Simple case: { foo }
              alias = prop.value.name;
            } else if (prop.value.type === "AssignmentPattern") {
              // Default value case: { foo = defaultValue }
              if (prop.value.left.type === "Identifier") {
                alias = prop.value.left.name;
                var sourceCode = getSourceCodeSafely();
                defaultValue = sourceCode.getText(prop.value.right);
              }
            }

            // If we couldn't determine the alias, use the key name
            if (!alias) {
              alias = keyName;
            }

            // Determine the selector expression based on whether we have an object map
            var selectorExpression;
            if (objectMap && objectMap[keyName]) {
              // If we have a mapping for this property in the object map, use it directly
              selectorExpression = objectMap[keyName];
            } else {
              // Otherwise, build the path as before
              // Build the full selector path
              var fullPath;
              if (basePath) {
                // If we have a base path from the selector function
                if (parentPath) {
                  // For nested properties with a base path: state.basePath.parentPath.keyName
                  fullPath = basePath + "." + currentPath;
                } else {
                  // For top-level properties with a base path: state.basePath.keyName
                  fullPath = basePath + "." + keyName;
                }
              } else {
                // No base path from the selector function
                if (parentPath) {
                  // For nested properties without a base path: state.parentPath.keyName
                  fullPath = currentPath;
                } else {
                  // For top-level properties without a base path: state.keyName
                  fullPath = keyName;
                }
              }
              
              selectorExpression = paramName + "." + fullPath;
              
              // Apply fallback logic from the original selector if present
              if (selectorInfo.fallback) {
                selectorExpression =
                  selectorExpression +
                  " " +
                  selectorInfo.fallback.operator +
                  " " +
                  selectorInfo.fallback.value;
              }
            }

            var newSelector;
            if (useES6) {
              // ES6 style with const and arrow function, preserving type annotation
              // Ensure parentheses are included when there's a type annotation
              var paramWithType = paramTypeAnnotation
                ? hasParentheses
                  ? "(" + paramName + paramTypeAnnotation + ")"
                  : paramName + paramTypeAnnotation
                : paramName;

              // For object literals, preserve the original parameter format
              if (objectMap && selectorInfo.originalParamFormat) {
                paramWithType = selectorInfo.originalParamFormat;
              }

              if (defaultValue) {
                // Handle default values by using logical OR after the selector
                newSelector =
                  "const " +
                  alias +
                  " = " +
                  selectorName +
                  "(" +
                  paramWithType +
                  " => " +
                  selectorExpression +
                  ") || " +
                  defaultValue +
                  ";";
              } else {
                newSelector =
                  "const " +
                  alias +
                  " = " +
                  selectorName +
                  "(" +
                  paramWithType +
                  " => " +
                  selectorExpression +
                  ");";
              }
            } else {
              // ES5 style with var and function expression
              // Type annotations aren't valid in ES5, so we don't include them
              
              if (defaultValue) {
                // Handle default values by using logical OR after the selector
                newSelector =
                  "var " +
                  alias +
                  " = " +
                  selectorName +
                  "(function(" +
                  paramName +
                  ") { return " +
                  selectorExpression +
                  "; }) || " +
                  defaultValue +
                  ";";
              } else {
                newSelector =
                  "var " +
                  alias +
                  " = " +
                  selectorName +
                  "(function(" +
                  paramName +
                  ") { return " +
                  selectorExpression +
                  "; });";
              }
            }

            fixes.push({
              type: "declaration",
              text: newSelector,
            });
          }
        }
      });

      return fixes;
    }

    function getSourceCodeSafely() {
      if (typeof context.getSourceCode === "function") {
        return context.getSourceCode();
      }
      return {
        getText: function (node) {
          return context.getSource(node);
        },
      };
    }

    function getParamName(funcNode) {
      if (!funcNode || !funcNode.params || !funcNode.params.length) {
        return null;
      }
      return funcNode.params[0].name;
    }

    // Extract TypeScript type annotation from parameter if present
    function getParamTypeAnnotation(funcNode, sourceCode) {
      if (!funcNode || !funcNode.params || !funcNode.params.length) {
        return "";
      }

      var param = funcNode.params[0];

      // Check for TypeScript type annotation
      if (param.typeAnnotation) {
        return sourceCode.getText(param.typeAnnotation);
      }

      // If no direct type annotation property, try to extract it from the source
      var paramText = sourceCode.getText(param);
      var typeMatch = paramText.match(/^[a-zA-Z0-9_]+(\s*:\s*[^)]+)$/);

      if (typeMatch && typeMatch[1]) {
        return typeMatch[1];
      }

      return "";
    }

    // Check if the function has parentheses around its parameters
    function hasParenthesesAroundParams(funcNode, sourceCode) {
      if (!funcNode || !funcNode.params || !funcNode.params.length) {
        return false;
      }

      // Get the source text of the function
      var funcText = sourceCode.getText(funcNode);

      // Check if the function has parentheses around its parameters
      // Arrow function with parentheses: (param) => ...
      return /^\([^)]*\)\s*=>/.test(funcText);
    }

    // Extract the base path and fallback from a selector function
    function extractSelectorInfo(selectorFn, paramName, sourceCode) {
      if (!selectorFn || !paramName) return { basePath: "", fallback: null, objectMap: null };

      var body = selectorFn.body;
      var result = { basePath: "", fallback: null, objectMap: null };

      // Handle arrow functions with expression bodies: state => state.foo
      if (
        selectorFn.type === "ArrowFunctionExpression" &&
        body.type === "MemberExpression"
      ) {
        var exprText = sourceCode.getText(body);
        result.basePath = exprText.replace(
          new RegExp("^" + paramName + "\\."),
          ""
        );
        return result;
      }

      // Handle arrow functions with expression bodies that are object literals: state => ({ foo: state.a, bar: state.b })
      if (
        selectorFn.type === "ArrowFunctionExpression" &&
        body.type === "ObjectExpression"
      ) {
        var objectMap = {};
        body.properties.forEach(function(prop) {
          if (prop.key && prop.value) {
            var keyName = prop.key.name || (prop.key.value !== undefined ? prop.key.value : "");
            var valuePath = "";
            
            // Handle different types of values
            if (prop.value.type === "MemberExpression") {
              // For simple member expressions like state.profile.name
              valuePath = sourceCode.getText(prop.value);
            } else if (prop.value.type === "LogicalExpression" || prop.value.type === "BinaryExpression") {
              // For expressions with fallbacks like state.notifications?.err
              if (prop.value.left && prop.value.left.type === "MemberExpression") {
                valuePath = sourceCode.getText(prop.value.left);
              }
            } else {
              // For other types, just use the source text
              valuePath = sourceCode.getText(prop.value);
            }
            
            objectMap[keyName] = valuePath;
          }
        });
        
        result.objectMap = objectMap;
        return result;
      }

      // Handle arrow functions with expression bodies that are logical expressions: state => state.foo || {}
      if (
        selectorFn.type === "ArrowFunctionExpression" &&
        (body.type === "LogicalExpression" || body.type === "BinaryExpression")
      ) {
        if (body.left && body.left.type === "MemberExpression") {
          var leftText = sourceCode.getText(body.left);
          result.basePath = leftText.replace(
            new RegExp("^" + paramName + "\\."),
            ""
          );

          // Preserve the fallback (right side of || or ??)
          if (body.operator === "||" || body.operator === "??") {
            result.fallback = {
              operator: body.operator,
              value: sourceCode.getText(body.right),
            };
          }
          return result;
        }
      }

      // Handle arrow functions with block bodies: state => { return state.foo }
      if (
        selectorFn.type === "ArrowFunctionExpression" &&
        body.type === "BlockStatement"
      ) {
        var returnStmt = body.body.find(function (stmt) {
          return stmt.type === "ReturnStatement";
        });
        if (returnStmt && returnStmt.argument) {
          if (returnStmt.argument.type === "MemberExpression") {
            var returnText = sourceCode.getText(returnStmt.argument);
            result.basePath = returnText.replace(
              new RegExp("^" + paramName + "\\."),
              ""
            );
            return result;
          } else if (returnStmt.argument.type === "ObjectExpression") {
            // Handle object literals in return statements: return { foo: state.a, bar: state.b }
            var objectMap = {};
            returnStmt.argument.properties.forEach(function(prop) {
              if (prop.key && prop.value) {
                var keyName = prop.key.name || (prop.key.value !== undefined ? prop.key.value : "");
                var valuePath = "";
                
                // Handle different types of values
                if (prop.value.type === "MemberExpression") {
                  // For simple member expressions like state.profile.name
                  valuePath = sourceCode.getText(prop.value);
                } else if (prop.value.type === "LogicalExpression" || prop.value.type === "BinaryExpression") {
                  // For expressions with fallbacks like state.notifications?.err
                  if (prop.value.left && prop.value.left.type === "MemberExpression") {
                    valuePath = sourceCode.getText(prop.value.left);
                  }
                } else {
                  // For other types, just use the source text
                  valuePath = sourceCode.getText(prop.value);
                }
                
                objectMap[keyName] = valuePath;
              }
            });
            
            result.objectMap = objectMap;
            return result;
          } else if (
            returnStmt.argument.type === "LogicalExpression" ||
            returnStmt.argument.type === "BinaryExpression" ||
            returnStmt.argument.type === "ConditionalExpression"
          ) {
            // For complex expressions like state.foo || {}, extract both the path and fallback
            if (
              returnStmt.argument.left &&
              returnStmt.argument.left.type === "MemberExpression"
            ) {
              var leftText = sourceCode.getText(returnStmt.argument.left);
              result.basePath = leftText.replace(
                new RegExp("^" + paramName + "\\."),
                ""
              );

              // Preserve the fallback (right side of || or ??)
              if (
                returnStmt.argument.operator === "||" ||
                returnStmt.argument.operator === "??"
              ) {
                result.fallback = {
                  operator: returnStmt.argument.operator,
                  value: sourceCode.getText(returnStmt.argument.right),
                };
              }
              return result;
            }
          }
        }
      }

      // Handle function expressions: function(state) { return state.foo }
      if (selectorFn.type === "FunctionExpression" && body.body) {
        var funcReturnStmt = body.body.find(function (stmt) {
          return stmt.type === "ReturnStatement";
        });
        if (funcReturnStmt && funcReturnStmt.argument) {
          if (funcReturnStmt.argument.type === "MemberExpression") {
            var funcReturnText = sourceCode.getText(funcReturnStmt.argument);
            result.basePath = funcReturnText.replace(
              new RegExp("^" + paramName + "\\."),
              ""
            );
            return result;
          } else if (funcReturnStmt.argument.type === "ObjectExpression") {
            // Handle object literals in return statements: return { foo: state.a, bar: state.b }
            var objectMap = {};
            funcReturnStmt.argument.properties.forEach(function(prop) {
              if (prop.key && prop.value) {
                var keyName = prop.key.name || (prop.key.value !== undefined ? prop.key.value : "");
                var valuePath = "";
                
                // Handle different types of values
                if (prop.value.type === "MemberExpression") {
                  // For simple member expressions like state.profile.name
                  valuePath = sourceCode.getText(prop.value);
                } else if (prop.value.type === "LogicalExpression" || prop.value.type === "BinaryExpression") {
                  // For expressions with fallbacks like state.notifications?.err
                  if (prop.value.left && prop.value.left.type === "MemberExpression") {
                    valuePath = sourceCode.getText(prop.value.left);
                  }
                } else {
                  // For other types, just use the source text
                  valuePath = sourceCode.getText(prop.value);
                }
                
                objectMap[keyName] = valuePath;
              }
            });
            
            result.objectMap = objectMap;
            return result;
          } else if (
            funcReturnStmt.argument.type === "LogicalExpression" ||
            funcReturnStmt.argument.type === "BinaryExpression" ||
            funcReturnStmt.argument.type === "ConditionalExpression"
          ) {
            // For complex expressions like state.foo || {}, extract both the path and fallback
            if (
              funcReturnStmt.argument.left &&
              funcReturnStmt.argument.left.type === "MemberExpression"
            ) {
              var funcLeftText = sourceCode.getText(
                funcReturnStmt.argument.left
              );
              result.basePath = funcLeftText.replace(
                new RegExp("^" + paramName + "\\."),
                ""
              );

              // Preserve the fallback (right side of || or ??)
              if (
                funcReturnStmt.argument.operator === "||" ||
                funcReturnStmt.argument.operator === "??"
              ) {
                result.fallback = {
                  operator: funcReturnStmt.argument.operator,
                  value: sourceCode.getText(funcReturnStmt.argument.right),
                };
              }
              return result;
            }
          }
        }
      }

      return result;
    }

    // Extract the base path from a selector function (for backward compatibility)
    function extractBasePath(selectorFn, paramName, sourceCode) {
      return extractSelectorInfo(selectorFn, paramName, sourceCode).basePath;
    }

    // Helper to handle both arrow functions and regular functions
    function isSelectorFunction(node) {
      if (!node || !node.callee || node.callee.type !== "Identifier") {
        return false;
      }

      if (!/use.*Selector.*/.test(node.callee.name)) {
        return false;
      }

      if (!node.arguments || !node.arguments.length) {
        return false;
      }

      var arg = node.arguments[0];

      // Handle both arrow functions and function expressions
      return (
        arg.type === "ArrowFunctionExpression" ||
        arg.type === "FunctionExpression"
      );
    }

    // Detect if code is using ES6 style (const, arrow functions)
    function detectCodeStyle(node) {
      var isConst = node.parent && node.parent.kind === "const";

      var isArrow =
        node.init &&
        node.init.type === "CallExpression" &&
        node.init.arguments &&
        node.init.arguments.length > 0 &&
        node.init.arguments[0].type === "ArrowFunctionExpression";

      // If either const or arrow function is used, assume ES6 style
      return isConst || isArrow;
    }

    // Track selector variables to avoid duplicate reports
    var reportedVariables = {};

    return {
      // Handle ES6 destructuring
      'VariableDeclaration > VariableDeclarator[id.type="ObjectPattern"]':
        function (node) {
          var id = node.id;
          var init = node.init;
          var sourceCode = getSourceCodeSafely();

          if (
            init &&
            init.type === "CallExpression" &&
            isSelectorFunction(init)
          ) {
            var selectorFn = init.arguments[0];
            var paramName = getParamName(selectorFn);

            if (!paramName) return;

            // Extract TypeScript type annotation if present
            var paramTypeAnnotation = getParamTypeAnnotation(
              selectorFn,
              sourceCode
            );

            // Check if the function has parentheses around its parameters
            var hasParentheses = hasParenthesesAroundParams(
              selectorFn,
              sourceCode
            );

            // Special handling for object literals in selectors
            var objectMap = null;
            var basePath = "";
            var fallback = null;
            var originalParamFormat = null;

            // Check if the selector returns an object literal
            if (
              selectorFn.type === "ArrowFunctionExpression" &&
              (selectorFn.body.type === "ObjectExpression" ||
                (selectorFn.body.type === "ParenthesizedExpression" &&
                  selectorFn.body.expression &&
                  selectorFn.body.expression.type === "ObjectExpression"))
            ) {
              // Extract the object expression
              var objectExpr = selectorFn.body.type === "ObjectExpression"
                ? selectorFn.body
                : selectorFn.body.expression;
              
              // Create a map of property names to their full paths
              objectMap = {};
              objectExpr.properties.forEach(function(prop) {
                if (prop.key && prop.value) {
                  var keyName = prop.key.name || (prop.key.value !== undefined ? prop.key.value : "");
                  objectMap[keyName] = sourceCode.getText(prop.value);
                }
              });

              // For object literals, capture the original parameter format
              var fnText = sourceCode.getText(selectorFn);
              var arrowIndex = fnText.indexOf("=>");
              if (arrowIndex !== -1) {
                originalParamFormat = fnText.substring(0, arrowIndex).trim();
              }
            } else {
              // For non-object literals, use the regular path extraction
              var selectorInfo = extractSelectorInfo(
                selectorFn,
                paramName,
                sourceCode
              );
              basePath = selectorInfo.basePath;
              fallback = selectorInfo.fallback;
            }

            // Detect if code is using ES6 style
            var useES6 = detectCodeStyle(node);

            var selectorInfo = {
              selectorName: init.callee.name,
              paramName: paramName,
              paramTypeAnnotation: paramTypeAnnotation,
              hasParentheses: hasParentheses,
              basePath: basePath,
              fallback: fallback,
              objectMap: objectMap,
              useES6: useES6,
              originalParamFormat: originalParamFormat,
            };

            var allFixes = processObjectPattern(id, selectorInfo);

            context.report({
              node: node,
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              fix: function (fixer) {
                var fixes = [];

                if (allFixes.length > 0) {
                  fixes.push(fixer.replaceText(node.parent, allFixes[0].text));

                  for (var i = 1; i < allFixes.length; i++) {
                    fixes.push(
                      fixer.insertTextAfter(
                        node.parent,
                        "\n" + allFixes[i].text
                      )
                    );
                  }
                }

                return fixes;
              },
            });
          }
        },

      // Handle ES5 variable assignments from selector results
      "VariableDeclaration > VariableDeclarator": function (node) {
        // Skip if it's already handled by the destructuring rule
        if (node.id.type === "ObjectPattern") return;

        // Look for patterns like: var obj = useSelector(...); var foo = obj.foo;
        if (node.init && node.init.type === "MemberExpression") {
          var objName = node.init.object && node.init.object.name;
          var propName = node.init.property && node.init.property.name;

          if (!objName || !propName) return;

          // Skip if we've already reported this variable
          var key = objName + "." + propName;
          if (reportedVariables[key]) return;

          // Find the declaration of the object
          var scope = context.getScope();
          var variable;

          for (
            var currentScope = scope;
            currentScope;
            currentScope = currentScope.upper
          ) {
            variable = currentScope.variables.find(function (v) {
              return v.name === objName;
            });
            if (variable) break;
          }

          if (!variable || !variable.defs || !variable.defs.length) return;

          var def = variable.defs[0];
          if (!def.node || !def.node.init) return;

          var callExpr = def.node.init;
          if (callExpr.type !== "CallExpression") return;

          if (isSelectorFunction(callExpr)) {
            var selectorFn = callExpr.arguments[0];
            var paramName = getParamName(selectorFn);

            if (!paramName) return;

            var sourceCode = getSourceCodeSafely();

            // Extract TypeScript type annotation if present
            var paramTypeAnnotation = getParamTypeAnnotation(
              selectorFn,
              sourceCode
            );

            // Check if the function has parentheses around its parameters
            var hasParentheses = hasParenthesesAroundParams(
              selectorFn,
              sourceCode
            );

            var selectorName = callExpr.callee.name;

            // Extract the base path using the improved function
            var selectorInfo = extractSelectorInfo(
              selectorFn,
              paramName,
              sourceCode
            );
            var basePath = selectorInfo.basePath;
            var fallback = selectorInfo.fallback;

            var useES6 =
              detectCodeStyle(def.node) || node.parent.kind === "const";

            var fullPath = basePath ? basePath + "." + propName : propName;
            var newSelector;

            // Check for default values
            var defaultValue = "";
            if (node.id.type === "AssignmentPattern") {
              defaultValue = " = " + sourceCode.getText(node.id.right);
            }

            if (useES6) {
              // Preserve type annotation and parentheses in ES6 style
              var paramWithType = paramTypeAnnotation
                ? hasParentheses
                  ? "(" + paramName + paramTypeAnnotation + ")"
                  : paramName + paramTypeAnnotation
                : paramName;

              var selectorExpression = paramName + "." + fullPath;

              // Apply fallback logic from the original selector if present
              if (fallback) {
                selectorExpression =
                  selectorExpression +
                  " " +
                  fallback.operator +
                  " " +
                  fallback.value;
              }

              newSelector =
                (node.parent.kind || "const") +
                " " +
                node.id.name +
                defaultValue +
                " = " +
                selectorName +
                "(" +
                paramWithType +
                " => " +
                selectorExpression +
                ");";
            } else {
              // Type annotations aren't valid in ES5
              var selectorExpression = paramName + "." + fullPath;

              // Apply fallback logic from the original selector if present
              if (fallback) {
                selectorExpression =
                  selectorExpression +
                  " " +
                  fallback.operator +
                  " " +
                  fallback.value;
              }

              newSelector =
                "var " +
                node.id.name +
                defaultValue +
                " = " +
                selectorName +
                "(function(" +
                paramName +
                ") { return " +
                selectorExpression +
                "; });";
            }

            // Mark this variable as reported
            reportedVariables[key] = true;

            context.report({
              node: node,
              message:
                "Avoid destructuring from selectors. Use granular selectors that return specific values.",
              fix: function (fixer) {
                return fixer.replaceText(node.parent, newSelector);
              },
            });
          }
        }
      },

      // Reset the reported variables at the start of each file
      Program: function () {
        reportedVariables = {};
      },
    };
  }
};
