/* @flow */

import preloadedModules from '../configs/preloadedModules';

export default function isModulePreloaded(name: string) {
  return preloadedModules.includes(name);
}
