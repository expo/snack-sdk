// @flow

import constructExperienceURL from './constructExperienceURL';
import type { SDKVersion } from '../configs/sdkVersions';

const UPDATE_FREQUENCY_SECS = 40;
let updateLoop: any  = null;

type SessionOptions = {|
  name: ?string,
  snackId: ?string,
  sdkVersion: SDKVersion,
  channel: string,
  host: string,
  user: { idToken?: ?string, sessionSecret?: ?string },
  deviceId?: ?string,
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

    let apiEndpoint = 'https://expo.io/--/api/v2/development-sessions/notify-alive';
    if (process.env.NODE_ENV !== 'production') {
      apiEndpoint = '/--/api/v2/development-sessions/notify-alive';
    }

    let displayName = name || 'Unnamed Snack';

    await authenticatedPostAsync(user, deviceId)(apiEndpoint, {
      data: {
        session: {
          description: snackId ? `${displayName} (${snackId})` : displayName,
          hostname: 'snack',
          config: {},
          url,
          source: 'snack',
        },
      },
    });
  } catch (e) {
    // TODO: do nothing if request fails?
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
