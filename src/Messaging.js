/* @flow */

import PubNub from 'pubnub';
import type { ExpoMessaging, ExpoMessagingListeners, ExpoWebPlayer, Transport } from './types';

type Options = {
  player?: ExpoWebPlayer,
};

const PRESENCE_TIMEOUT = 600;
const HEARTBEAT_INTERVAL = 60;

export default function createMessaging(options: Options): ExpoMessaging {
  const pubnub = new PubNub({
    publishKey: 'pub-c-2a7fd67b-333d-40db-ad2d-3255f8835f70',
    subscribeKey: 'sub-c-0b655000-d784-11e6-b950-02ee2ddab7fe',
    ssl: true,
    presenceTimeout: PRESENCE_TIMEOUT,
    heartbeatInterval: HEARTBEAT_INTERVAL,
  });

  return {
    addListener: (listener: ExpoMessagingListeners) => {
      pubnub.addListener(listener);
      options.player &&
        options.player.listen(data => {
          if (typeof data !== 'string') {
            return;
          }

          try {
            const message = JSON.parse(data);

            switch (message.type) {
              case 'MESSAGE':
                listener.message(message);
                break;
              case 'CONNECT':
                listener.presence({ action: 'join', uuid: JSON.stringify(message.device) });
                break;
              case 'DISCONNECT':
                listener.presence({ action: 'leave', uuid: JSON.stringify(message.device) });
                break;
            }
          } catch (e) {
            console.log('Failed to parse data', e, data);
          }
        });
    },
    publish: (channel, message, transports: Transport[]) => {
      const promises = [];

      if (transports.includes('postMessage')) {
        options.player && options.player.publish(JSON.stringify(message));
      }

      if (transports.includes('PubNub')) {
        promises.push(
          new Promise((resolve, reject) =>
            pubnub.publish(
              {
                channel,
                message,
              },
              (status, response) => {
                if (status.error) {
                  reject(status.errorData);
                } else {
                  resolve(response);
                }
              }
            )
          )
        );
      }

      return Promise.all(promises);
    },
    subscribe: channel => {
      options.player && options.player.subscribe();
      pubnub.subscribe({
        channels: [channel],
        withPresence: true,
      });
    },
    unsubscribe: channel => {
      options.player && options.player.unsubscribe();
      pubnub.unsubscribe({
        channels: [channel],
      });
    },
  };
}
