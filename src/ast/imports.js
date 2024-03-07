import { has } from '../utils.js';
import ts from 'typescript';

/** @example import defaultExport from 'foo'; */
export function hasDefaultImport(node) {
  return !!node?.importClause?.name;
}

/** @example import {namedA, namedB} from 'foo'; */
export function hasNamedImport(node) {
  return has(node?.importClause?.namedBindings?.elements);
}

/** @example import * as name from './my-module.js'; */
export function hasAggregatingImport(node) {
  return !!node?.importClause?.namedBindings?.name && !hasNamedImport(node);
}

/** @example import './my-module.js'; */
export function hasSideEffectImport(node) {
  return "importClause" in node && node.importClause == null;
}

/**
 * Dynamic imports
 */

export function handleConcatenatedString(node) {
  let left;
  let right;

  if (ts.isBinaryExpression(node.left)) {
      left = handleConcatenatedString(node.left);
  } else if (ts.isIdentifier(node.left)) {
      left = '*';
  } else if (ts.isStringLiteral(node.left)) {
      left = node.left.text;
  }

  if (ts.isBinaryExpression(node.right)) {
      right = handleConcatenatedString(node.right);
  } else if (ts.isIdentifier(node.right)) {
      right = '*';
  } else if (ts.isStringLiteral(node.right)) {
      right = node.right.text;
  }

  return left + right;
}

export function hasImportAttributes(node) {
  const object = node?.arguments?.[1];
  return !!(object && ts.isObjectLiteralExpression(object));
}

export function isDynamicImport(node) {
  return ts.isCallExpression(node) && node.expression?.kind === ts.SyntaxKind.ImportKeyword;
}