'use strict';

import { defaultSDKVersion } from '../configs/sdkVersions';
import fetchMock from 'fetch-mock';
import testCode from '../../test-files/bigfile';

jest.mock('pubnub');

const SnackSession = require('../SnackSession').default;

const INITIAL_CODE = { 'App.js': { contents: 'code', type: 'CODE' } };
const NEW_CODE = 'new code';
const NEW_CODE_MF_STYLE = {
  'App.js': { contents: 'new code', type: 'CODE' },
};
const NEW_CODE_DIFF =
  'Index: code\n===================================================================\n--- code	\n+++ code	\n@@ -1,0 +1,1 @@\n\\ No newline at end of file\n+new code\n';
const NEW_CODE_2 = 'new code 2';
const NEW_CODE_2_DIFF =
  'Index: code\n===================================================================\n--- code	\n+++ code	\n@@ -1,0 +1,1 @@\n\\ No newline at end of file\n+new code 2\n';
const NEW_CODE_3 = 'new code 3';
const NEW_CODE_3_DIFF =
  'Index: code\n===================================================================\n--- code	\n+++ code	\n@@ -1,0 +1,1 @@\n\\ No newline at end of file\n+new code 3\n';
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
    files: INITIAL_CODE,
    sessionId: SESSION_ID,
    ...args,
  });
  await session.startAsync();
  return session;
}

function codeMessageFromContents(fileContents) {
  return { 'App.js': { type: 'CODE', contents: fileContents } };
}

function startMockingDate() {
  jest.useFakeTimers();
  Date.now = jest.genMockFunction().mockReturnValue(0);
}

function setMockDate(date) {
  jest.useFakeTimers();
  Date.now = jest.genMockFunction().mockReturnValue(date);
  jest.runAllTimers();
}

function stopMockingDate() {
  jest.useRealTimers();
  Date.now = ORIGINAL_DATE_NOW;
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('when a sessionId is specified', () => {
  it('connects to the correct channel', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
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
      files: INITIAL_CODE,
      sessionId: '123',
    });
  }
  it('errors if sessionId is too short', async () => {
    expect(createNewSessionWithShortId).toThrow();
  });

  it('generates a sessionId if none is provided', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
    });
    expect(session.channel).toBeDefined();
  });
});

describe('getUrlAsync', () => {
  it('returns the correct url for an unsaved snack', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
      sessionId: SESSION_ID,
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/sdk.${defaultSDKVersion}-123456`);
  });

  it('returns the correct url for a saved snack', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
      sessionId: SESSION_ID,
      snackId: SNACK_ID,
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/abcdef+123456`);
  });

  it('uses the sdkVersion if specified', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
      sessionId: SESSION_ID,
      sdkVersion: '19.0.0',
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual('exp://expo.io/@snack/sdk.19.0.0-123456');
  });

  it('works correctly from expo.io host', async () => {
    let session = new SnackSession({
      files: INITIAL_CODE,
      sessionId: SESSION_ID,
      host: 'expo.io',
    });
    await session.startAsync();
    let url = await session.getUrlAsync();
    expect(url).toEqual(`exp://expo.io/@snack/sdk.${defaultSDKVersion}-123456`);
  });
});

describe('sendCodeAsync', () => {
  /* 
   *   it('sends the correct message to the device', async () => {
   *     startMockingDate();
   *     let session = await startDefaultSessionAsync();
   *     await session.sendCodeAsync(NEW_CODE_MF_STYLE);
   *     await timeout(50);
   *     setMockDate(1000);
   *     stopMockingDate();
   *     expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
   *       channel: SESSION_ID,
   *       message: {
   *         type: 'CODE',
   *         code: NEW_CODE,
   *       },
   *     });
   *   });
   * */
  it('sends the correct message to the device when using diffs', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({ sdkVersion: '21.0.0' });
    await session.sendCodeAsync(NEW_CODE_MF_STYLE);
    setMockDate(1000);
    stopMockingDate();
    await timeout(50);

    expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        diff: { 'app.js': NEW_CODE_DIFF },
        s3url: {},
      },
    });
  });

  it('large file upload to s3', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({ sdkVersion: '21.0.0' });
    fetchMock.post('*', {
      url:
        'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/225764978e2bee1bcf2b1372048f7cd9',
      hash: '225764978e2bee1bcf2b1372048f7cd9',
    });
    await session.sendCodeAsync({
      'App.js': { type: 'CODE', contents: testCode.largeCode },
    });
    setMockDate(1000);
    stopMockingDate();
    await timeout(50);
    fetchMock.restore();
    expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        diff: { 'app.js': '' },
        s3url: {
          'app.js':
            'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/225764978e2bee1bcf2b1372048f7cd9',
        },
      },
    });
  });

  /* it('diff creation when file is on s3', async () => {
   *   startMockingDate();
   *   let session = await startDefaultSessionAsync({ sdkVersion: '21.0.0' });
   *   fetchMock.post('*', {
   *     url:
   *       'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/225764978e2bee1bcf2b1372048f7cd9',
   *     hash: '225764978e2bee1bcf2b1372048f7cd9',
   *   });
   *   await session.sendCodeAsync(codeMessageFromContents(testCode.largeCode));
   *   setMockDate(1000);
   *   stopMockingDate();
   *   await timeout(50);
   *   fetchMock.restore();
   *   startMockingDate();
   *   await session.sendCodeAsync(codeMessageFromContents(testCode.largeCodeChanged));
   *   setMockDate(1000);
   *   stopMockingDate();
   *   await timeout(50);
   *   fetchMock.restore();
   *   expect(session.pubnub.publish.mock.calls[1][0]).toMatchObject({
   *     channel: SESSION_ID,
   *     message: {
   *       type: 'CODE',
   *       diff: {
   *         'app.js':
   *           "Index: code\n===================================================================\n--- code	\n+++ code	\n@@ -11,0 +11,1 @@\n+ And we're modifying this huge block of text. \n",
   *       },
   *       s3url: {
   *         'app.js':
   *           'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/225764978e2bee1bcf2b1372048f7cd9',
   *       },
   *     },
   *   });
   * });
   */
  it('reupload to s3 when diff is too big', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({ sdkVersion: '21.0.0' });
    fetchMock.post('*', {
      url:
        'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/225764978e2bee1bcf2b1372048f7cd9',
      hash: '225764978e2bee1bcf2b1372048f7cd9',
    });
    await session.sendCodeAsync(codeMessageFromContents(testCode.largeCode));
    setMockDate(1000);
    stopMockingDate();
    await timeout(50);
    fetchMock.restore();
    startMockingDate();
    fetchMock.post('*', {
      url:
        'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/dee64f147ae2e4f0a76c4837c0991f7d',
      hash: 'dee64f147ae2e4f0a76c4837c0991f7d',
    });
    await session.sendCodeAsync(codeMessageFromContents(testCode.largeCodeChangedReupload));
    setMockDate(1000);
    stopMockingDate();
    await timeout(50);
    fetchMock.restore();
    expect(session.pubnub.publish.mock.calls[1][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        diff: { 'app.js': '' },
        s3url: {
          'app.js':
            'https://snack-code-uploads-staging.s3-us-west-1.amazonaws.com/~code/dee64f147ae2e4f0a76c4837c0991f7d',
        },
      },
    });
  });

  it('debounces multiple updates', async () => {
    startMockingDate();
    let session = await startDefaultSessionAsync({ sdkVersion: '21.0.0' });
    await session.sendCodeAsync(codeMessageFromContents(NEW_CODE));
    await session.sendCodeAsync(codeMessageFromContents(NEW_CODE_2));
    await session.sendCodeAsync(codeMessageFromContents(NEW_CODE_3));
    setMockDate(1000);
    stopMockingDate();
    await timeout(50);
    expect(session.pubnub.publish.mock.calls[0][0]).toMatchObject({
      channel: SESSION_ID,
      message: {
        type: 'CODE',
        s3url: {},
        diff: { 'app.js': NEW_CODE_3_DIFF },
      },
    });
  });

  /* it('logs successful publishes', async () => {
   *   startMockingDate();
   *   let session = await startDefaultSessionAsync({
   *     verbose: true,
   *   });
   *   await session.sendCodeAsync(NEW_CODE_MF_STYLE);

   *   await timeout(50);
   *   console.log('waited for sned code');
   *   setMockDate(1000);
   *   stopMockingDate();
   *   let _originalConsoleLog = console.log;
   *   console.log = jest.genMockFunction().mockReturnValue(0);
   *   session.pubnub._publishListener(
   *     {
   *       error: false,
   *       operation: 'PNPublishOperation',
   *       statusCode: 200,
   *     },
   *     {
   *       timetoken: '14916083102347989',
   *     }
   *   );
   *   expect(console.log.mock.calls.length).toEqual(1);
   *   console.log = _originalConsoleLog;
   * });

   * it('logs errors', async () => {
   *   startMockingDate();
   *   let session = await startDefaultSessionAsync({
   *     verbose: true,
   *   });
   *   await session.sendCodeAsync(NEW_CODE_MF_STYLE);
   *   setMockDate(1000);
   *   stopMockingDate();
   *   let _originalConsoleError = console.error;
   *   console.error = jest.genMockFunction().mockReturnValue(0);
   *   session.pubnub._publishListener(
   *     {
   *       error: true,
   *       operation: 'PNPublishOperation',
   *       statusCode: 500,
   *     },
   *     {
   *       timetoken: '14916083102347989',
   *     }
   *   );
   *   expect(console.error.mock.calls.length).toEqual(1);
   *   console.error = _originalConsoleError;
   * });
     });

     describe('error listener', () => {
   * it('handles babel errors', async () => {
   *   let session = await startDefaultSessionAsync({
   *     verbose: true,
   *   });
   *   let errorListener = jest.fn();
   *   session.addErrorListener(errorListener);
   *   await session.startAsync();

   *   session.pubnub.__sendMessage(ERROR_MESSAGE);

   *   expect(errorListener.mock.calls[0][0]).toEqual([
   *     {
   *       device: {
   *         id: 'b070e2d7-6218-40d5-8cc7-2879c28012b2',
   *         name: 'SM-G930U',
   *       },
   *       message: `Can't find variable: BLAH`,
   *       startLine: 57,
   *       endLine: 57,
   *       startColumn: 13,
   *       endColumn: 13,
   *       stack: 'huge stack',
   *     },
   *   ]);
   * });*/

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

describe('saveAsync', () => {
  it('sends the correct data to the server', async () => {
    fetchMock.post('*', { id: 'abc123' });

    let session = await startDefaultSessionAsync({
      sdkVersion: '25.0.0',
      dependencies: { lodash: { version: '1.0.0' } },
    });
    let saveResult = await session.saveAsync();
    expect(saveResult).toEqual({
      id: 'abc123',
      url: 'https://expo.io/@snack/abc123',
    });

    let lastCall = fetchMock.lastCall('*');
    expect(lastCall[0]).toEqual('https://expo.io/--/api/v2/snack/save');
    expect(lastCall[1]).toEqual({
      method: 'POST',
      body: `{"manifest":{"sdkVersion":"25.0.0","dependencies":{"lodash":"1.0.0"}},"code":${JSON.stringify(
        INITIAL_CODE
      )},"dependencies":{"lodash":{"version":"1.0.0"}}}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    fetchMock.restore();
  });

  it('uses name and description', async () => {
    fetchMock.post('*', { id: 'abc123' });

    let session = await startDefaultSessionAsync({
      name: 'testname1',
      description: 'testdescription1',
    });
    let saveResult = await session.saveAsync();
    expect(saveResult).toEqual({
      id: 'abc123',
      url: 'https://expo.io/@snack/abc123',
    });

    let lastCall = fetchMock.lastCall('*');
    expect(lastCall[0]).toEqual('https://expo.io/--/api/v2/snack/save');
    expect(lastCall[1]).toEqual({
      method: 'POST',
      body: `{"manifest":{"sdkVersion":"${defaultSDKVersion}","name":"testname1","description":"testdescription1","dependencies":{}},"code":${JSON.stringify(
        INITIAL_CODE
      )},"dependencies":null}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    fetchMock.restore();
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
