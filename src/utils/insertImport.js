/* @flow */

import { types } from 'recast';

const n = types.namedTypes;
const b = types.builders;

type ImportDescription = {
  from: string,
  name?: string,
  default?: boolean,
};

const insertImport = (ast: any, item: ImportDescription) => {
  let imported = false;

  types.visit(ast, {
    visitImportDeclaration(path) {
      // Check if there's an import for our module
      if (path.node.source.value === item.from) {
        // Check if there's an import for specific export
        if (item.default) {
          imported = path.node.specifiers.some(n.ImportDefaultSpecifier.check);
        } else if (item.name) {
          imported = path.node.specifiers
            .filter(n.ImportSpecifier.check)
            .some(s => s.imported.name === item.name);
        } else {
          imported = true;
        }

        // There's an import for the module, but not the specific export
        if (!imported && item.name) {
          if (item.default) {
            path.node.specifiers.unshift(
              b.importDefaultSpecifier(b.identifier(item.name))
            );
          } else {
            path.node.specifiers.push(
              b.importSpecifier(b.identifier(item.name))
            );
          }
          imported = true;
        }
      }

      this.traverse(path);
    },
  });

  // There are no import statements for the module
  if (!imported) {
    // Find the index of last import statement
    const index = ast.program.body.reduce((acc, curr, i) => {
      if (n.ImportDeclaration.check(curr)) {
        return i;
      }
      return acc;
    }, 0);

    // Insert our import after the last import statement
    ast.program.body.splice(
      index + 1,
      0,
      item.name
        ? b.importDeclaration(
            item.default
              ? [b.importDefaultSpecifier(b.identifier(item.name))]
              : [b.importSpecifier(b.identifier(item.name))],
            b.literal(item.from)
          )
        : b.importDeclaration([], b.literal(item.from))
    );
  }
};

export default insertImport;
