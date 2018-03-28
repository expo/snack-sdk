// @flow

import constructExperienceURL from './constructExperienceURL';
import type { SDKVersion } from '../config/sdkVersions';

const UPDATE_FREQUENCY_SECS = 40;
let updateLoop = null;

type SessionOptions = {|
  name: string,
  snackId: ?string,
  sdkVersion: SDKVersion,
  channel: string,
  host: string,
  user: { idToken?: ?string, sessionSecret?: ?string },
  deviceId: string,
|};

export async function startSession(options: SessionOptions): Promise<void> {
  stopSession();
  sendKeepAliveAsync(options);
  updateLoop = setInterval(() => {
    sendKeepAliveAsync(options);
  }, UPDATE_FREQUENCY_SECS * 1000);
}

export function stopSession() {
  clearInterval(updateLoop);
  updateLoop = null;
}

export async function sendKeepAliveAsync({
  name,
  snackId,
  sdkVersion,
  channel,
  host,
  user,
  deviceId,
}: SessionOptions): Promise<void> {
  // TODO(brentvatne) if the user has configured device ids, then notify for those too
  if (!user) {
    return;
  }

  try {
    let url = constructExperienceURL({ snackId, sdkVersion, channel, host });
    console.log(url);
    console.log('posting');

    // TODO(brentvatne) don't hardcode the base url
    await authenticatedPostAsync(
      user,
      deviceId
    )('https://staging.expo.io/--/api/v2/development-sessions/notify-alive', {
      data: {
        session: {
          description: snackId ? `${name} (${snackId})` : name || 'Unnamed Snack',
          hostname: 'snack',
          config: {},
          url,
          source: 'snack',
        },
      },
    });
  } catch (e) {
    console.log('error posting');
    console.log(e);
    // do nothing?
  }
}

const authenticatedPostAsync = (user, deviceId) => (url, body) => {
  // TODO: do something with deviceId

  const { idToken, sessionSecret } = user;

  let headers = {
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...(sessionSecret ? { 'Expo-Session': sessionSecret } : {}),
    'Content-Type': 'application/json',
  };

  let optionsWithAuth = {
    method: 'post',
    body: JSON.stringify(body),
    headers,
  };

  return fetch(url, optionsWithAuth);
};
