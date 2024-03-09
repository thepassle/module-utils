- declarations
  - variables
  - functions
  - classes

- For unused exports, we also need to correctly handle `import * as foo from 'foo'`, and mark every export as being imported

```js
// name = export1, because that _is_ the NAMED export
// declaration = alias1, because thats the local declaration
import { export1 as alias1 } from "foo";
```

Maybe instead of:
```js
{
  kind: 'named',
  module: 'foo',
  name: 'alias1',
  isTypeOnly: false,
}
```

we should output something similar to `Export`:
```js
{
  kind: 'named',
  module: 'foo',
  name: 'export1',
  declaration: 'alias1',
  isTypeOnly: false,
}
```

Because otherwise we can't match it correctly to an export? The export will have as `name: 'alias1'`, but somewhere in an export it will be `name: 'export1'`. I should be able to add a failing test for this in module-graph

e.g.:
```js
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
```