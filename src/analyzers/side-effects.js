import { analyze } from "../../index.js";

/**
 * @param {string} source
 * @param {string} filePath
 * @returns {boolean}
 */
export function sideEffects(source, filePath = "") {
  let isSideEffectful = false;
  analyze(source, filePath, [
    {
      name: "analyze-side-effects",
      analyze: ({ ts, node }) => {
        /**
         * Recursively traverses a property access expression to find the root identifier
         * @param {any} node - TypeScript AST node
         * @returns {string|null} - The root identifier text or null if not found
         */
        function getRootIdentifier(node) {
          if (ts.isIdentifier(node)) {
            return node.getText();
          }

          if (ts.isPropertyAccessExpression(node)) {
            return getRootIdentifier(node.expression);
          }

          return null;
        }

        if (ts.isSourceFile(node)) {
          for (const n of node.statements) {
            /**
             * @example window.foo = 1;
             * @example window.foo.bar = 2;
             * @example globalThis.foo.bar = 3;
             * @example self.foo.bar = 4;
             */
            if (
              ts.isExpressionStatement(n) &&
              ts.isBinaryExpression(n?.expression) &&
              ts.isPropertyAccessExpression(n?.expression?.left)
            ) {
              const rootIdentifier = getRootIdentifier(n.expression.left);
              /** @type {boolean | null} */
              const globalAssignment = [
                "globalThis",
                "window",
                "self",
              ].includes(rootIdentifier ?? "");

              if (globalAssignment) {
                isSideEffectful = true;
                break;
              }
            }

            /**
             * @example foo();
             * @example foo.bar();
             */
            if (
              ts.isExpressionStatement(n) &&
              ts.isCallExpression(n.expression)
            ) {
              isSideEffectful = true;
              break;
            }

            /**
             * @example foo.bar = 1;
             */
            if (
              ts.isExpressionStatement(n) &&
              ts.isBinaryExpression(n.expression) &&
              n.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ) {
              const left = n.expression.left;

              if (
                ts.isPropertyAccessExpression(left) ||
                ts.isElementAccessExpression(left)
              ) {
                isSideEffectful = true;
                break;
              }
            }
          }
        }
      },
    },
  ]);
  return isSideEffectful;
}
