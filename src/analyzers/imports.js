import path from 'path';
import { 
  hasDefaultImport, 
  hasNamedImport, 
  hasAggregatingImport, 
  hasSideEffectImport,
  handleConcatenatedString,
  hasImportAttributes,
  isDynamicImport
} from '../ast/imports.js';
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

      if (isDynamicImport(node)) {
        /**
         * @example import(foo);
         */
        if (ts.isIdentifier(node?.arguments?.[0])) {
          return;
        }

        /**
         * @type {ImportAttribute[]}
         */
        const attributes = [];
        /**
         * @example import('foo', { with: { type: 'json' } });
         */
        if (hasImportAttributes(node)) {
          const object = node.arguments[1];
          const attributesObj = object?.properties?.[0];
          if (attributesObj.initializer?.properties) {
            attributesObj.initializer.properties.forEach((property) => {
              const name = property.name.text;
              const value = property.initializer.text;
              attributes.push({name, value});
            });
          }
        }

        let module = '';
        /**
         * @example import('./foo.js')
         * @example import(`./foo.js`)
         */
        if (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) {
          module = path.normalize(node.arguments[0].text);
        }

        /**
         * @example import(`./foo-${bar}-${baz}.js`)
         */
        if (ts.isTemplateExpression(node.arguments[0])) {
          let result = [];
          result.push(node.arguments[0].head.text);
          for (const span of node.arguments[0].templateSpans) {
            result.push(span.literal.text);
          }
          module = path.normalize(result.join('*'));
        }

        /**
         * @example import('./foo-' + bar + '-' + baz + '.js');
         */
        if (ts.isBinaryExpression(node?.arguments?.[0])) {
          module = path.normalize(handleConcatenatedString(node.arguments[0]));
        }

        /**
         * @type {string[]}
         */
        let names = [];
        if (ts.isVariableDeclaration(node.parent)) {
          /**
           * @example const foo = import('./foo.js');
           */
          if (ts.isIdentifier(node?.parent?.name)) {
            names = [node.parent.name.text];
          }

          /**
           * @example const { foo, bar, baz: qux } = import('./foo.js');
           */
          if (ts.isObjectBindingPattern(node?.parent?.name)) {
            for (const element of node.parent.name.elements) {
              if (ts.isBindingElement(element)) {
                if (ts.isIdentifier(element.name)) {
                  names.push(element.name.text);
                }
              }
            }
          }

          /**
           * @example const [ foo, bar, baz ] = import('./foo.js');
           */
          if (ts.isArrayBindingPattern(node?.parent?.name)) {
            for (const element of node.parent.name?.elements) {
              if (ts.isIdentifier(element.name)) {
                names.push(element.name.text);
              }
            }
          }
        }
        
        if (!names.length) {
          names = [''];
        }

        for (const name of names) {
          const importTemplate = {
            kind: 'dynamic',
            name,
            attributes,
            module,
            isTypeOnly: false,
          };
          imports.push(importTemplate);
        }
      }

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