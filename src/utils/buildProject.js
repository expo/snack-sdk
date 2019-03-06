import axios from 'axios';

const MAX_CONTENT_LENGTH = 100 /* MB */ * 1024 * 1024;

export default async function buildApkAsync(
  appJson : Object,
  headers : Object,
  options : Object
) {

  const exp = appJson.expo;

  return await _callMethodAsync('build', 'put', headers, {
    manifest: exp,
    options : options,
  });
}

async function _callMethodAsync(
  methodName: string,
  method: string,
  headers: Object,
  requestBody: Object
): Promise<any> {

  let url =
      'http://0.0.0.0:3000/--/api/' +
      encodeURIComponent(methodName);

  let options = {
    url,
    method,
    headers,
    maxContentLength: MAX_CONTENT_LENGTH,
    data: requestBody,
  };

  let response = await axios.request(options);
  if (!response) {
    throw new Error('Unexpected error: Request failed.');
  }
  let responseBody = response.data;
  var responseObj;
  if (typeof responseBody === 'string' || responseBody instanceof String) {
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
