/* @flow */

import semver from 'semver';

// minimum SDK versions that support snack features
const minFeatureVersion = {
  MULTIPLE_FILES: '21.0.0', // support multiple files, communicate code changes
  // using diffs
  PROJECT_DEPENDENCIES: '25.0.0',
};

// special casing of features that have been backported to particular SDK versions
export const versions = {
  '20.0.0': [],
  '21.0.0': [],
  '22.0.0': [],
  '23.0.0': [],
  '24.0.0': [],
  '25.0.0': [],
  '26.0.0': [],
};

export const defaultSDKVersion = '20.0.0';

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
