import path from 'path';
import { hasDefaultImport, hasNamedImport, hasAggregatingImport, hasSideEffectImport } from '../ast/imports.js';
import { analyze } from '../../index.js';

/**
 * @typedef {import('typescript').ImportDeclaration} ImportDeclaration
 */

/**
 * @typedef {{
 *  name: string,
 *  value: string
 * }} ImportAttribute
 */

/**
 * @typedef {{
 *  name: string,
 *  attributes?: ImportAttribute[],
 *  kind: "default" | "named" | "aggregate" | "side-effect",
 *  module: string,
 *  isTypeOnly: boolean
 * }} Import
 */

/**
 * 
 * @param {string} source 
 * @param {string} filePath 
 * @returns {Import[]}
 */
export function imports(source, filePath) {
  /** @type {Import[]} */
  const imports = [];
  analyze(source, filePath, [{
    name: 'analyze-imports',
    analyze: ({ts, node}) => {
      /**
       * @example import defaultExport from 'foo';
       * @example import type Foo from 'foo';
       */
      if (hasDefaultImport(node)) {
        const attributes = node.attributes?.elements.map(({name, value}) => ({
          name: name.text,
          value: value.text
        })) || [];
        const importTemplate = {
          name: node.importClause?.name?.text,
          kind: "default",
          module: path.normalize(node.moduleSpecifier.text),
          attributes,
          isTypeOnly: !!node?.importClause?.isTypeOnly,
        };

        imports.push(importTemplate);
      }

      /**
       * @example import { export1, export2 } from 'foo';
       * @example import { export1 as alias1 } from 'foo';
       * @example import { export1, export2 as alias2 } from 'foo';
       * @example import type { Foo } from 'foo';
       */
      if (hasNamedImport(node)) {
        node.importClause.namedBindings.elements.forEach(
          (element) => {
            const importTemplate = {
              name: element.name.text,
              kind: "named",
              module: path.normalize(node.moduleSpecifier.text),
              isTypeOnly: !!node?.importClause?.isTypeOnly,
            };
            imports.push(importTemplate);
          }
        );
      }

      /**
       * @example import * as name from './my-module.js';
       */
      if (hasAggregatingImport(node)) {
        const importTemplate = {
          name: node.importClause.namedBindings.name.text,
          kind: "aggregate",
          module: path.normalize(node.moduleSpecifier.text),
          isTypeOnly: !!node?.importClause?.isTypeOnly,
        };
        imports.push(importTemplate);
      }

      /**
       * @example import './my-module.js';
       */
      if (hasSideEffectImport(node)) {
        const importTemplate = {
          kind: "side-effect",
          module: path.normalize(node.moduleSpecifier.text),
          isTypeOnly: false,
        };
        imports.push(importTemplate);
      }
    }
  }]);
  return imports;
}