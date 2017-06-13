# snack-sdk
The Expo Snack SDK. Use this to create a custom web interface for https://snack.expo.io/.

### Creating a new session
```javascript
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
```javascript
let url = await session.getUrlAsync();
```
This url will open the current Snack Session in the Expo client when opened on a phone. You can create a QR code from this link or send it to the phone in another way. See `example/` for how to turn this into a QR code.

### Updating the code
```javascript
await session.sendCodeAsync(code: String);
```
This will push the new code to each connected mobile client. Any new clients that connect will also get the new code.

### Saving the code to Expo's servers
```javascript
let saveResult = await session.saveAsync();

console.log(saveResult);
// This will print: `{"id":"abc123","url":"https://expo.io/@snack/abc123"}`
```
This will upload the current code to Expo's servers and return a url that points to that version of the code.

### Listening for events
Here are the Flow types for the error, log, and presence listeners:
```javascript
type SnackSession = {
  addErrorListener: (listener: ExpoErrorListener) => ExpoSubscription,
  addLogListener: (listener: ExpoLogListener) => ExpoSubscription,
  addPresenceListener: (listener: ExpoPresenceListener) => ExpoSubscription,
};

type ExpoSubscription = {
  remove: () => void,
};

// Called with empty array if errors have been resolved
type ExpoErrorListener = (errors: Array<ExpoError>) => void;

type ExpoLogListener = (log: ExpoDeviceLog) => void;

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

Each of these listeners is optional. Here's an example of using a log listener:
```javascript
let logSubscription = session.addLogListener((log) => {
  console.log(JSON.stringify(log));

  // This will print: `{"device":{"id":"b9384faf-504f-4c41-a7ab-6344f0102456","name":"SM-G930U"},"method":"log","message":"hello!","arguments":["hello!"]}`
  // on the web if `console.log('hello!')` is run from the code on the phone.
});

// later on...
logSubscription.remove();
// future `console.log`s on the phone will not trigger the listener
```

An error listener:
```javascript
let errorSubscription = session.addErrorListener((error) => {
  console.log(JSON.stringify(error));

  // This will print:
  // `[]`
  // when there is no error and
  // `[{"message":"unknown: Unexpected token (7:7)...","endLine":7,"startLine":7,"endColumn":7,"startColumn":7}]`
  // when there is an error. The `message` field is truncated in this document.
});

// later on...
errorSubscription.remove();
```

A presence listener:
```javascript
let presenceSubscription = session.addPresenceListener((presence) => {
  console.log(JSON.stringify(presence));

  // This will print:
  // `{"device":{"id":"b9384faf-504f-4c41-a7ab-6344f0102456","name":"SM-G930U"},"status":"join"}`
  // when a device is connected and
  // `{"device":{"id":"b9384faf-504f-4c41-a7ab-6344f0102456","name":"SM-G930U"},"status":"leave"}`
  // when a device disconnects.
});

// later on...
presenceSubscription.remove();
```

Please read the Flow types above for all possible fields returned in these listeners.

### Stopping the session
```javascript
await session.stopAsync();
```
This will shut down the PunNub connection.
