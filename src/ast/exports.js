import { has } from '../utils.js';
import ts from 'typescript';

/**
 * @param {any} node 
 * @returns {boolean}
 */
export function hasExportModifier(node) {
  if (has(node?.modifiers)) {
    /** @param {any} mod */
    const predicate = mod => mod.kind === ts.SyntaxKind.ExportKeyword
    if (node.modifiers.some(predicate)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {any} node 
 * @returns {boolean}
 */
export function hasDefaultModifier(node) {
  if (has(node?.modifiers)) {
    /** @param {any} mod */
    const predicate = mod => mod.kind === ts.SyntaxKind.DefaultKeyword
    if (node.modifiers.some(predicate)) {
      return true;
    }
  }
  return false;
}

/**
 * @example export { var1, var2 };
 * @param {any} node
 * @returns {boolean}
 */
export function hasNamedExports(node) {
  if (has(node?.exportClause?.elements)) {
    return true;
  }
  return false;
}

/**
 * @example export { var1, var2 } from 'foo';
 * @param {any} node
 * @returns {boolean}
 */
export function isReexport(node) {
  if (node?.moduleSpecifier !== undefined) {
    return true;
  }
  return false;
}
