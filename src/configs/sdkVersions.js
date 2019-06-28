/* @flow */

import semver from 'semver';

// minimum SDK versions that support snack features
const minFeatureVersion = {
  MULTIPLE_FILES: '21.0.0',
  PROJECT_DEPENDENCIES: '25.0.0',
  TYPESCRIPT: '31.0.0',
  UNIMODULE_IMPORTS: '33.0.0',
};

// special casing of features that have been backported to particular SDK versions
export const versions = {
  '31.0.0': [],
  '32.0.0': [],
  '33.0.0': [],
};

export const defaultSDKVersion = '33.0.0';

export type Feature = $Keys<typeof minFeatureVersion>;
export type SDKVersion = $Keys<typeof versions>;

export const sdkSupportsFeature = (sdkVersion: SDKVersion, feature: Feature) => {
  if (!versions.hasOwnProperty(sdkVersion)) {
    return false;
  }
  const result =
    semver.gte(sdkVersion, minFeatureVersion[feature]) || versions[sdkVersion].includes(feature);
  return result;
};
