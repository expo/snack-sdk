/**
 * @flow
 */

import type { SDKVersion } from './configs/sdkVersions';

// TODO: unify with snack model
type requiredSnackFileAttributes = {
  contents: string,
  type: 'ASSET' | 'CODE',
};

type ExpoRequiredSnackFiles = {
  'app.js': requiredSnackFileAttributes,
};

export type ExpoSnackFiles = {
  ...$Exact<ExpoRequiredSnackFiles>,
  ...{ [string]: requiredSnackFileAttributes },
};

export type ExpoSnackSessionArguments = {
  files: ExpoSnackFiles,
  sdkVersion?: SDKVersion,
  verbose?: boolean,
  sessionId?: string, // Will be randomly generated if not provided
  host?: string,
  snackId?: string,
  name?: string,
  description?: string,
  dependencies?: any, // TODO: more specific
  authorizationToken?: string,
};

export type ExpoSubscription = {
  remove: () => void,
};

// Called with empty array if errors have been resolved
export type ExpoErrorListener = (errors: Array<ExpoError>) => void;

export type ExpoLogListener = (log: ExpoDeviceLog) => void;

export type ExpoPresenceListener = (event: ExpoPresenceEvent) => void;

export type ExpoStateListener = (event: ExpoStateEvent) => void;

export type ExpoDependencyErrorListener = (message: string) => void;

export type ExpoErrorLocation = {
  line: number,
  column: number,
};

export type ExpoPubnubError = {
  device?: ExpoDevice,
  loc?: ExpoErrorLocation,
  message?: string,
  stack?: string,
  line?: number,
  column?: number,
};

export type ExpoError = {
  device?: ExpoDevice,
  startLine?: number,
  endLine?: number,
  startColumn?: number,
  endColumn?: number,
  message: string,
  stack?: string,
};

export type ExpoPubnubDeviceLog = {
  device: ExpoDevice,
  method: 'log' | 'error' | 'warn',
  payload: Array<any>,
};

// `console.log`, `console.warn`, `console.error`
export type ExpoDeviceLog = {
  device: ExpoDevice,
  method: 'log' | 'warn' | 'error',
  message: string,
  arguments: any, // the raw fields that were passed to the console.* call
};

export type ExpoDevice = {
  name: string,
  id: string,
  platform: string,
};

export type ExpoPresenceStatus = 'join' | 'leave';

export type ExpoPresenceEvent = {
  device: ExpoDevice,
  status: ExpoPresenceStatus,
};

export type ExpoStateEvent = {
  files: ExpoSnackFiles,
  sdkVersion: SDKVersion,
  name: ?string,
  description: ?string,
  dependencies: any, // TODO: more specific
  isSaved: boolean,
  isResolving: boolean,
};

export type ExpoDependencyV1 = {
  [name: string]: string,
};

export type ExpoDependencyV2 = {
  [name: string]: {
    version: string, // currently specific version, can expand to semver range, git url, snack url, js file on the web
    resolution?: string, // result of snackager processing the resource
    // isPeerDep: false, // may need to have importing snacks make sense
    isUserSpecified: boolean, // can adjust version to resolve peerDeps if false
    peerDependencies?: ExpoDependencyV1,
  },
};
