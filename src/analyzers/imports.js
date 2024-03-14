import { normalize } from 'pathe';
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
 *  declaration: string
 * }} Identifier
 */

/**
 * declaration = the exported symbol, or in the case of an aggregate it will be '*'
 * name = alias
 * @typedef {{
 *  name?: string,
 *  declaration?: string,
 *  attributes?: ImportAttribute[],
 *  kind: "default" | "named" | "aggregate" | "side-effect" | "dynamic",
 *  module: string,
 *  isTypeOnly: boolean
 * }} Import
 */

/**
 * @param {string} source 
 * @param {string} filePath 
 * @returns {Import[]}
 */
export function imports(source, filePath = '') {
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

            /**
             * @param {any} property 
             */
            function createAttribute(property) {
              const name = property.name.text;
              const value = property.initializer.text;
              attributes.push({name, value});
            }

            attributesObj.initializer.properties.forEach(createAttribute);
          }
        }

        let module = '';
        /**
         * @example import('./foo.js')
         * @example import(`./foo.js`)
         */
        if (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) {
          module = normalize(node.arguments[0].text);
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
          module = normalize(result.join('*'));
        }

        /**
         * @example import('./foo-' + bar + '-' + baz + '.js');
         */
        if (ts.isBinaryExpression(node?.arguments?.[0])) {
          module = normalize(handleConcatenatedString(node.arguments[0]));
        }

        /**
         * @type {Identifier[]}
         */
        let names = [];
        if (ts.isVariableDeclaration(node.parent)) {
          /**
           * @example const foo = import('./foo.js');
           */
          if (ts.isIdentifier(node?.parent?.name)) {
            names = [{
              name: node.parent.name.text,
              declaration: node.parent.name.text,
            }];
          }

          /**
           * @example const { foo, bar, baz: qux } = import('./foo.js');
           */
          if (ts.isObjectBindingPattern(node?.parent?.name)) {
            for (const element of node.parent.name.elements) {
              if (ts.isBindingElement(element)) {
                if (ts.isIdentifier(element.name)) {
                  names.push({
                    name: element.name.text,
                    declaration: /** @type {import('typescript').Identifier} */ (element?.propertyName)?.text ?? element.name.text,
                  });
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
                names.push({
                  name: element.name.text,
                  declaration: element.name.text
                });
              }
            }
          }
        }
        
        if (!names.length) {
          names = [{ name: '', declaration: ''}];
        }

        for (const {name, declaration} of names) {
          const importTemplate = {
            /** @type {'dynamic'} */
            kind: 'dynamic',
            name,
            declaration,
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

        /**
         * @param {any} param
         */
        const mapAttribute = ({name, value}) => ({name: name.text, value: value.text});
        const attributes = node.attributes?.elements.map(mapAttribute) || [];
        const importTemplate = {
          name: node.importClause?.name?.text,
          declaration: node.importClause?.name?.text,
          /** @type {'default'} */
          kind: "default",
          module: normalize(node.moduleSpecifier.text),
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
        /**
         * @param {any} element 
         */
        function createNamedImport(element) {
          const importTemplate = {
            name: element.name.text,
            declaration: element?.propertyName?.text ?? element.name.text,
            /** @type {'named'} */
            kind: "named",
            module: normalize(node.moduleSpecifier.text),
            isTypeOnly: !!node?.importClause?.isTypeOnly,
          };
          imports.push(importTemplate);
        }

        node.importClause.namedBindings.elements.forEach(createNamedImport);
      }

      /**
       * @example import * as name from './my-module.js';
       */
      if (hasAggregatingImport(node)) {
        const importTemplate = {
          name: node.importClause.namedBindings.name.text,
          declaration: '*',
          /** @type {'aggregate'} */
          kind: "aggregate",
          module: normalize(node.moduleSpecifier.text),
          isTypeOnly: !!node?.importClause?.isTypeOnly,
        };
        imports.push(importTemplate);
      }

      /**
       * @example import './my-module.js';
       */
      if (hasSideEffectImport(node)) {
        const importTemplate = {
          /** @type {'side-effect'} */
          kind: "side-effect",
          module: normalize(node.moduleSpecifier.text),
          isTypeOnly: false,
        };
        imports.push(importTemplate);
      }
    }
  }]);
  return imports;
}