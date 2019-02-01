import axios from 'axios';
import slugid from 'slugid';

const MAX_CONTENT_LENGTH = 100 /* MB */ * 1024 * 1024;

export default function buildApkAsync(
  appJson : Object,
  options: {
    sdkVersion?: string,
  } = {}
) {

  options.platform = 'android';
  exp = appJson.expo;

  return await callMethodAsync('build', 'put', {
    manifest: exp,
    options,
  });
}

async function _callMethodAsync(
  methodName: string,
  method: string,
  requestBody: ?Object
): Promise<any> {
  const clientId = await Session.clientIdAsync();

  let headers: any = {
    'Exp-ClientId': 'c-' + slugid.v4();,
  };

  let url =
      'https://exp.host/--/api/' +
      encodeURIComponent(methodName);

  let options = {
    url,
    method: method,
    headers,
    maxContentLength: MAX_CONTENT_LENGTH,
  };

  if (requestBody) {
    options = {
      ...options,
      data: requestBody,
    };
  }

  let response = await axios.request(options);
  if (!response) {
    throw new Error('Unexpected error: Request failed.');
  }
  let responseBody = response.data;
  var responseObj;
  if (_.isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      //
    }
  } else {
    responseObj = responseBody;
  }
  return responseObj;
}
