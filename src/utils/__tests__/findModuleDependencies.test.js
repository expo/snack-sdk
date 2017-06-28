/* eslint-env jest */

import moduleUtils from '../findModuleDependencies';

it('finds all imported modules', () => {
  const code = `
    import base64 from 'base64'; // 1.2.3
    import debounce from 'lodash/debounce'; // 2.3.4
    import { connect } from 'react-redux';
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toMatchSnapshot();
});

it('finds all required modules', () => {
  const code = `
    const base64 = require('base64'); // 1.2.3
    const debounce = require('lodash/debounce'); // 2.3.4
    const { connect } = require('react-redux');
  `;

  const dependencies = moduleUtils.findModuleDependencies(code);

  expect(dependencies).toMatchSnapshot();
});

it('writes versions for imported modules', () => {
  const code = `
    import base64 from 'base64';
    import debounce from 'lodash/debounce';
    import { connect } from 'react-redux';
  `;

  const modules = {
    base64: {
      name: 'base64',
      version: '1.2.3',
    },
    'lodash/debounce': {
      name: 'lodash/debounce',
      version: '2.3.4',
    },
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
    base64: {
      name: 'base64',
      version: '1.2.3',
    },
    'lodash/debounce': {
      name: 'lodash/debounce',
      version: '2.3.4',
    },
  };

  const dependencies = moduleUtils.writeModuleVersions(code, modules);

  expect(dependencies).toMatchSnapshot();
});
