'use strict';

import { defaultSDKVersion } from '../configs/sdkVersions';

jest.mock('pubnub');

const SnackSession = require('../SnackSession').default;

const INITIAL_CODE = 'code';
const NEW_CODE = 'new code!';
const NEW_CODE_2 = 'new code 2!';
const NEW_CODE_3 = 'new code 3!';
const SESSION_ID = '123456';
const SNACK_ID = 'abcdef';
const ORIGINAL_DATE_NOW = Date.now;
const ERROR_OBJECT = {
  message: `Can't find variable: BLAH`,
  line: 57,
  column: 13,
  stack: 'huge stack',
};
const ERROR_MESSAGE = {
  message: {
    type: 'ERROR',
    error: JSON.stringify(ERROR_OBJECT),
    device: {
      id: 'b070e2d7-6218-40d5-8cc7-2879c28012b2',
      name: 'SM-G930U',
    },
  },
};

async function startDefaultSessionAsync(args = {}) {
  let session = new SnackSession({
    code: INITIAL_CODE,
    sessionId: SESSION_ID,
    ...args,
  });
  await session.startAsync();
  return session;
}

function startMockingDate() {
  jest.useFakeTimers();
  Date.now = jest.genMockFunction().mockReturnValue(0);
}

function setMockDate(date) {
  Date.now = jest.genMockFunction().mockReturnValue(date);
  jest.runAllTimers();
}

function stopMockingDate() {
  jest.useRealTimers();
  Date.now = ORIGINAL_DATE_NOW;
}

describe('when a sessionId is specified', () => {
  it('connects to the correct channel', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
      sessionId: SESSION_ID,
    });
    await session.startAsync();
    expect(session.pubnub.subscribe.mock.calls[0][0]).toEqual({
      channels: [SESSION_ID],
      withPresence: true,
    });
  });

  function createNewSessionWithShortId() {
    // eslint-disable-next-line no-new
    new SnackSession({
      code: INITIAL_CODE,
      sessionId: '123',
    });
  }
  it('errors if sessionId is too short', async () => {
    expect(createNewSessionWithShortId).toThrow();
  });

  it('generates a sessionId if none is provided', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
    });
    expect(session.channel).toBeDefined();
  });
});

describe('getUrlAsync', () => {
  it('returns the correct url for an unsaved snack', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
      sessionId: SESSION_ID,
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/sdk.${defaultSDKVersion}-123456`);
  });

  it('returns the correct url for a saved snack', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
      sessionId: SESSION_ID,
      snackId: SNACK_ID,
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/abcdef+123456`);
  });

  it('uses the sdkVersion if specified', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
      sessionId: SESSION_ID,
      sdkVersion: '14.0.0',
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual('exp://expo.io/@snack/sdk.14.0.0-123456');
  });

  it('works correctly from expo.io host', async () => {
    let session = new SnackSession({
      code: INITIAL_CODE,
      sessionId: SESSION_ID,
      host: 'expo.io',
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/sdk.${defaultSDKVersion}-123456`);
  });
});

describe('sendCodeAsync', () => {
  it('sends the correct message to the device', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync();
    await session.sendCodeAsync(NEW_CODE);
    setMockDate(1000);
    stopMockingDate();
    expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        code: NEW_CODE,
      },
    });
  });

  it('debounces multiple updates', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync();
    await session.sendCodeAsync(NEW_CODE);
    await session.sendCodeAsync(NEW_CODE_2);
    await session.sendCodeAsync(NEW_CODE_3);
    setMockDate(1000);
    stopMockingDate();
    expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        code: NEW_CODE_3,
      },
    });
  });

  it('logs successful publishes', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({
      verbose: true,
    });
    await session.sendCodeAsync(NEW_CODE);
    setMockDate(1000);
    stopMockingDate();
    let _originalConsoleLog = console.log;
    console.log = jest.genMockFunction().mockReturnValue(0);
    session.pubnub._publishListener(
      {
        error: false,
        operation: 'PNPublishOperation',
        statusCode: 200,
      },
      {
        timetoken: '14916083102347989',
      }
    );
    expect(console.log.mock.calls.length).toEqual(1);
    console.log = _originalConsoleLog;
  });

  it('logs errors', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({
      verbose: true,
    });
    await session.sendCodeAsync(NEW_CODE);
    setMockDate(1000);
    stopMockingDate();
    let _originalConsoleError = console.error;
    console.error = jest.genMockFunction().mockReturnValue(0);
    session.pubnub._publishListener(
      {
        error: true,
        operation: 'PNPublishOperation',
        statusCode: 500,
      },
      {
        timetoken: '14916083102347989',
      }
    );
    expect(console.error.mock.calls.length).toEqual(1);
    console.error = _originalConsoleError;
  });
});

describe('error listener', () => {
  it('handles babel errors', async () => {
    let session = await startDefaultSessionAsync({
      verbose: true,
    });
    let errorListener = jest.fn();
    session.addErrorListener(errorListener);
    await session.startAsync();

    session.pubnub.__sendMessage(ERROR_MESSAGE);

    expect(errorListener.mock.calls[0][0]).toEqual([
      {
        device: {
          id: 'b070e2d7-6218-40d5-8cc7-2879c28012b2',
          name: 'SM-G930U',
        },
        message: `Can't find variable: BLAH`,
        startLine: 57,
        endLine: 57,
        startColumn: 13,
        endColumn: 13,
        stack: 'huge stack',
      },
    ]);
  });

  it('stops sending events after .remove() is called', async () => {
    let session = await startDefaultSessionAsync({
      verbose: true,
    });
    let errorListener = jest.fn();
    let subscription = session.addErrorListener(errorListener);
    await session.startAsync();

    session.pubnub.__sendMessage(ERROR_MESSAGE);
    session.pubnub.__sendMessage(ERROR_MESSAGE);

    expect(errorListener.mock.calls.length).toEqual(2);

    subscription.remove();

    session.pubnub.__sendMessage(ERROR_MESSAGE);

    expect(errorListener.mock.calls.length).toEqual(2);
  });
});

/*

{
  action: 'join',
  uuid: '{"id":"b070e2d7-6218-40d5-8cc7-2879c28012b2","name":"SM-G930U"}',
}

{
  action: 'timeout',
  uuid: '{"id":"b070e2d7-6218-40d5-8cc7-2879c28012b2","name":"SM-G930U"}',
}

{
  message: {
    'type': 'RESEND_CODE',
    'device': {
      'id': 'b070e2d7-6218-40d5-8cc7-2879c28012b2',
      'name': 'SM-G930U'
    }
  }
}



*/
