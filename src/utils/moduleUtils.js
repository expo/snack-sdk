/* @flow */

import trim from 'lodash/trim';
import { types, parse, print } from 'recast';
import * as babylon from 'babylon';
import config from '../configs/babylon';
import type { ExpoDependencyV2 } from '../types';

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
  let source = print(path).code;

  const lineComment = `// ${comment}`;
  const blockComment = `/* ${comment} */`;

  if (source.endsWith(lineComment) || source.endsWith(blockComment)) {
    return;
  }

  source = source.replace(/\/\/.+$/, '');

  path.replace(parse(`${source} ${lineComment}`, { parser }).program.body[0]);
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

  return print(ast).code;
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
