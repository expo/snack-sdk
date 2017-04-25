/**
 * @flow
 */

if (process.env.NODE_ENV !== 'production') {
  // require('source-map-support').install();
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
