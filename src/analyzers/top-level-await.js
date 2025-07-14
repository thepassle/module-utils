import { analyze } from "../../index.js";

/**
 * @param {string} source
 * @param {string} filePath
 * @returns {boolean}
 */
export function topLevelAwait(source, filePath = "") {
  let hasTLA = false;
  analyze(source, filePath, [
    {
      name: "analyze-tla",
      analyze: ({ ts, node }) => {
        if (ts.isSourceFile(node)) {
          for (const n of node.statements) {
            if (
              ts.isExpressionStatement(n) &&
              ts.isAwaitExpression(n.expression)
            ) {
              hasTLA = true;
              break;
            }
            
            if (ts.isVariableStatement(n)) {
              for (const declaration of n.declarationList.declarations) {
                if (declaration.initializer && ts.isAwaitExpression(declaration.initializer)) {
                  hasTLA = true;
                  break;
                }
              }
              if (hasTLA) break;
            }
          }
        }
      },
    },
  ]);
  return hasTLA;
}
