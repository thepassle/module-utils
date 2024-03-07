# module-utils

## `analyze`

Convenience function to easily analyze source code

```js
import { analyze } from '@thepassle/module-utils';

let hasVariables = false;

analyze(source, filePath, [
  {
    name: "analyze-exports",
    start: ({ ts, source, filePath, ast, context }) => {},
    analyze: ({ ts, node, source, filePath, ast, context }) => {
      if (ts.isVariableDeclaration(node)) {
        hasVariables = true;
      }
    },
    end: ({ ts, source, filePath, ast, context }) => {},
  }
]);

hasVariables; // true
```

## `imports`/`exports`

Analyzes import and export statements in the code.

```js
import { imports } from '@thepassle/module-utils/imports.js';

const [result] = imports('import foo from "./foo.js";', 'file.js');
console.log(result);

// {
//   kind: 'default',
//   name: 'foo',
//   module: 'foo.js',
//   isTypeOnly: false,
//   attributes: []
// }
```

```js
import { exports } from '@thepassle/module-utils/exports.js';

const [result] = exports('export default foo;', 'file.js');
console.log(result);

// {
//   kind: 'js',
//   name: 'default',
//   declaration: {
//     module: 'file.js',
//     name: 'foo'
//   }
// }
```

See the test cases for all supported import/exports.

## Utils

```js
import {
  has,
  toUnix,
  isBareModuleSpecifier,
  isScopedPackage
} from '@thepassle/module-utils/utils.js';
```