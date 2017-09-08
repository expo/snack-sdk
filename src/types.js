/**
 * @flow
 */

import type { SDKVersion } from './configs/sdkVersions';

export type ExpoSnackSessionArguments = {
  code: string,
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
  code: string,
  sdkVersion: SDKVersion,
  name: string,
  description: string,
  dependencies: any, // TODO: more specific
  isSaved: boolean,
  isResolving: boolean,
};
