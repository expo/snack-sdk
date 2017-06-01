# snack-sdk
The Expo Snack SDK. Use this to create a custom web interface for https://snack.expo.io/.

### Creating a new session
```
import { SnackSession } from 'snack-sdk';

let session = new SnackSession({
  code: String,
  sdkVersion?: SDKVersion,
  sessionId?: string,
  verbose?: boolean,
});

await session.startAsync();
```

`code` is the initial React Native code.

`sdkVersion` determines what version of React Native is used on the mobile client. Defaults to `15.0.0` which maps to React Native 0.42.0. If you specify a different version, make sure to save that version along with the code. Code from one SDK version is not guaranteed to work on others.

`sessionId` can be specified if you want a consistent url. This is a global namespace so make sure to use a UUID or scope it somehow if you use this.

### Getting the URL for the mobile client
```
let url = await session.getUrlAsync();
```
This url will open the current Snack Session in the Expo client when opened on a phone. You can create a QR code from this link or send it to the phone in another way. See `example/` for how to turn this into a QR code.

### Updating the code
```
await session.sendCodeAsync(code: String);
```
This will push the new code to each connected mobile client. Any new clients that connect will also get the new code.


### Listening for events
Here are the Flow types for the error, log, and presence listeners:
```
type SnackSession = {
  addErrorListener: (listener: ExpoErrorListener) => ExpoSubscription,
  addLogListener: (listener: ExpoLogListener) => ExpoSubscription,
  addPresenceListener: (listener: ExpoPresenceListener) => ExpoSubscription,
};

export type ExpoSubscription = {
  remove: () => void,
};

// Called with empty array if errors have been resolved
type ExpoErrorListener = (errors: Array<ExpoError>) => void;

type ExpoLogListener = (log: ExpoDeviceLog) => void;

type ExpoPresenceStatus = | “join” | “leave”

type ExpoPresenceListener = (event: ExpoPresenceEvent) => void;

type ExpoError = {
  device?: ExpoDevice,
  startLine?: number,
  endLine?: number,
  startColumn?: number,
  endColumn?: number,
  message: string,
  stack?: string,
};

// `console.log`, `console.warn`, `console.error`
type ExpoDeviceLog = {
  device: ExpoDevice,
  method: 'log' | 'warn' | 'error',
  message: string,
  arguments: any, // the raw fields that were passed to the console.* call
};

type ExpoDevice = {
  name: string,
  id: string,
};

type ExpoPresenceStatus = 'join' | 'leave';

type ExpoPresenceEvent = {
  device: ExpoDevice,
  status: ExpoPresenceStatus,
};
```

Each of these listeners is optional.

### Stopping the session
```
await session.stopAsync();
```
This will shut down the PunNub connection.
