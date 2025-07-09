import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyze } from '../index.js';
import { imports } from '../src/analyzers/imports.js';
import { exports } from '../src/analyzers/exports.js';
import { barrelFile } from '../src/analyzers/barrel-file.js';

describe('analyze', () => {
  const s = 'export const foo = "bar";';
  const f = 'file.js';

  it('basic', () => {
    analyze(s, f, [{
      name: 'test',
      start: ({ ts, source, filePath, ast, context }) => {
        assert(ts);
        assert.deepStrictEqual(context, {});
        assert.equal(source, s);
        assert.equal(filePath, f);
        assert.equal(ast.text, s);
      },
      analyze: ({ ts, context, node }) => {
        context.foo = 'bar';
        assert(ts);
        assert(node);
      },
      end: ({ ts, source, filePath, ast, context }) => {
        assert(ts);
        assert.deepStrictEqual(context, {
          foo: 'bar'
        });
        assert.equal(source, s);
        assert.equal(filePath, f);
        assert.equal(ast.text, s);
      },
    }]);
  });

  describe('barrel file', () => {
    it('default', () => {
      const result = barrelFile(`
        export {foo} from 'foo';
        export {bar} from 'bar';
        export {baz} from 'baz';
      `, 'file.js', { amountOfExportsToConsiderModuleAsBarrel: 2 });

      assert.equal(result, true);
    });

    it('more declarations than exports', () => {
      const result = barrelFile(`
        const foo = 1;
        const bar = 1;
        const baz = 1;
        export {foo} from 'foo';
        export {bar} from 'bar';
      `, 'file.js', { amountOfExportsToConsiderModuleAsBarrel: 2 });

      assert.equal(result, false);
    });
  });

  describe('imports', () => {
    it('default', () => {
      const result = imports('import foo from "./foo.js";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'default',
          name: 'foo',
          module: 'foo.js',
          declaration: 'foo',
          isTypeOnly: false,
          attributes: []
        }
      ]);
    });
    
    it('default url', () => {
      const result = imports('import foo from "./foo.js";', 'http://foo.com/node_modules/foo/file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'default',
          name: 'foo',
          module: 'http://foo.com/node_modules/foo/foo.js',
          declaration: 'foo',
          isTypeOnly: false,
          attributes: []
        }
      ]);
    });

    describe('dynamic import', () => {
      it('dynamic import local', () => {
        const result = imports('import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: '',
            declaration: '',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });
      
      it('dynamic import url', () => {
        const result = imports('import("./foo.js")', 'http://foo.com/node_modules/foo/file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: '',
            declaration: '',
            module: 'http://foo.com/node_modules/foo/foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import external', () => {
        const result = imports('import("foo")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: '',
            declaration: '',
            module: 'foo',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import template literal', () => {
        const result = imports('import(`./foo.js`)', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: '',
            declaration: '',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('ignores dynamic import values template literal', () => {
        const result = imports('import(`./foo-${bar}-${baz}.js`)', 'file.js');
        assert.deepStrictEqual(result, [
          {
            attributes: [],
            isTypeOnly: false,
            kind: 'dynamic',
            module: 'foo-*-*.js',
            name: '',
            declaration: '',
          }
        ]);
      });

      it('ignores dynamic import values template literal', () => {
        const result = imports('import(foo)', 'file.js');
        assert.deepStrictEqual(result, []);
      });

      it('ignores dynamic import values string concat', () => {
        const result = imports('import("./foo-" + bar + "-" + baz + ".js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            attributes: [],
            isTypeOnly: false,
            kind: 'dynamic',
            module: 'foo-*-*.js',
            name: '',
            declaration: '',
          }
        ]);
      });

      it('dynamic import local attributes', () => {
        const result = imports('import("./foo.js", { with: { type: "json" } })', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: '',
            declaration: '',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: [{ name: 'type', value: 'json' }]
          }
        ]);
      });


      it('dynamic import variable assignment', () => {
        const result = imports('const foo = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import destructure assignment', () => {
        const result = imports('const { foo, bar } = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          },
          {
            kind: 'dynamic',
            name: 'bar',
            declaration: 'bar',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          },
        ]);
      });

      it('dynamic import destructure assignment rename', () => {
        const result = imports('const { foo: bar } = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'bar',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import rest object', () => {
        const result = imports('const { ...foo } = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import rest object', () => {
        const result = imports('const { foo, ...bar } = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          },
          {
            kind: 'dynamic',
            name: 'bar',
            declaration: 'bar',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import rest array', () => {
        const result = imports('const [ ...foo ] = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import rest array', () => {
        const result = imports('const [ foo, ...bar ] = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          },
          {
            kind: 'dynamic',
            name: 'bar',
            declaration: 'bar',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });

      it('dynamic import destructure assignment rename', () => {
        const result = imports('const [ foo, bar ] = import("./foo.js")', 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'dynamic',
            name: 'foo',
            declaration: 'foo',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          },
          {
            kind: 'dynamic',
            name: 'bar',
            declaration: 'bar',
            module: 'foo.js',
            isTypeOnly: false,
            attributes: []
          }
        ]);
      });
    });

    it('import attributes', () => {
      const result = imports('import data from "./data.json" with { type: "json" };', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'default',
          name: 'data',
          declaration: 'data',
          attributes: [{ name: 'type', value: 'json' }],
          module: 'data.json',
          isTypeOnly: false,
        }
      ]);
    });

    it('import default type', () => {
      const result = imports('import type Foo from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'default',
          name: 'Foo',
          declaration: 'Foo',
          attributes: [],
          module: 'foo',
          isTypeOnly: true,
        }
      ]);
    });

    it('import named type', () => {
      const result = imports('import type { Foo } from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          name: 'Foo',
          declaration: 'Foo',
          module: 'foo',
          isTypeOnly: true,
        }
      ]);
    });

    it('import named type multiple', () => {
      const result = imports('import type { Foo, Bar } from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          name: 'Foo',
          declaration: 'Foo',
          module: 'foo',
          isTypeOnly: true,
        },
        {
          kind: 'named',
          name: 'Bar',
          declaration: 'Bar',
          module: 'foo',
          isTypeOnly: true,
        },
      ]);
    });

    it('side-effect local', () => {
      const result = imports('import "./foo.js";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'side-effect',
          module: 'foo.js',
          isTypeOnly: false,
        }
      ]);
    });

    it('side-effect url', () => {
      const result = imports('import "./foo.js";', 'http://foo.com/node_modules/foo/file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'side-effect',
          module: 'http://foo.com/node_modules/foo/foo.js',
          isTypeOnly: false,
        }
      ]);
    });

    it('side-effect external', () => {
      const result = imports('import "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'side-effect',
          module: 'foo',
          isTypeOnly: false,
        }
      ]);
    });

    it('aggregate', () => {
      const result = imports('import * as foo from "./my-module.js"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'aggregate',
          declaration: '*',
          module: 'my-module.js',
          name: 'foo',
          isTypeOnly: false,
        }
      ]);
    });

    it('aggregate url', () => {
      const result = imports('import * as foo from "./my-module.js"', 'http://foo.com/node_modules/foo/file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'aggregate',
          declaration: '*',
          module: 'http://foo.com/node_modules/foo/my-module.js',
          name: 'foo',
          isTypeOnly: false,
        }
      ]);
    });

    it('named', () => {
      const result = imports('import { export1 } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          module: 'foo',
          declaration: 'export1',
          name: 'export1',
          isTypeOnly: false,
        }
      ]);
    });

    it('named multiple', () => {
      const result = imports('import { export1, export2 } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          module: 'foo',
          name: 'export1',
          declaration: 'export1',
          isTypeOnly: false,
        },
        {
          kind: 'named',
          module: 'foo',
          name: 'export2',
          declaration: 'export2',
          isTypeOnly: false,
        },
      ]);
    });

    it('named alias', () => {
      const result = imports('import { export1 as alias1 } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          module: 'foo',
          name: 'alias1',
          declaration: 'export1',
          isTypeOnly: false,
        }
      ]);
    });

    it('named alias default', () => {
      const result = imports('import { export1 as default } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          module: 'foo',
          name: 'default',
          declaration: 'export1',
          isTypeOnly: false,
        }
      ]);
    });

    it('multiple and alias', () => {
      const result = imports('import { export1, export2 as alias2 } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          module: 'foo',
          name: 'export1',
          declaration: 'export1',
          isTypeOnly: false,
        },
        {
          kind: 'named',
          module: 'foo',
          name: 'alias2',
          declaration: 'export2',
          isTypeOnly: false,
        },
      ]);
    });

    it('type', () => {
      const result = imports('import type { export1 } from "foo"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'named',
          declaration: 'export1',
          module: 'foo',
          name: 'export1',
          isTypeOnly: true,
        }
      ]);
    });
  })

  describe('exports', () => {
    ['const', 'var', 'let'].forEach((kind) => {
      it(`variable ${kind}`, () => {
        const result = exports(`export ${kind} foo = 1;`, 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'js',
            name: 'foo',
            declaration: {
              module: 'file.js',
              name: 'foo'
            }
          }
        ]);
      });

      it(`multiple ${kind}s`, () => {
        const result = exports(`export ${kind} name1 = 1, name2 = 2;`, 'file.js');
        assert.deepStrictEqual(result, [
          {
            kind: 'js',
            name: 'name1',
            declaration: {
              module: 'file.js',
              name: 'name1'
            }
          },
          {
            kind: 'js',
            name: 'name2',
            declaration: {
              module: 'file.js',
              name: 'name2'
            }
          },
        ]);
      });
    });



    it('default', () => {
      const result = exports('export default foo;', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'default',
          declaration: {
            module: 'file.js',
            name: 'foo'
          }
        }
      ]);
    });

    it('named', () => {
      const result = exports('export { var1 };', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            module: 'file.js',
            name: 'var1'
          }
        }
      ]);
    });

    it('named alias', () => {
      const result = exports('export { var1 as var2 };', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            module: 'file.js',
            name: 'var2'
          }
        }
      ]);
    });

    it('named multiple', () => {
      const result = exports('export { var1, var2 };', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            module: 'file.js',
            name: 'var1'
          }
        },
        {
          kind: 'js',
          name: 'var2',
          declaration: {
            module: 'file.js',
            name: 'var2'
          }
        }
      ]);
    });

    it('export * local', () => {
      const result = exports('export * from "./local.js"', 'node_modules/file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: '*',
          declaration: {
            module: 'local.js',
            name: '*'
          }
        }
      ]);
    });

    it('export * alias local', () => {
      const result = exports('export * as foo from "./local.js"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: '*',
          declaration: {
            module: 'local.js',
            name: 'foo'
          }
        }
      ]);
    });

    it('export * alias external', () => {
      const result = exports('export * as foo from "bar"', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: '*',
          declaration: {
            package: 'bar',
            name: 'foo'
          }
        }
      ]);
    });

    it('export * external', () => {
      const result = exports('export * from "foo"', 'file.js');

      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: '*',
          declaration: {
            package: 'foo',
            name: '*'
          }
        }
      ]);
    });

    it('reexport local', () => {
      const result = exports('export { var1 } from "./foo.js";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            module: 'foo.js',
            name: 'var1'
          }
        }
      ]);
    });

    it('reexport external', () => {
      const result = exports('export { var1 } from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            package: 'foo',
            name: 'var1'
          }
        }
      ]);
    });

    it('reexport default', () => {
      const result = exports('export { default } from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'default',
          declaration: {
            package: 'foo',
            name: 'default'
          }
        }
      ]);
    });

    it('reexport external alias', () => {
      const result = exports('export { var1 as var2 } from "foo";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            package: 'foo',
            name: 'var2'
          }
        }
      ]);
    });

    it('reexport local alias', () => {
      const result = exports('export { var1 as var2 } from "./foo.js";', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'var1',
          declaration: {
            module: 'foo.js',
            name: 'var2'
          }
        }
      ]);
    });

    it('export function', () => {
      const result = exports('export function foo() {}', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'foo',
          declaration: {
            module: 'file.js',
            name: 'foo'
          }
        }
      ]);
    });

    it('export default function', () => {
      const result = exports('export default function foo() {}', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'default',
          declaration: {
            module: 'file.js',
            name: 'foo'
          }
        }
      ]);
    });

    it('export class', () => {
      const result = exports('export class Foo {}', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'Foo',
          declaration: {
            module: 'file.js',
            name: 'Foo'
          }
        }
      ]);
    });

    it('export default class', () => {
      const result = exports('export default class Foo {}', 'file.js');
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: 'default',
          declaration: {
            module: 'file.js',
            name: 'Foo'
          }
        }
      ]);
    });

    it('reexport * from url', () => {
      const result = exports(`
        export * as foo from './bar.js';
        `, 'http://foo.com/node_modules/foo/index.js');
  
      assert.deepStrictEqual(result, [
        {
          kind: 'js',
          name: '*',
          declaration: {
            module: 'http://foo.com/node_modules/foo/bar.js',
            name: 'foo'
          }
        }
      ]);
  
      const result2 = exports(`export * as foo from '../bar.js';`, 'http://foo.com/node_modules/foo/index.js');
      assert.equal(result2[0].declaration.module, 'http://foo.com/node_modules/bar.js');
    });
  
    it('reexport url', () => {
      const result = exports(`export { var1 } from './bar.js';`, 'http://foo.com/node_modules/foo/index.js');
      assert.deepStrictEqual(result[0].declaration.module, 'http://foo.com/node_modules/foo/bar.js');
    });
  });

});
