// @flow

import constructExperienceURL from './constructExperienceURL';
import type { SDKVersion } from '../configs/sdkVersions';

const UPDATE_FREQUENCY_SECS = 40;
let updateLoop: any = null;

type SessionOptions = {|
  name: ?string,
  snackId: ?string,
  sdkVersion: SDKVersion,
  channel: string,
  host: string,
  user: { idToken?: ?string, sessionSecret?: ?string },
  deviceId?: ?string,
|};

export async function startSessionAsync(options: SessionOptions): Promise<void> {
  stopSession();

  updateLoop = setInterval(() => {
    sendKeepAliveAsync(options);
  }, UPDATE_FREQUENCY_SECS * 1000);

  return sendKeepAliveAsync(options);
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

  let url = constructExperienceURL({ snackId, sdkVersion, channel, host });

  let apiServer = process.env.API_SERVER_URL || 'https://expo.io';
  let apiEndpoint = `${apiServer}//--/api/v2/development-sessions/notify-alive`;

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
}

const authenticatedPostAsync = (user, deviceId) => async (url, body) => {
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

  let endpoint = url;

  if (deviceId) {
    endpoint = `${url}?deviceId=${deviceId}`;
  }

  const response = await fetch(endpoint, optionsWithAuth);

  if (!response.ok) {
    throw Error(response.statusText);
  }

  return response;
};
