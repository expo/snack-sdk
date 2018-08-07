/* eslint-env jest */

import insertImports from '../insertImports';

it('inserts default import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'lodash',
        from: 'lodash',
        default: true,
      },
    ])
  ).toMatchSnapshot();
});

it('inserts named import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'Components',
        from: 'exponent',
      },
    ])
  ).toMatchSnapshot();
});

it('inserts empty import for new module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        from: 'babel/polyfill',
      },
    ])
  ).toMatchSnapshot();
});

it('inserts default import for existing module', () => {
  const code = `
    import { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'React',
        from: 'react',
        default: true,
      },
    ])
  ).toMatchSnapshot();
});

it('inserts named import for existing module', () => {
  const code = `
    import React from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'Component',
        from: 'react',
      },
    ])
  ).toMatchSnapshot();
});

it('does not insert duplicate default import for existing module', () => {
  const code = `
    import React, { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'React',
        from: 'react',
        default: true,
      },
    ])
  ).toMatchSnapshot();
});

it('does not insert duplicate named import for existing module', () => {
  const code = `
    import { Component } from 'react';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        name: 'Component',
        from: 'react',
      },
    ])
  ).toMatchSnapshot();
});

it('does not insert duplicate empty import for new module', () => {
  const code = `
    import { Component } from 'react';
    import 'babel/polyfill';

    export default () => <div>Hello world</div>;
  `;

  expect(
    insertImports(code, [
      {
        from: 'babel/polyfill',
      },
    ])
  ).toMatchSnapshot();
});
