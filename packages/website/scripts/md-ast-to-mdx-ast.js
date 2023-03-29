/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

/*
NOTE:
This file is swiped directly from @mdxjs/mdx's createMdxAstCompiler.
ref: https://github.com/mdx-js/mdx/blob/510bae2580958598ae29047bf755b1a2ea26cf7e/packages/mdx/md-ast-to-mdx-ast.js
I considered the possibility of using createMdxAstCompiler rather than remark-mdx on its own.
however, crucially, we do NOT want to transform our AST into a MDXAST, we ONLY want to
transform custom component nodes (ie HTML that is really JSX) into JSX nodes.
So it felt duplicative, but necessary, to copypasta this utility in to meet our needs.
*/

const { isComment, getCommentContents } = require("@mdx-js/util");
const visit = require("unist-util-visit");

module.exports = (_options) => (tree) => {
  visit(tree, "jsx", (node) => {
    if (isComment(node.value)) {
      node.type = "comment";
      node.value = getCommentContents(node.value);
    }
  });

  return tree;
};
