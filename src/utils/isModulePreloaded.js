/* @flow */

import preloadedModules from '../configs/preloadedModules';

export default function isModulePreloaded(name: string, sdkVersion?: string) {
  if (preloadedModules['all'].includes(name)) {
    return true;
  }

  // perform prefix search on sdk specific preloaded module
  // TODO(tc): more reasonable handling of prefixes & version specific changes
  if (!sdkVersion || !(sdkVersion in preloadedModules)) {
    return false;
  }

  const modules = preloadedModules[sdkVersion];
  const result = modules.filter(key => name.startsWith(key));
  return !!result.length;
}
