import { analyzeExports } from "./exports.js"
import { analyze } from "../../index.js";

/**
 * @param {string} source
 * @param {string} filePath
 * @param {{
 *  amountOfExportsToConsiderModuleAsBarrel: number
 * }} [options]
 * @returns {boolean}
 */
export function barrelFile(source, filePath, options) {
  const amountOfExportsToConsiderModuleAsBarrel = options?.amountOfExportsToConsiderModuleAsBarrel ?? 5;
  let declarations = 0;
  /** @type {import('./exports.js').Export[]} */
  const exports = [];

  analyze(source, filePath, [
    analyzeExports(filePath, exports),
    {
      name: 'analyze-declarations',
      analyze: ({ts, node}) => {
        if (ts.isVariableStatement(node)) {
          declarations += node.declarationList.declarations.length;
        }
    
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node)
        ) {
          declarations++;
        }
      }
    }
  ]);

  return exports.length > declarations && exports.length > amountOfExportsToConsiderModuleAsBarrel;
}