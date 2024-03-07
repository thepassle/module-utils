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
