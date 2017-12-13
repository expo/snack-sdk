/* @flow */
import semver from 'semver';

// minimum SDK versions that support snack features
const minFeatureVersion = {
  ARBITRARY_IMPORTS: '19.0.0', // use snackager to fetch resources
  MULTIPLE_FILES: '21.0.0', // support multiple files, communicate code changes
  // using diffs
};

// special casing of features that have been backported to particular SDK versions
export const versions = {
  '18.0.0': [],
  '19.0.0': [],
  '20.0.0': [],
  '21.0.0': [],
  '22.0.0': [],
  '23.0.0': [],
  '24.0.0': [],
};

export const defaultSDKVersion = '18.0.0';

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
