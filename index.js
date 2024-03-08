import ts from 'typescript';

/**
 * @typedef {{
 *  name: string,
 *  start?: (params: {
 *   ts: typeof ts
 *   source: string,
 *   filePath: string,
 *   ast: ts.SourceFile,
 *   context: any
 *  }) => void,
 *  analyze?: (params: { 
 *   ts: typeof ts
 *   node: any, 
 *   source: string, 
 *   filePath: string, 
 *   ast: ts.SourceFile, 
 *   context: any
 *  }) => void,
 *  end?: (params: { 
 *   ts: typeof ts
 *   source: string, 
 *   filePath: string, 
 *   ast: ts.SourceFile, 
 *   context: any
 *  }) => void
 * }} Plugin
 * 
 * @typedef {Object} Context
 */

/**
 * @param {string} source 
 * @param {string} filePath
 * @param {Array<Plugin>} plugins
 */
export function analyze(source, filePath, plugins) {
  const context = {};
  const ast = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.ES2015,
    true
  );

  for (const { name, start } of plugins) {
    if (!name) throw new Error('Plugin must have a name.');
    try {
      start?.({ ts, source, filePath, ast, context });
    } catch(e) {
      throw new Error(`Error in plugin "${name}": ${/** @type {Error} */ (e).stack}`);
    }
  }

  /**
   * @param {ts.SourceFile} ast 
   * @param {string} filePath 
   */
  function _analyze(ast, filePath) {
    visitNode(ast);

    /**
     * @param {ts.Node} node 
     */
    function visitNode(node) {
      for (const { name, analyze } of plugins) {
        try {
          analyze?.({ ts, node, source, filePath, ast, context });
        } catch(e) {
          throw new Error(`Error in plugin "${name}": ${/** @type {Error} */ (e).stack}`);
        }
      }
      ts.forEachChild(node, visitNode);
    }
  }
  
  _analyze(ast, filePath);

  for (const { name, end } of plugins) {
    try {
      end?.({ ts, source, filePath, ast, context });
    } catch(e) {
      throw new Error(`Error in plugin "${name}": ${/** @type {Error} */ (e).stack}`);
    }
  }
}