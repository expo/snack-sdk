/**
 * @flow
 */

import 'babel-polyfill';
import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}

module.exports = {
  get SnackSession() {
    return require('./SnackSession').default;
  },
  get SDKVersions() {
    return require('./configs/sdkVersions');
  },
  get SnackTypes() {
    return require('./types');
  },
};
