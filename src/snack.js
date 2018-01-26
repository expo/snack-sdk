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
  get babylonConfig() {
    return require('./configs/babylon').default;
  },
  get insertImport() {
    return require('./utils/insertImport').default;
  },
  get findAndWriteDependencyVersions() {
    return require('./utils/findAndWriteDependencyVersions').default;
  },
  get dependencyUtils() {
    return require('./utils/projectDependencies');
  },
};
