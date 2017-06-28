/* eslint-env jest */

import { parse, print } from 'recast';
import insertImport from '../insertImport';
import * as babylon from 'babylon';

import config from '../../configs/babylon';

const parser = {
  parse: (code: string) => babylon.parse(code, config),
};

it('inserts default import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'lodash',
    from: 'lodash',
    default: true,
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('inserts named import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'Components',
    from: 'exponent',
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('inserts empty import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    from: 'babel/polyfill',
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('inserts default import for existing module', () => {
  const code = `
    import { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'React',
    from: 'react',
    default: true,
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('inserts named import for existing module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'Component',
    from: 'react',
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('does not insert duplicate default import for existing module', () => {
  const code = `
    import React, { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'React',
    from: 'react',
    default: true,
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('does not insert duplicate named import for existing module', () => {
  const code = `
    import { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    name: 'Component',
    from: 'react',
  });

  expect(print(ast).code).toMatchSnapshot();
});

it('does not insert duplicate empty import for new module', () => {
  const code = `
    import { Component } from 'react';
    import 'babel/polyfill';

    export default () => <div>Hello world</div>;
  `;

  const ast = parse(code, { parser });

  insertImport(ast, {
    from: 'babel/polyfill',
  });

  expect(print(ast).code).toMatchSnapshot();
});
