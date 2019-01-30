import joi from 'joi';

export default function buildAdkAsync(
  appJson : Object,
  options: {
    current?: boolean,
    mode?: string,
    platform?: string,
    expIds?: Array<string>,
    type?: string,
    releaseChannel?: string,
    bundleIdentifier?: string,
    publicUrl?: string,
    sdkVersion?: string,
  } = {}
) {

  const schema = joi.object().keys({
    current: joi.boolean(),
    mode: joi.string(),
    platform: joi.any().valid('android'),
    expIds: joi.array(),
    type: joi.any().valid('archive', 'simulator', 'client'),
    releaseChannel: joi.string().regex(/[a-z\d][a-z\d._-]*/),
    bundleIdentifier: joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\-\.]+$/),
    publicUrl: joi.string(),
    sdkVersion: joi.strict(),
  });

  const { error } = joi.validate(options, schema);
  // todo: error handling

  exp = appJson.expo;

  if (options.mode !== 'status' && (options.platform === 'android' || options.platform === 'all')) {
    if (!exp.android || !exp.android.package) {
      // todo: error handling
      // Must specify a java package in order to build this experience for Android.
      // Please specify one in ${configName} at "${configPrefix}android.package"
    }
  }

  return await Api.callMethodAsync('build', [], 'put', {
    manifest: exp,
    options,
  });
}
