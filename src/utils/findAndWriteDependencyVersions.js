/* @flow */

import { types } from 'recast';
import { parse } from 'babylon';
import trim from 'lodash/trim';
import config from '../configs/babylon';
import npmVersionPins from '../configs/npmVersions';

const getModuleNameFromRequire = (node: *) => {
  const { callee, arguments: args } = node;

  let name;

  if (
    callee.name === 'require' &&
    args.length === 1 &&
    (args[0].type === 'StringLiteral' || args[0].type === 'TemplateLiteral')
  ) {
    if (args[0].type === 'StringLiteral') {
      name = args[0].value;
    } else if (args[0].type === 'TemplateLiteral' && args[0].quasis.length === 1) {
      name = args[0].quasis[0].value.cooked;
    }
  }

  return name && !/\n/.test(name) && !name.startsWith('/') ? name : null;
};

const getVersionFromComments = (comments: *) => {
  // Makes sure version specified is valid
  const versionFormat = /^(\s*(\d+\.)?(\d+\.)?(\*|\d+))|(LATEST)$/;

  return comments && versionFormat.test(comments[0].value)
    ? trim(comments[0].value.replace(/\s*/, ''))
    : null;
};

const findModuleDependencies = (code: string): { [string]: string } => {
  const dependencies: { [string]: string } = {};
  const ast = parse(code, config);

  types.visit(ast, {
    visitImportDeclaration(path) {
      dependencies[path.node.source.value] = getVersionFromComments(path.node.trailingComments);

      this.traverse(path);
    },

    visitExportNamedDeclaration(path) {
      if (path.node.source) {
        dependencies[path.node.source.value] = getVersionFromComments(path.node.trailingComments);
      }
      this.traverse(path);
    },

    visitExportAllDeclaration(path) {
      dependencies[path.node.source.value] = getVersionFromComments(path.node.trailingComments);
      this.traverse(path);
    },

    visitCallExpression(path) {
      const name = getModuleNameFromRequire(path.node);

      if (name) {
        const { arguments: args } = path.node;

        // Comment location changes if user uses semicolons or not
        const version = getVersionFromComments(
          args[0].trailingComments || path.parentPath.parentPath.node.trailingComments
        );

        dependencies[name] = version;
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
        newCode[lineIndex] = _addDependencyPin(newCode[lineIndex], dependencies[module]);
      }
      this.traverse(path);
    },

    visitExportNamedDeclaration(path) {
      const { trailingComments, loc, source } = path.node;
      const lineIndex = loc.end.line - 1;

      if (trailingComments) {
        newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
      }
      if (source && dependencies[source.value]) {
        newCode[lineIndex] = _addDependencyPin(newCode[lineIndex], dependencies[source.value]);
      }

      this.traverse(path);
    },

    visitExportAllDeclaration(path) {
      const { trailingComments, loc, source } = path.node;
      const lineIndex = loc.end.line - 1;

      if (trailingComments) {
        newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
      }
      const module = source.value;
      if (dependencies[module]) {
        newCode[lineIndex] = _addDependencyPin(newCode[lineIndex], dependencies[module]);
      }

      this.traverse(path);
    },

    visitCallExpression(path) {
      const name = getModuleNameFromRequire(path.node);

      if (name) {
        const { arguments: args, loc } = path.node;
        const lineIndex = loc.end.line - 1;

        if (
          args[0].trailingComments ||
          path.parentPath.parentPath.value.some(it => it.trailingComments)
        ) {
          newCode[lineIndex] = newCode[lineIndex].replace(/\s*\/\/.*/, '');
        }

        if (dependencies[name]) {
          newCode[lineIndex] = _addDependencyPin(newCode[lineIndex], dependencies[name]);
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
