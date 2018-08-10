/* flow */

var diff = require('diff');

const getFileDiff = (oldCode: string, newCode: string) => {
  const patch = diff.createPatch('code', oldCode, newCode, '', '', {
    context: 0,
  });
  if (patch) {
    return patch;
  } else {
    throw new Error('Error creating a file diff');
  }
};

// TODO(tc): refactor so we calculate the actual message size rather than adding this fudge for the analytics data
const calcPayloadSize = (channel, manifest) => {
  return encodeURIComponent(channel + JSON.stringify(manifest)).length + 5000;
};

const uploadCodeToS3 = async (code: string, api: string) => {
  const url = `${api}/--/api/v2/snack/uploadCode`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return data.url;
  } catch (e) {
    throw new Error('Unable to upload code to S3: ' + e.message);
  }
};

const uploadAssetToS3 = async (asset: string, api: string) => {
  const url = `${api}/--/api/v2/snack/uploadAsset`;
  const FD = new FormData();
  FD.append('asset', asset, asset.name);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: FD,
    });
    const data = await response.json();
    return data.url;
  } catch (e) {
    throw new Error('Unable to upload asset to S3: ' + e.message);
  }
};

export default {
  getFileDiff,
  calcPayloadSize,
  uploadCodeToS3,
  uploadAssetToS3,
};
