/* eslint-env jest */

import moduleUtils from '../findAndWriteDependencyVersions';

it('finds all imported modules', () => {
  const code = `
    import base64 from 'base64'; // 1.2.3
    import debounce from 'lodash/debounce'; // 2.3.4
    import { connect } from 'react-redux';
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toEqual({
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
    'react-redux': null,
  });
});

it('finds all required modules', () => {
  const code = `
    const base64 = require('base64'); // 1.2.3
    const debounce = require('lodash/debounce'); // 2.3.4
    const { connect } = require('react-redux');
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toEqual({
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
    'react-redux': null,
  });
});

it('finds all required modules with backticks', () => {
  const code = `
    const base64 = require(\`base64\`); // 1.2.3
    const debounce = require(\`lodash/debounce\`); // 2.3.4
    const { connect } = require(\`react-redux\`);
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toEqual({
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
    'react-redux': null,
  });
});

it("doesn't parse non-static and invalid requires", () => {
  const code = `
    const base64 = require();
    const debounce = require('debounce', null); // 2.3.4
    const moment = require(\`\${name}\`);
    const leftpad = require(\`left-\${name}\`);
    const core = require('/core');
    const promise = require('promise\\nme');
    const bluebird = require(\`blue
      bird
    \`);
    const { connect } = require(10);
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toEqual({});
});

it('writes versions for imported modules', () => {
  const code = `
    import base64 from 'base64';
    import debounce from 'lodash/debounce';
    import { connect } from 'react-redux';
  `;

  const modules = {
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
  };

  const dependencies = moduleUtils.writeModuleVersions(code, modules);

  expect(dependencies).toMatchSnapshot();
});

it('writes versions for required modules', () => {
  const code = `
    const base64 = require('base64');
    const debounce = require('lodash/debounce');
    const { connect } = require('react-redux');
  `;

  const modules = {
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
  };

  const dependencies = moduleUtils.writeModuleVersions(code, modules);

  expect(dependencies).toMatchSnapshot();
});

it('writes versions for required modules with backticks', () => {
  const code = `
    const base64 = require(\`base64\`);
    const debounce = require(\`lodash/debounce\`);
    const { connect } = require(\`react-redux\`);
  `;

  const modules = {
    base64: '1.2.3',
    'lodash/debounce': '2.3.4',
  };

  const dependencies = moduleUtils.writeModuleVersions(code, modules);

  expect(dependencies).toMatchSnapshot();
});
