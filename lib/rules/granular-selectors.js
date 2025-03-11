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
  create: function(context) {
    function processObjectPattern(objectPattern, selectorInfo, parentPath) {
      parentPath = parentPath || '';
      var selectorName = selectorInfo.selectorName;
      var paramName = selectorInfo.paramName;
      var basePath = selectorInfo.basePath;
      var useES6 = selectorInfo.useES6;
      var fixes = [];
      var properties = objectPattern.properties;
      
      properties.forEach(function(prop) {
        if (prop.type === 'Property') {
          var keyName = prop.key.name || (prop.key.value !== undefined ? prop.key.value : '');
          var currentPath = parentPath ? (parentPath + '.' + keyName) : keyName;
          
          if (prop.value.type === 'ObjectPattern') {
            var nestedFixes = processObjectPattern(
              prop.value, 
              selectorInfo, 
              currentPath
            );
            fixes.push.apply(fixes, nestedFixes);
          } else {
            var alias = prop.value.type === 'Identifier' && prop.value.name !== keyName 
              ? prop.value.name 
              : keyName;
            
            var fullPath = basePath 
              ? (basePath + '.' + currentPath) 
              : currentPath;
            
            var newSelector;
            if (useES6) {
              // ES6 style with const and arrow function
              newSelector = 'const ' + alias + ' = ' + selectorName + '(' + paramName + ' => ' + paramName + '.' + fullPath + ');';
            } else {
              // ES5 style with var and function expression
              newSelector = 'var ' + alias + ' = ' + selectorName + '(function(' + paramName + ') { return ' + paramName + '.' + fullPath + '; });';
            }
            
            fixes.push({
              type: 'declaration',
              text: newSelector
            });
          }
        }
      });
      
      return fixes;
    }
    
    function getSourceCodeSafely() {
      if (typeof context.getSourceCode === 'function') {
        return context.getSourceCode();
      }
      return {
        getText: function(node) {
          return context.getSource(node);
        }
      };
    }
    
    function getParamName(funcNode) {
      if (!funcNode || !funcNode.params || !funcNode.params.length) {
        return null;
      }
      return funcNode.params[0].name;
    }
    
    // Helper to handle both arrow functions and regular functions
    function isSelectorFunction(node) {
      if (!node || !node.callee || node.callee.type !== 'Identifier') {
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
      return (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression');
    }
    
    // Detect if code is using ES6 style (const, arrow functions)
    function detectCodeStyle(node) {
      var isConst = node.parent && node.parent.kind === 'const';
      
      var isArrow = node.init && 
                    node.init.type === 'CallExpression' && 
                    node.init.arguments && 
                    node.init.arguments.length > 0 && 
                    node.init.arguments[0].type === 'ArrowFunctionExpression';
      
      // If either const or arrow function is used, assume ES6 style
      return isConst || isArrow;
    }
    
    // Track selector variables to avoid duplicate reports
    var reportedVariables = {};
    
    return {
      // Handle ES6 destructuring
      'VariableDeclaration > VariableDeclarator[id.type="ObjectPattern"]': function(node) {
        var id = node.id;
        var init = node.init;
        var sourceCode = getSourceCodeSafely();
        
        if (init && init.type === 'CallExpression' && isSelectorFunction(init)) {
          var selectorFn = init.arguments[0];
          var paramName = getParamName(selectorFn);
          
          if (!paramName) return;
          
          var body = selectorFn.body;
          
          var basePath = '';
          if ((selectorFn.type === 'ArrowFunctionExpression' && body.type === 'MemberExpression') ||
              (selectorFn.type === 'FunctionExpression' && body.body && 
               body.body.length === 1 && body.body[0].type === 'ReturnStatement' && 
               body.body[0].argument && body.body[0].argument.type === 'MemberExpression')) {
            
            var exprNode = selectorFn.type === 'ArrowFunctionExpression' ? body : body.body[0].argument;
            basePath = sourceCode.getText(exprNode).replace(paramName + '.', '');
          }
          
          // Detect if code is using ES6 style
          var useES6 = detectCodeStyle(node, sourceCode);
          
          var selectorInfo = {
            selectorName: init.callee.name,
            paramName: paramName,
            basePath: basePath,
            useES6: useES6
          };
          
          var allFixes = processObjectPattern(id, selectorInfo);
          
          context.report({
            node: node,
            message: 'Avoid destructuring from selectors. Use granular selectors that return specific values.',
            fix: function(fixer) {
              var fixes = [];
              
              if (allFixes.length > 0) {
                fixes.push(fixer.replaceText(node.parent, allFixes[0].text));
                
                for (var i = 1; i < allFixes.length; i++) {
                  fixes.push(fixer.insertTextAfter(node.parent, '\n' + allFixes[i].text));
                }
              }
              
              return fixes;
            }
          });
        }
      },
      
      // Handle ES5 variable assignments from selector results
      'VariableDeclaration > VariableDeclarator': function(node) {
        // Skip if it's already handled by the destructuring rule
        if (node.id.type === 'ObjectPattern') return;
        
        // Look for patterns like: var obj = useSelector(...); var foo = obj.foo;
        if (node.init && node.init.type === 'MemberExpression') {
          var objName = node.init.object && node.init.object.name;
          var propName = node.init.property && node.init.property.name;
          
          if (!objName || !propName) return;
          
          // Skip if we've already reported this variable
          var key = objName + '.' + propName;
          if (reportedVariables[key]) return;
          
          // Find the declaration of the object
          var scope = context.getScope();
          var variable;
          
          for (var currentScope = scope; currentScope; currentScope = currentScope.upper) {
            variable = currentScope.variables.find(function(v) { return v.name === objName; });
            if (variable) break;
          }
          
          if (!variable || !variable.defs || !variable.defs.length) return;
          
          var def = variable.defs[0];
          if (!def.node || !def.node.init) return;
          
          var callExpr = def.node.init;
          if (callExpr.type !== 'CallExpression') return;
          
          if (isSelectorFunction(callExpr)) {
            var selectorFn = callExpr.arguments[0];
            var paramName = getParamName(selectorFn);
            
            if (!paramName) return;
            
            var selectorName = callExpr.callee.name;
            var basePath = '';
            var sourceCode = getSourceCodeSafely();
            
            // Get the base path if any
            if ((selectorFn.type === 'ArrowFunctionExpression' && selectorFn.body.type === 'MemberExpression') ||
                (selectorFn.type === 'FunctionExpression' && selectorFn.body.body && 
                 selectorFn.body.body.length === 1 && selectorFn.body.body[0].type === 'ReturnStatement' && 
                 selectorFn.body.body[0].argument && selectorFn.body.body[0].argument.type === 'MemberExpression')) {
              
              var exprNode = selectorFn.type === 'ArrowFunctionExpression' ? selectorFn.body : selectorFn.body.body[0].argument;
              basePath = sourceCode.getText(exprNode).replace(paramName + '.', '');
            }
            
            var useES6 = detectCodeStyle(def.node, sourceCode) || node.parent.kind === 'const';
            
            var fullPath = basePath ? (basePath + '.' + propName) : propName;
            var newSelector;
            
            if (useES6) {
              newSelector = (node.parent.kind || 'const') + ' ' + node.id.name + ' = ' + selectorName + '(' + paramName + ' => ' + paramName + '.' + fullPath + ');';
            } else {
              newSelector = 'var ' + node.id.name + ' = ' + selectorName + '(function(' + paramName + ') { return ' + paramName + '.' + fullPath + '; });';
            }
            
            // Mark this variable as reported
            reportedVariables[key] = true;
            
            context.report({
              node: node,
              message: 'Avoid destructuring from selectors. Use granular selectors that return specific values.',
              fix: function(fixer) {
                return fixer.replaceText(node.parent, newSelector);
              }
            });
          }
        }
      },
      
      // Reset the reported variables at the start of each file
      'Program': function() {
        reportedVariables = {};
      }
    };
  }
};