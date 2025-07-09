import { normalize } from "pathe";

/**
 * @template T
 * @param {Array<T>} arr 
 * @returns {boolean}
 */
export const has = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * @param {string} p 
 * @returns {string}
 */
export const toUnix = (p) => p.replace(/\\/g, "/");

/**
 * @param {string} specifier
 * @returns {boolean}
 */
export const isBareModuleSpecifier = (specifier) => !!specifier?.replace(/'/g, '')[0].match(/[@a-zA-Z]/g);

/**
 * @param {string} specifier
 * @returns {boolean}
 */
export const isScopedPackage = (specifier) => specifier.startsWith('@');

/**
 * @param {string} moduleSpecifier 
 * @param {string} filePath 
 * @returns {string}
 */
export function createPath(moduleSpecifier, filePath) {
  const normalized = normalize(moduleSpecifier);
  if (URL.canParse(filePath)) {
    return new URL(normalized, filePath).href;
  } else {
    return normalized;
  }
}
