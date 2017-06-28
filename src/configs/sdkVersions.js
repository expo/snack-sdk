/* @flow */

export const versions = {
  '14.0.0': true,
  '15.0.0': true,
  '16.0.0': true,
  '17.0.0': true,
  '18.0.0': true,
};

export const defaultSDKVersion = '15.0.0';

export type SDKVersion = $Keys<typeof versions>;
