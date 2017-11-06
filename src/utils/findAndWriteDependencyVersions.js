/* @flow */

import { types } from 'recast';
import { parse } from 'babylon';
import trim from 'lodash/trim';
import config from '../configs/babylon';
import npmVersionPins from '../configs/npmVersions';

const findModuleDependencies = (code: string): { [string]: string } => {
  const dependencies: { [string]: string } = {};
  const ast = parse(code, config);
  // Makes sure version specified is valid
  const versionMatch = RegExp(/^(\s*(\d+\.)?(\d+\.)?(\*|\d+))|(LATEST)$/);

  types.visit(ast, {
    visitImportDeclaration(path) {
      dependencies[path.node.source.value] =
        path.node.trailingComments && versionMatch.test(path.node.trailingComments[0].value)
          ? trim(path.node.trailingComments[0].value.replace(/\s*/, ''))
          : null;
      this.traverse(path);
    },

    visitCallExpression(path) {
      const { callee, arguments: args } = path.node;

      if (callee.name === 'require' && args[0]) {
        let version = null;
        const parentPath = path.parentPath.parentPath;

        // Comment location changes if user uses semicolons or not
        if (args[0].trailingComments) {
          version = versionMatch.test(args[0].trailingComments[0].value)
            ? trim(args[0].trailingComments[0].value.replace(/\s*/, ''))
            : null;
        } else if (parentPath.node.trailingComments) {
          version = versionMatch.test(parentPath.node.trailingComments[0].value)
            ? trim(parentPath.node.trailingComments[0].value)
            : null;
        }

        dependencies[args[0].value] = version;
      }

      this.traverse(path);
    },
  });

  return dependencies;
};

// Writes version number in comments in code
const writeModuleVersions = (code: string, dependencies: { [string]: string }): string => {
  const ast = parse(code, config);
  const newCode: Array<string> = code.split('\n');

  types.visit(ast, {
    visitImportDeclaration(path) {
      const { trailingComments, loc, source } = path.node;
      const lineIndex = loc.end.line - 1;

      if (trailingComments) {
        newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
      }
      const module = source.value;
      if (dependencies[module]) {
        newCode[lineIndex] =  _addDependencyPin(newCode[lineIndex], dependencies[module]);
      }
      this.traverse(path);
    },

    visitCallExpression(path) {
      const { callee, arguments: args, loc } = path.node;
      const lineIndex = loc.end.line - 1;

      if (callee.name === 'require' && args[0]) {
        if (args[0].trailingComments || path.parentPath.parentPath.value.some(it => it.trailingComments)) {
          newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
        }
        const module = args[0].value;
        if (dependencies[module]) {
          newCode[lineIndex] = _addDependencyPin(newCode[lineIndex], dependencies[module]);
        }
      }
      this.traverse(path);
    },
  });
  return newCode.join('\n');
};

const _addDependencyPin = (currentLine, dependency) => {
  const versionRegex = new RegExp(dependency);
  if (versionRegex.test(currentLine)) {
    return currentLine;
  }
  return currentLine + ' // ' + dependency || npmVersionPins.error;
};

export default { findModuleDependencies, writeModuleVersions };
