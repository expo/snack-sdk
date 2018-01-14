import { sdkSupportsFeature } from '../configs/sdkVersions';

export const standardizeDependencies = (dependencies, sdkVersion) => {
  return convertDependencyFormat(
    dependencies,
    sdkSupportsFeature(sdkVersion, 'PROJECT_DEPENDENCIES')
  );
};

export const convertDependencyFormat = (dependencies, shouldBeV2) => {
  console.log(dependencies);
  const isV1 = _isV1(dependencies);
  if (shouldBeV2) {
    if (isV1) {
      console.log('upgrading');
      return _convertDependenciesV1toV2(dependencies);
    } else {
      return dependencies;
    }
  } else {
    if (isV1) {
      return dependencies;
    } else {
      console.log('downgrading');
      return _convertDependenciesV2toV1(dependencies);
    }
  }
};

const _isV1 = dependencies => {
  return Object.keys(dependencies).every(dep => typeof dependencies[dep] === 'string');
};

const _convertDependenciesV1toV2 = dependencies => {
  const convertedDeps = {};
  for (const dep in dependencies) {
    convertedDeps[dep] = {
      version: dependencies[dep],
      isUserSpecified: true,
    };
  }
  return convertedDeps;
};

const _convertDependenciesV2toV1 = dependencies => {
  const convertedDeps = {};
  for (const dep in dependencies) {
    convertedDeps[dep] = dependencies[dep].version;
  }
  return convertedDeps;
};
