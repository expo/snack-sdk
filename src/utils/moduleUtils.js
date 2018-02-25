/* @flow */

import trim from 'lodash/trim';
import trimEnd from 'lodash/trimEnd';
import { types, parse, print } from 'recast';
import * as babylon from 'babylon';
import config from '../configs/babylon';
import type { ExpoDependencyV2 } from '../types';

const COMMENT_PREFIX = '<COMMENT_PREFIX>';

const parser = {
  parse: (code: string) => babylon.parse(code, config),
};

const b = types.builders;

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

const getCommentFromCallExpression = path => {
  const { arguments: args } = path.node;

  // Comment location changes if user uses semicolons or not
  return args[0].trailingComments || path.parentPath.parentPath.node.trailingComments;
};

const replaceCommentInPath = (path, comment: string) => {
  let node;

  if (path.node.type === 'CallExpression') {
    const { parentPath } = path;

    if (parentPath.node.type === 'VariableDeclarator') {
      node = parentPath.parentPath.node;
    } else {
      node = parentPath.node;
    }
  } else {
    node = path.node;
  }

  node.comments = node.comments || [];
  node.comments = node.comments.filter(comment => !(comment.type === 'Line' && comment.trailing));
  node.comments.push({
    type: 'Line',
    value: COMMENT_PREFIX + ' ' + comment,
    leading: false,
    trailing: true,
  });
};

export const findModuleDependencies = (code: string): { [string]: string } => {
  const ast = parse(code, { parser });
  const dependencies: { [string]: string } = {};

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
        const version = getVersionFromComments(getCommentFromCallExpression(path));

        dependencies[name] = version;
      }

      this.traverse(path);
    },
  });

  return dependencies;
};

const writeImportComment = (
  code: string,
  getComment: (name: string, version?: ?string) => ?string
): string => {
  const ast = parse(code, { parser });

  types.visit(ast, {
    visitImportDeclaration(path) {
      const name = path.node.source.value;
      const comment = getComment(name, getVersionFromComments(path.node.trailingComments));

      if (comment) {
        replaceCommentInPath(path, comment);
      }

      return false;
    },

    visitExportNamedDeclaration(path) {
      const name = path.node.source && path.node.source.value;
      const comment = getComment(name, getVersionFromComments(path.node.trailingComments));

      if (comment) {
        replaceCommentInPath(path, comment);
      }

      return false;
    },

    visitExportAllDeclaration(path) {
      const name = path.node.source.value;
      const comment = getComment(name, getVersionFromComments(path.node.trailingComments));

      if (comment) {
        replaceCommentInPath(path, comment);
      }

      return false;
    },

    visitCallExpression(path) {
      const name = getModuleNameFromRequire(path.node);

      if (name) {
        const version = getVersionFromComments(getCommentFromCallExpression(path));
        const comment = getComment(name, version);

        if (comment) {
          replaceCommentInPath(path, comment);
        }
      }

      return false;
    },
  });

  // This is a bit hacky, but it's the most reliable way of adding space before comments
  return print(ast)
    .code.split('\n')
    .map(line => {
      const i = line.lastIndexOf('//' + COMMENT_PREFIX);

      if (i > 0) {
        return trimEnd(line.slice(0, i), ' ') + ' //' + line.slice(i + COMMENT_PREFIX.length + 2, line.length);
      }

      return line;
    })
    .join('\n');
};

export const writeModuleVersions = (code: string, dependencies: ExpoDependencyV2): string => {
  return writeImportComment(code, name => {
    const meta = dependencies[name];

    if (meta) {
      return meta.version;
    }
  });
};

export const removeModuleVersions = (code: string): string => {
  return writeImportComment(code, (name, version) => {
    if (version) {
      return 'Version can be specified in package.json';
    }
  });
};
