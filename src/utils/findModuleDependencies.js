/* @flow */

import { types } from 'recast';
import { parse } from 'babylon';
import config from '../configs/babylon';
import trim from 'lodash/trim';

type Module = {
  name: string,
  version?: ?string,
};

const findModuleDependencies = (code: string): Array<Module> => {
  const dependencies: Set<Module> = new Set();
  const ast = parse(code, config);
  // Makes sure version specified is valid
  const versionMatch = RegExp(/^\s*(\d+\.)?(\d+\.)?(\*|\d+)$/);

  types.visit(ast, {
    visitImportDeclaration(path) {
      const module = {
        name: path.node.source.value,
        version: path.node.trailingComments &&
          versionMatch.test(path.node.trailingComments[0].value)
          ? trim(path.node.trailingComments[0].value.replace(/\s*/, ''))
          : null,
      };
      dependencies.add(module);
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

        const module = {
          name: args[0].value,
          version: version,
        };
        dependencies.add(module);
      }

      this.traverse(path);
    },
  });

  return Array.from(dependencies);
};

// Writes version number in comments in code
const writeModuleVersions = (
  code: string,
  dependencies: { [string]: Module }
): string => {
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
        newCode[lineIndex] += ' // ' + dependencies[module].version || 'error';
      }
      this.traverse(path);
    },

    visitCallExpression(path) {
      const { callee, arguments: args, loc } = path.node;
      const lineIndex = loc.end.line - 1;

      if (callee.name === 'require' && args[0]) {
        if (
          args[0].trailingComments ||
          path.parentPath.parentPath.node.trailingComments
        ) {
          newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
        }
        const module = args[0].value;
        if (dependencies[module]) {
          newCode[lineIndex] +=
            ' // ' + dependencies[module].version || 'error';
        }
      }
      this.traverse(path);
    },
  });
  return newCode.join('\n');
};

export default { findModuleDependencies, writeModuleVersions };
