import path from "path";
import {
  isReexport,
  hasNamedExports,
  hasExportModifier,
  hasDefaultModifier,
} from "../ast/exports.js";
import { isBareModuleSpecifier } from "../utils.js"
import { analyze } from "../../index.js";

/**
 * @typedef {{
 *  name: string,
 *  kind: "js",
 *  declaration: {
 *   name: string,
 *   module?: string,
 *   package?: string
 *  },
 *  isTypeOnly: boolean
 * }} Export
 */

/**
 * @param {string} source
 * @param {string} filePath
 * @returns {Export[]}
 */
export function exports(source, filePath) {
  /** @type {Export[]} */
  const exports = [];
  analyze(source, filePath, [
    {
      name: "analyze-exports",
      analyze: ({ ts, node }) => {
        /**
         * @example export const foo = '';
         * @example export var foo = '';
         * @example export let foo = '';
         */
        if (hasExportModifier(node) && ts.isVariableStatement(node)) {
          node?.declarationList?.declarations?.forEach((declaration) => {
            const _export = {
              kind: "js",
              name: declaration.name.getText(),
              declaration: {
                name: declaration.name.getText(),
                module: filePath,
              },
            };

            exports.push(_export);
          });
        }

        /**
         * @example export default var1;
         */
        if (ts.isExportAssignment(node)) {
          const _export = {
            kind: "js",
            name: "default",
            declaration: {
              name: node.expression.text,
              module: filePath,
            },
          };
          exports.push(_export);
        }

        if (ts.isExportDeclaration(node)) {
          /**
           * @example export { var1, var2 };
           * @example export { var1 as var2 };
           */
          if (hasNamedExports(node) && !isReexport(node)) {
            node.exportClause?.elements?.forEach((element) => {
              const _export = {
                kind: "js",
                name: element.propertyName?.getText?.() ?? element.name?.getText(),
                declaration: {
                  name: element.name?.text ?? element.propertyName?.getText(),
                  module: filePath,
                },
              };

              exports.push(_export);
            });
          }

          /**
           * @example export * from 'foo';
           * @example export * from './my-module.js';
           * @example export * as foo from './my-module.js';
           */
          if (isReexport(node) && !hasNamedExports(node)) {
            const _export = {
              kind: "js",
              name: "*",
              declaration: {
                name: node.exportClause?.name?.text ?? "*",
              },
            };

            if (isBareModuleSpecifier(node.moduleSpecifier.text)) {
              _export.declaration.package = node.moduleSpecifier.text;
            } else {
              _export.declaration.module = path.normalize(node.moduleSpecifier.text);
            }
            exports.push(_export);
          }

          /**
           * @example export { var1, var2 } from 'foo';
           * @example export { default } from 'foo';
           * @example export { var1, var2 } from './my-module.js';
           * @example export { var1 as var2 } from './my-module.js';
           */
          if (isReexport(node) && hasNamedExports(node)) {
            node.exportClause?.elements?.forEach((element) => {
              const name = element.propertyName?.getText?.() ?? element.name?.getText()
              const _export = {
                kind: "js",
                name,
                declaration: {
                  name: element.name?.text ?? element.propertyName?.getText()
                },
              };

              if (isBareModuleSpecifier(node.moduleSpecifier.text)) {
                _export.declaration.package = node.moduleSpecifier.text;
              } else {
                _export.declaration.module = path.normalize(node.moduleSpecifier.text);
              }
              exports.push(_export);
            });
          }
        }

        /**
         * @example export function foo() {}
         * @example export default function foo() {}
         */
        if (ts.isFunctionDeclaration(node)) {
          if (hasExportModifier(node)) {
            const isDefault = hasDefaultModifier(node);
            const _export = {
              kind: "js",
              name: isDefault ? "default" : node.name?.getText() || "",
              declaration: {
                name: node.name?.getText() || "",
                module: filePath,
              },
            };
            exports.push(_export);
          }
        }

        /**
         * @example export class Class1 {}
         * @example export default class Class1 {}
         */
        if (ts.isClassDeclaration(node)) {
          if (hasExportModifier(node)) {
            const isDefault = hasDefaultModifier(node);
            const _export = {
              kind: "js",
              name: isDefault ? "default" : node?.name?.text || "",
              declaration: {
                name: node?.name?.text || "",
                module: filePath,
              },
            };
            exports.push(_export);
          }
        }
      },
    },
  ]);

  return exports;
}