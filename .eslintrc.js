module.exports = {
  extends: ['universe/native', 'universe/node', 'universe/web'],
  globals: {
    window: true,
    navigator: true,
  },
  env: {
    jasmine: true,
  },
};
