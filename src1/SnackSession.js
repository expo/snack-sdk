/**
 * @flow
 *
 * This tag is needed to prevent PubNub from showing up in docs
 * @private
 */

import PubNub from 'pubnub';
import shortid from 'shortid';
import debounce from 'lodash/debounce';
import pull from 'lodash/pull';
import isEqual from 'lodash/isEqual';
import pickBy from 'lodash/pickBy';
import cloneDeep from 'lodash/cloneDeep';
// import difference from 'lodash/difference';
// import compact from 'lodash/compact';
import semver from 'semver';
import validate from 'validate-npm-package-name';
import fp from 'lodash/fp';
import slugid from 'slugid';

import * as DevSession from './utils/DevSession';
import { defaultSDKVersion, sdkSupportsFeature } from './configs/sdkVersions';
// import preloadedModules from './configs/preloadedModules';
import constructExperienceURL from './utils/constructExperienceURL';
import sendFileUtils from './utils/sendFileUtils';
import isModulePreloaded from './utils/isModulePreloaded';
import buildApkAsync from './utils/buildProject';
import { convertDependencyFormat } from './utils/projectDependencies';

let platform = null;
// + and - are used as delimiters in the uri, ensure they do not appear in the channel itself
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!_');

// eslint-disable-next-line no-duplicate-imports
import type { SDKVersion, Feature } from './configs/sdkVersions';
import type {
  ExpoSnackFiles,
  ExpoSnackSessionArguments,
  ExpoSubscription,
  ExpoErrorListener,
  ExpoLogListener,
  ExpoPresenceStatus,
  ExpoPresenceListener,
  ExpoPubnubError,
  ExpoError,
  ExpoPubnubDeviceLog,
  ExpoDeviceLog,
  ExpoDevice,
  ExpoStateListener,
  ExpoDependencyErrorListener,
  ExpoDependencyV2,
  ExpoDependencyResponse,
  ExpoStatusResponse,
} from './types';

type InitialState = {
  files: ExpoSnackFiles,
  name: String,
  description: String,
  dependencies: ExpoDependencyV2,
  sdkVersion: SDKVersion,
};

// type Module = {
//   name: String,
//   version: String,
// };

const PRESENCE_TIMEOUT = 600;
const HEARTBEAT_INTERVAL = 60;
const MIN_CHANNEL_LENGTH = 6;
const DEBOUNCE_INTERVAL = 1000;
const MAX_PUBNUB_SIZE = 31500;
const S3_BUCKET_URL = 'https://snack-code-uploads';

const sleep = ms => new Promise(res => setTimeout(res, ms));
const secondsToMilliseconds = seconds => seconds * 1000;

type UserT = { idToken: String, sessionSecret: String };

/**
 * Creates a snack session on the web. Multiple mobile devices can connect to the same session and each one will be updated when new code is pushed.
 * @param {object} options
 * @param {ExpoSnackFiles} options.files The initial React Native code.
 * @param {String} [options.name] Name shown if this Snack is saved.
 * @param {String} [options.description] Descriptions shown if this Snack is saved.
 * @param {String} [options.sessionId] Can be specified if you want a consistent url. This is a global namespace so make sure to use a UUID or scope it somehow if you use this.
 * @param {String} [options.sdkVersion] Determines what version of React Native is used on the mobile client. Defaults to 15.0.0 which maps to React Native 0.42.0. If you specify a different version, make sure to save that version along with the code. Code from one SDK version is not guaranteed to work on others.
 * @param {boolean} [options.verbose] Enable verbose logging mode.
 */
// host and snackId are not included in the docs since they are only used internally.
export default class SnackSession {
  files: ExpoSnackFiles;
  s3code: { [key: String]: String };
  diff: { [key: String]: String };
  s3url: { [key: String]: String };
  snackId: String;
  sdkVersion: SDKVersion;
  isVerbose: boolean;
  isStarted: boolean;
  pubnub: any;
  channel: String;
  errorListeners: Array<ExpoErrorListener> = [];
  logListeners: Array<ExpoLogListener> = [];
  presenceListeners: Array<ExpoPresenceListener> = [];
  stateListeners: Array<ExpoStateListener> = [];
  dependencyErrorListener: ExpoDependencyErrorListener;
  host: String;
  name: String;
  description: String;
  dependencies: ExpoDependencyV2; // TODO: more specific
  initialState: InitialState;
  isResolving: boolean;
  expoApiUrl: String;
  snackagerUrl: String;
  snackagerCloudfrontUrl: String;
  authorizationToken: String; // to user
  sessionSecret: String; // to user
  loadingMessage: String;
  user: UserT; // dev
  deviceId: String; // dev
  disableDevSession: boolean;

  // Public API
  constructor(options: ExpoSnackSessionArguments) {
    // TODO: check to make sure code was passed in

    this.disableDevSession = options.disableDevSession || false;
    this.isResolving = false;

    this.files = options.files;
    this.diff = {};
    this.s3url = {};
    this.s3code = {};
    this.sdkVersion = options.sdkVersion || defaultSDKVersion;
    this.isVerbose = !!options.verbose;
    this.channel = options.sessionId || shortid.generate();
    this.host = options.host || 'expo.test';
    this.expoApiUrl = 'http://0.0.0.0:3000';
    this.snackagerUrl = 'http://snackager.expo.io';
    this.snackagerCloudfrontUrl = 'https://d37p21p3n8r8ug.cloudfront.net';
    if (options.authorizationToken) {
      console.warn('authorizationToken has been deprecrated. see options.user');
    }
    if (options.sessionSecret) {
      console.warn('sessionSecret has been deprecrated. see options.user');
    }
    this.user = options.user || {};
    console.log(options.user);
    this.user = {
      ...{
        idToken: options.authorizationToken,
        sessionSecret: options.sessionSecret,
      },
      ...this.user,
    };
    console.log(this.user);
    this.deviceId = options.deviceId;

    this.snackId = options.snackId;
    this.name = options.name;
    this.description = options.description;
    this.dependencies = options.dependencies || {};
    this.initialState = cloneDeep({
      files: options.files,
      name: this.name,
      description: this.description,
      dependencies: this.dependencies,
      sdkVersion: this.sdkVersion,
    });

    if (this.channel.length < MIN_CHANNEL_LENGTH) {
      throw new Error('Please use a channel id with more entropy');
    }

    this.pubnub = new PubNub({
      publishKey: 'pub-c-2a7fd67b-333d-40db-ad2d-3255f8835f70',
      subscribeKey: 'sub-c-0b655000-d784-11e6-b950-02ee2ddab7fe',
      ssl: true,
      presenceTimeout: PRESENCE_TIMEOUT,
      heartbeatInterval: HEARTBEAT_INTERVAL,
    });

    this.pubnub.addListener({
      message: ({ message }) => {
        switch (message.type) {
          case 'CONSOLE':
            this._handleLogMessage(message);
            break;
          case 'ERROR':
            this._handleErrorMessage(message);
            break;
          case 'RESEND_CODE':
            this._handleResendCodeMessage();
            break;
          case 'STATUS_REPORT':
            this._handleResendCodeMessage();
            this._handleStatusReport(message);
            break;
          default:
            break;
        }
      },
      presence: ({ action, uuid }) => {
        let device;

        try {
          device = JSON.parse(uuid);
        } catch (e) {
          // Wasn't from the device
          return;
        }

        switch (action) {
          case 'join':
            this._handleJoinMessage(device);
            break;
          case 'timeout':
          case 'leave':
            this._handleLeaveMessage(device);
            break;
          default:
            break;
        }
      },
      status: ({ category }) => {
        switch (category) {
          case 'PNConnectedCategory':
            break;
          case 'PNNetworkDownCategory':
          case 'PNNetworkIssuesCategory':
            this._log('Lost network connection.');
            break;
          case 'PNReconnectedCategory':
            this._log('Reconnected to PubNub server.');
            break;
          case 'PNNetworkUpCategory':
            this._log('Detected network connection. Subscribing to channel.');
            this._subscribe();
            break;
          default:
            break;
        }
      },
    });
  }

  /**
   * Starts the session.
   * @returns {Promise.<void>} A promise that resolves when the session is started.
   * @function
   */
  startAsync = async (): Promise<void> => {
    this.isStarted = true;
    this._subscribe();
    this._startDevSessionAsync();
  };

  /**
   * Stops the session.
   * @returns {Promise.<void>} A promise that resolves when the session is stopped.
   * @function
   */
  stopAsync = async (): Promise<void> => {
    this.s3url = {};
    this._unsubscribe();
    this._stopDevSession();
  };

  _startDevSessionAsync = (): Promise<void> => {
    if (this.disableDevSession) {
      return new Promise(() => {});
    }
    return DevSession.startSessionAsync({
      name: this.name,
      snackId: this.snackId,
      sdkVersion: this.sdkVersion,
      channel: this.channel,
      host: this.host,
      apiUrl: this.expoApiUrl,
      user: this.user,
      deviceId: this.deviceId,
    });
  };

  _updateDevSession = (): Promise<void> => {
    // stub for future update
    return this._startDevSessionAsync();
  };

  _stopDevSession = () => {
    DevSession.stopSession();
  };

  /**
   * Returns a url that will open the current Snack session in the Expo client when 
   * opened on a phone. You can create a QR code from this link or send it to the phone 
   * in another way. See https://github.com/expo/snack-sdk/tree/master/example for how to 
   * turn this into a QR code.
   * @returns {Promise.<void>} A promise that contains the url when fulfilled.
   * @function
   */
  getUrlAsync = async (): Promise<String> => {
    const url = constructExperienceURL({
      sdkVersion: this.sdkVersion,
      snackId: this.snackId,
      channel: this.channel,
      host: this.host,
    });

    return url;
  };

  /**
   * Generates a default app.json template for the snack.
   * @returns {Object} the app.json template
   * @function
   */
  generateAppJson = (): Object => {
    const appJsonTemplate = {
      expo: {
        description: this.description,
        slug: 'bold-pretzel',
        privacy: 'unlisted',
        sdkVersion: this.sdkVersion,
        version: '1.0.0',
        orientation: 'portrait',
        primaryColor: '#cccccc',
        icon: 'https://d1wp6m56sqw74a.cloudfront.net/~assets/c9aa1be8a6a6fe81e20c3ac4106a2ebc',
        loading: {
          icon: 'https://d1wp6m56sqw74a.cloudfront.net/~assets/c9aa1be8a6a6fe81e20c3ac4106a2ebc',
          hideExponentText: false,
        },
        packagerOpts: {
          assetExts: ['ttf', 'mp4', 'otf'],
        },
        ios: {
          supportsTablet: true,
        },
        android: {
          package: "org.code.studio.applab.app_CJfhjTdo8sY_c_OjFSaMygE_OBfxkm3aG_RvFsHQE6s",
          permissions: [],
          versionCode: 1,
        },
      },
    };
    return appJsonTemplate;
  };

  /**
   * Builds an apk from the snack and returns a url to download the apk.
   * @param 
   * @returns {Promise.<String>} A promise that contains the url when fulfilled.
   * @function
   */
  getApkUrlAsync = async (
    appJson : Object
  ): Promise<String> => {
    const opts = {
      platform : 'android',
      mode: 'create',
      snack: true,
      sdkVersion: this.sdkVersion
    };
    let headers: any = {
      'Exp-ClientId': 'c-' + slugid.v4(),
      ...(this.user.idToken ? { Authorization: `Bearer ${this.user.idToken}` } : {}),
      ...(this.user.sessionSecret ? { 'Expo-Session': this.user.sessionSecret } : {})
    };
    console.log(this.user.sessionSecret);
    const { id: buildId } = await buildApkAsync(appJson, headers, opts);
    console.log("build id:" + buildId);
    const completedJob = await this.wait(buildId, appJson, headers, {});
    const artifactUrl = completedJob.artifactId
        ? `https://expo.test/artifacts/${completedJob.artifactId}`
        : completedJob.artifacts.url;

    return artifactUrl;
  };

  wait = async (buildId, appJson, headers, { timeout = 1200, interval = 60 } = {}) => {
    let time = new Date().getTime();
    await sleep(secondsToMilliseconds(interval));
    const endTime = time + secondsToMilliseconds(timeout);
    while (time <= endTime) {
      const res = await buildApkAsync(appJson, headers, {
        current: false,
        mode: 'status',
        platform : 'android',
        sdkVersion: this.sdkVersion
      });
      const job = fp.compose(
        fp.head,
        fp.filter(job => buildId && job.id === buildId),
        fp.getOr([], 'jobs')
      )(res);
      if (job.status === 'finished') {
        return job;
      } 
      time = new Date().getTime();
      await sleep(secondsToMilliseconds(interval));
    }
  };

  /**
   * Upload an asset file that will be available in each connected mobile client
   *
   * @param {Promise.<https://developer.mozilla.org/en-US/docs/Web/API/File>}
   * @returns {Promise.<String>} A promise that contains the url when fulfilled
   * @function
   */
  uploadAssetAsync = async (content: Object): Promise<String> => {
    return sendFileUtils.uploadAssetToS3(content, this.expoApiUrl);
  };

  /**
   * Push new code to each connected mobile client. Any clients that connect in the future will also get the new code.
   * @param {ExpoSnackFiles} files The new React Native code.
   * @returns {Promise.<void>} A promise that resolves when the code has been sent. Does not wait for the mobile clients to update before resolving.
   * @function
   */

  // TODO: parallelize
  sendCodeAsync = async (files: ExpoSnackFiles): Promise<void> => {
    // remove files that are no longer present in the code
    for (const key in this.files) {
      if (!files.hasOwnProperty(key)) {
        delete this.files[key];
      }
    }

    // and add or update the files in the provided code
    for (const key in files) {
      if (!this.files[key] || this.files[key] !== files[key]) {
        this.files[key] = files[key];
        if (this.files[key].type === 'ASSET' && typeof this.files[key].contents === 'object') {
          this.files[key].contents = await sendFileUtils.uploadAssetToS3(
            this.files[key].contents,
            this.expoApiUrl
          );
        }
      }
    }

    this._publish();
    this._sendStateEvent();
  };

  downloadAsync = async () => {
    const url = `${this.expoApiUrl}/--/api/v2/snack/download`;
    const save = await this.saveAsync();
    const id = save.id;
    return { url: url + '/' + id };
  };

  // TODO: error when changing SDK to an unsupported version
  setSdkVersion = (sdkVersion: SDKVersion): void => {
    if (this.sdkVersion !== sdkVersion) {
      this.sdkVersion = sdkVersion;

      this._sendStateEvent();
      this._updateDevSession();
    }
  };

  setName = (name: String): void => {
    if (this.name !== name) {
      this.name = name;

      this._updateDevSession();
      this._sendStateEvent();
    }
  };

  setUser = (user: UserT): void => {
    if (this.user !== user) {
      this.user = user;

      this._updateDevSession();
      this._sendStateEvent();
    }
  };

  setDescription = (description: String): void => {
    if (this.description !== description) {
      this.description = description;

      this._sendStateEvent();
    }
  };

  setSessionSecret = (sessionSecret: String): void => {
    console.warn('sessionSecret has been deprecrated. see options.user');
    this.setUser({ sessionSecret });

    this._updateDevSession();
    this._sendStateEvent();
  };

  setAuthorizationToken = (token: String): void => {
    console.warn('authorizationToken has been deprecrated. see options.user');
    this.setUser({ idToken: token });

    this._updateDevSession();
    this._sendStateEvent();
  };

  setDeviceId = (deviceId: String): Promise<mixed> => {
    this.deviceId = deviceId;
    return this._updateDevSession();
  };

  /**
   * Add a listener to get notified of error events.
   * @param {function(array)} callback - The callback that handles new error events. If there are no errors this will be called with an empty array. Otherwise will be called with an array of objects that each contain a `message` field.
   * @returns {object} A subscription object. Call `.remove()` on this object so stop getting new events.
   * @function
   */
  addErrorListener = (listener: ExpoErrorListener): ExpoSubscription => {
    this.errorListeners.push(listener);
    return {
      remove: () => {
        pull(this.errorListeners, listener);
      },
    };
  };

  /**
   * Add a listener to get notified of log events.
   * @param {function(object)} callback - The callback that handles new log events. Will be called with an object containing a `message` field.
   * @returns {object} A subscription object. Call `.remove()` on this object so stop getting new events.
   * @function
   */
  addLogListener = (listener: ExpoLogListener): ExpoSubscription => {
    this.logListeners.push(listener);
    return {
      remove: () => {
        pull(this.logListeners, listener);
      },
    };
  };

  /**
   * Add a listener to get notified of presence events.
   * @param {function(object)} callback - The callback that handles new presence events. Will be called with an object containing a `status` field.
   * @returns {object} A subscription object. Call `.remove()` on this object so stop getting new events.
   * @function
   */
  addPresenceListener = (listener: ExpoPresenceListener): ExpoSubscription => {
    this.presenceListeners.push(listener);
    return {
      remove: () => {
        pull(this.presenceListeners, listener);
      },
    };
  };

  addStateListener = (listener: ExpoStateListener): ExpoSubscription => {
    this.stateListeners.push(listener);
    return {
      remove: () => {
        pull(this.stateListeners, listener);
      },
    };
  };

  /**
   * Uploads the current code to Expo's servers and return a url that points to that version of the code.
   * @returns {Promise.<object>} A promise that contains an object with a `url` field when fulfilled.
   * @function
   */

  saveAsync = async (options: { isDraft: boolean } = { isDraft: false }) => {
    const url = `${this.expoApiUrl}/--/api/v2/snack/save`;
    const manifest: {
      sdkVersion: String,
      name: String,
      description: String,
      dependencies?: Object,
    } = {
      sdkVersion: this.sdkVersion,
      name: this.name,
      description: this.description,
    };

    manifest.dependencies = convertDependencyFormat(this.dependencies, false);

    const payload = {
      manifest,
      code: this.files,
      dependencies: this.dependencies,
      isDraft: options.isDraft,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          ...(this.user.idToken ? { Authorization: `Bearer ${this.user.idToken}` } : {}),
          ...(this.user.sessionSecret ? { 'Expo-Session': this.user.sessionSecret } : {}),
        },
      });
      const data = await response.json();

      if (data.id) {
        this.initialState = cloneDeep({
          sdkVersion: this.sdkVersion,
          files: this.files,
          name: this.name,
          description: this.description,
          dependencies: this.dependencies,
        });
        this._sendStateEvent();
        let fullName;
        if (data.id.match(/.*\/.*/)) {
          fullName = data.id;
        } else {
          fullName = `@snack/${data.id}`;
        }

        this._requestStatus();
        this.snackId = data.id;
        return {
          id: data.id,
          url: `https://expo.test/${fullName}`,
        };
      } else {
        throw new Error(
          (data.errors && data.errors[0] && data.errors[0].message) || 'Failed to save code'
        );
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  _requestStatus = () => {
    if (!this.pubnub) {
      return;
    }
    const message = { type: 'REQUEST_STATUS' };
    this.pubnub.publish({ channel: this.channel, message }, (status, response) => {
      if (status.error) {
        this._error(`Error requesting status: ${status.error}`);
      } else {
        this._log('Requested Status');
      }
    });
  };

  getState = () => {
    return {
      files: this.files,
      sdkVersion: this.sdkVersion,
      name: this.name,
      description: this.description,
      dependencies: this.dependencies,
      isSaved: this._isSaved(),
      isResolving: this.isResolving,
      loadingMessage: this.loadingMessage,
    };
  };

  getChannel = () => {
    return this.channel;
  };

  supportsFeature = (feature: Feature) => {
    return sdkSupportsFeature(this.sdkVersion, feature);
  };

  /**
   * Adds a given module, along with any required peer dependencies, to the current project
   * Reports errors to any registered DependendencyErrorListeners
   * @returns {Promise<void>}
   * @function
   */
  addModuleAsync = async (name: String, version: String): Promise<void> => {
    const install = async () => {
      try {
        this.dependencies = await this._addModuleAsync(name, version, this.dependencies);
      } finally {
        this._sendStateEvent();
        this._publish();
      }
    };

    return (this._lastInstall = this._lastInstall.then(install, install));
  };

  removeModuleAsync = async (name: String): Promise<void> => {
    /* $FlowFixMe */
    this.dependencies = pickBy(this.dependencies, (value, key: String) => key !== name);
    this._sendStateEvent();
    this._publish();
  };

  /**
   * Sync list of dependencies and add new peer dependencies to the current project
   * Reports errors to any registered DependendencyErrorListeners
   * @returns {Promise<void>}
   * @function
   */
  syncDependenciesAsync = async (
    modules: { [name: String]: String },
    onError: (name: String, e: Error) => mixed
  ): Promise<void> => {
    const sync = async () => {
      /* $FlowFixMe */
      let dependencies = pickBy(this.dependencies, (value, name: String) =>
        // Only keep dependencies in the modules list
        modules.hasOwnProperty(name)
      );

      // Install any new dependencies in series
      for (const name of Object.keys(modules)) {
        try {
          dependencies = await this._addModuleAsync(name, modules[name], dependencies);
        } catch (e) {
          onError(name, e);
        }
      }

      // Don't update state if nothing changed
      if (!isEqual(dependencies, this.dependencies)) {
        // Update dependencies list
        this.dependencies = dependencies;

        // Notify listeners
        this._sendStateEvent();
        this._publish();
      }
    };

    // Queue multiple syncs
    return (this._lastModuleSync = this._lastModuleSync.then(sync, sync));
  };

  // Private methods and properties
  _lastInstall: Promise<void> = Promise.resolve();
  _lastModuleSync: Promise<void> = Promise.resolve();

  _sendErrorEvent = (errors: Array<ExpoError>): void => {
    this.errorListeners.forEach(listener => listener(errors));
  };

  _sendLogEvent = (log: ExpoDeviceLog): void => {
    this.logListeners.forEach(listener => listener(log));
  };

  _sendPresenceEvent = (device: ExpoDevice, status: ExpoPresenceStatus): void => {
    this.presenceListeners.forEach(listener =>
      listener({
        device,
        status,
      })
    );
  };

  _isSaved = (): boolean => {
    const { files, name, description, dependencies, sdkVersion, initialState } = this;

    return isEqual(initialState, {
      files,
      name,
      description,
      dependencies,
      sdkVersion,
    });
  };

  _sendStateEvent = (): void => {
    this.stateListeners.forEach(listener => listener(this.getState()));
  };

  _subscribe = () => {
    this.pubnub.subscribe({
      channels: [this.channel],
      withPresence: true,
    });
  };

  _unsubscribe = () => {
    this.pubnub.unsubscribe({
      channels: [this.channel],
    });
  };

  //s3code: cache of code saved on s3
  //s3url: url to code stored on s3
  //diff: code diff sent to phone
  _handleUploadCodeAsync = async () => {
    const fileSize = [];
    await this._uploadHelper(fileSize);

    let size = sendFileUtils.calcPayloadSize(this.channel, {
      diff: this.diff,
      s3url: this.s3url,
    });

    //TODO: make this async
    // If payload size is too big, upload code to s3 (starting from largest file)
    if (size > MAX_PUBNUB_SIZE) {
      fileSize.sort((a, b) => a.size - b.size);
      while (size > MAX_PUBNUB_SIZE && fileSize.length) {
        const key = fileSize.pop().name;
        this.s3code[key] = this.files[key].contents;
        this.diff[key] = '';
        this.s3url[key] = await sendFileUtils.uploadCodeToS3(
          this.files[key].contents,
          this.expoApiUrl
        );
        size = sendFileUtils.calcPayloadSize(this.channel, {
          diff: this.diff,
          s3url: this.s3url,
        });
      }
    }
  };

  // Turn files into diff, s3url, and s3code
  _uploadHelper = async (fileSize: Array<Object>) => {
    await Promise.all(
      Object.keys(this.files).map(async key => {
        if (!this.files[key]) {
          return;
        } else if (typeof this.files[key].contents === 'object') {
          // Upload Asset to S3
          this.s3code[key] = this.files[key].contents;
          this.diff[key] = '';
          this.s3url[key] = await sendFileUtils.uploadAssetToS3(
            this.files[key].contents,
            this.expoApiUrl
          );
        } else if (this.files[key].contents.startsWith(S3_BUCKET_URL)) {
          // Asset is already uploaded
          this.diff[key] = '';
          this.s3code[key] = this.files[key].contents;
          this.s3url[key] = this.files[key].contents;
        } else if (this.s3url[key]) {
          // Send diff against code on s3
          this.diff[key] = sendFileUtils.getFileDiff(this.s3code[key], this.files[key].contents);
        } else {
          // Send all of the code in diff (file small enough not to be uploaded)
          this.diff[key] = sendFileUtils.getFileDiff('', this.files[key].contents);
        }
        fileSize.push({ name: key, size: this.diff[key].length });
      })
    );
  };

  _handleLogMessage = (pubnubEvent: ExpoPubnubDeviceLog) => {
    let payload = pubnubEvent.payload || [];

    let message = {
      device: pubnubEvent.device,
      method: pubnubEvent.method,
      message: payload.join(' '),
      arguments: payload,
    };
    this._sendLogEvent(message);
  };

  _handleErrorMessage = ({ error, device }: { error: String, device: ExpoDevice }) => {
    if (error) {
      let rawErrorObject: ExpoPubnubError = JSON.parse(error);
      let errorObject: ExpoError = {
        message: rawErrorObject.message || '',
        device,
        stack: rawErrorObject.stack,
      };

      if (rawErrorObject.line) {
        errorObject.startLine = errorObject.endLine = rawErrorObject.line;
      }

      if (rawErrorObject.column) {
        errorObject.startColumn = errorObject.endColumn = rawErrorObject.column;
      }

      if (rawErrorObject.loc) {
        errorObject.startLine = errorObject.endLine = rawErrorObject.loc.line;
        errorObject.startColumn = errorObject.endColumn = rawErrorObject.loc.column;
      }

      this._sendErrorEvent([errorObject]);
    } else {
      this._sendErrorEvent([]);
    }
  };

  _handleResendCodeMessage = () => {
    this._publishNotDebouncedAsync();
  };

  _handleStatusReport = async (message: ExpoStatusResponse) => {
    const url = `${this.expoApiUrl}/--/api/v2/snack/updateMetadata`;
    const { previewLocation, status } = message;
    const payload = {
      id: this.snackId,
      previewLocation,
      status,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.id) {
        return {
          id: data.id,
        };
      } else {
        throw new Error(
          (data.errors && data.errors[0] && data.errors[0].message) || 'Failed to save code'
        );
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  _handleJoinMessage = (device: ExpoDevice) => {
    this._publishNotDebouncedAsync();
    this._sendPresenceEvent(device, 'join');
  };

  _handleLeaveMessage = (device: ExpoDevice) => {
    this._sendPresenceEvent(device, 'leave');
  };

  _publishNotDebouncedAsync = async () => {
    if (this.loadingMessage) {
      this._sendLoadingEvent();
    } else {
      if (this.isResolving) {
        // shouldn't ever happen
        return;
      }

      const metadata = this._getAnalyticsMetadata();
      let message;
      await this._handleUploadCodeAsync();
      message = {
        type: 'CODE',
        diff: cloneDeep(this.diff),
        s3url: cloneDeep(this.s3url),
        dependencies: this.dependencies,
        metadata,
      };

      this.pubnub.publish({ channel: this.channel, message }, (status, response) => {
        if (status.error) {
          this._error(`Error publishing code: ${status.error}`);
        } else {
          this._log('Published successfully!');
        }
      });
    }
  };

  _sendLoadingEvent = () => {
    if (!this.loadingMessage) {
      return;
    }

    const payload = { type: 'LOADING_MESSAGE', message: this.loadingMessage };
    if (!this.pubnub) {
      return;
    }
    this.pubnub.publish({ channel: this.channel, message: payload }, (status, response) => {
      if (status.error) {
        this._error(`Error publishing loading event: ${status.error}`);
      } else {
        this._log(`Sent loading event with message: ${this.loadingMessage || ''}`);
      }
    });
  };

  _getAnalyticsMetadata = () => {
    let metadata = {
      expoSdkVersion: this.sdkVersion,
    };

    try {
      metadata = {
        ...metadata,
        webSnackSdkVersion: require('../package.json').version,
      };
    } catch (e) {
      // Probably couldn't require version
    }

    if (typeof window !== 'undefined') {
      metadata = {
        ...metadata,
        webHostname: window.location.hostname,
      };
    }

    if (typeof navigator !== 'undefined') {
      if (!platform) {
        try {
          platform = require('platform');
        } catch (e) {
          // platform has side effects. should be fine but try/catch just to be safe.
        }
      }

      if (platform) {
        const platformInfo = platform.parse(navigator.userAgent);
        const os = platformInfo.os || {};
        metadata = {
          ...metadata,
          webOSArchitecture: os.architecture,
          webOSFamily: os.family,
          webOSVersion: os.version,
          webLayoutEngine: platformInfo.layout,
          webDeviceType: platformInfo.product,
          webBrowser: platformInfo.name,
          webBrowserVersion: platformInfo.version,
          webDescription: platformInfo.description,
        };
      }
    }

    return metadata;
  };

  _publish = debounce(this._publishNotDebouncedAsync, DEBOUNCE_INTERVAL);

  _error = (message: String) => {
    if (this.isVerbose) {
      console.error(message);
    }
  };

  _log = (message: String) => {
    if (this.isVerbose) {
      console.log(message);
    }
  };

  // ARBITRARY NPM MODULES

  _tryFetchDependencyAsync = async (
    name: String,
    version: String
  ): Promise<ExpoDependencyResponse> => {
    let count = 0;
    let data;

    while (data ? data.pending : true) {
      if (count > 30) {
        throw new Error('Request timed out');
      }

      count++;

      this._log(
        `Requesting dependency: ${this.snackagerUrl}/bundle/${name}${
          version ? `@${version}` : ''
        }?platforms=ios,android`
      );
      const res = await fetch(
        `${this.snackagerUrl}/bundle/${name}${version ? `@${version}` : ''}?platforms=ios,android`
      );

      if (res.status === 200) {
        data = await res.json();

        if (data.pending) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } else {
        const error = await res.text();
        throw new Error(error);
      }
    }

    // $FlowFixMe
    return (data: ExpoDependencyResponse);
  };

  _dependencyPromises: { [id: String]: Promise<ExpoDependencyResponse> } = {};

  _maybeFetchDependencyAsync = async (
    name: String,
    version: String
  ): Promise<ExpoDependencyResponse> => {
    const id = `${name}-${version}`;
    const match = /^(?:@([^/?]+)\/)?([^@/?]+)(?:\/([^@]+))?/.exec(name);

    if (!match) {
      return Promise.reject(new Error(`Failed to parse the package name: '${name}'`));
    }

    const fullName = (match[1] ? `@${match[1]}/` : '') + match[2];

    const validPackage = validate(fullName).validForOldPackages;
    const validVersion = version && version !== 'latest' ? semver.validRange(version) : true;
    if (!validPackage || !validVersion) {
      const validationError = !validPackage
        ? new Error(`${fullName} is not a valid package`)
        : new Error(`Invalid version for ${fullName}@${version}`);
      return Promise.reject(validationError);
    }

    const result = this._dependencyPromises[id] || this._tryFetchDependencyAsync(name, version);

    // Cache the promise to avoid sending same request more than once
    this._dependencyPromises[id] = result;

    // Remove the promise from cache if it was rejected
    // $FlowFixMe We are removing a key
    result.catch(() => (this._dependencyPromises[id] = null));

    return result;
  };

  _checkS3ForDepencencyAsync = async (name: String, version: String) => {
    const hash = (name + '@' + version).replace(/\//g, '~');
    const promises = ['ios', 'android'].map(async platform => {
      try {
        let url = `${this.snackagerCloudfrontUrl}/${encodeURIComponent(hash)}-${platform}/.done`;

        const res = await fetch(url);
        return res.status < 400;
      } catch (e) {
        return false;
      }
    });

    let results = await Promise.all(promises);
    return results.every(result => result);
  };

  _addModuleAsync = async (name: String, version: ?String, previous: ExpoDependencyV2) => {
    if (isModulePreloaded(name, this.sdkVersion)) {
      throw new Error(`Module is already preloaded: ${name}`);
    }

    // Check if the dependency is already installed
    const dependency = previous[name];

    if (dependency && (dependency.version === version || dependency.resolved === version)) {
      return previous;
    }

    const loadingMessage = `Resolving module: ${version ? `${name}@${version}` : name}`;

    this.isResolving = true;
    this.loadingMessage = loadingMessage;
    this._sendLoadingEvent();
    this._sendStateEvent();

    this._log(loadingMessage);

    try {
      const result = await this._maybeFetchDependencyAsync(name, version || 'latest');
      const peerDependencies = result.dependencies;

      let dependencies = {
        ...previous,
        [result.name]: {
          version: version || result.version,
          resolved: result.version,
          peerDependencies: peerDependencies
            ? Object.keys(peerDependencies).reduce((acc, curr) => {
                acc[curr] = {
                  // $FlowFixMe We want the whole try block to fail if result was rejected
                  version: peerDependencies[curr],
                };
                return acc;
              }, {})
            : {},
        },
      };

      if (peerDependencies) {
        this._log(`Resolving peer dependencies: ${JSON.Stringify(peerDependencies)}`);

        for (const name of Object.keys(peerDependencies)) {
          // Don't install peer dep if already installed
          // We don't check for version as the version specified in top-level dep takes precedence
          if (isModulePreloaded(name, this.sdkVersion) || dependencies[name]) {
            continue;
          }

          dependencies = await this._addModuleAsync(
            name,
            peerDependencies[name] || 'latest',
            dependencies
          );
        }
      }

      return dependencies;
    } catch (e) {
      this._error(`Error resolving module: ${e.message}`);

      if (this.dependencyErrorListener) {
        this.dependencyErrorListener(`Error fetching ${name}@${version || 'latest'}: ${e.message}`);
      }

      throw e;
    } finally {
      this.isResolving = false;
      this.loadingMessage = '';
      this._sendLoadingEvent();
      this._sendStateEvent();
    }
  };
}
