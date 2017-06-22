var diff = require('diff');

const getFileDiff = (oldCode, newCode) => {
  const patch = diff.createPatch('code', oldCode, newCode, '', '', {
    context: 0,
  });
  if (patch) {
    return patch;
  } else {
    throw new Error('Error creating a file diff');
  }
};

const calcPayloadSize = (channel, manifest) => {
  return encodeURIComponent(channel + JSON.stringify(manifest)).length + 100;
};

const uploadToS3 = async code => {
  //TODO: change this to production
  const url = `http://localhost:3000/--/api/v2/snack/uploadCode`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return data.url;
  } catch (e) {
    throw e;
  }
};

export default { getFileDiff, calcPayloadSize, uploadToS3 };
