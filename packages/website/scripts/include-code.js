// Based on https://github.com/hashicorp/remark-plugins/blob/main/plugins/include-markdown/index.js

const path = require("path");

const { readSync } = require("to-vfile");
const flatMap = require("unist-util-flatmap");

module.exports = function includeMarkdownPlugin({ resolveFrom } = {}) {
  return function transformer(tree, file) {
    return flatMap(tree, (node) => {
      if (node.type !== "code") return [node];

      const codeContent = node.value.trim();

      // detect an `@include "path/to/file"` statement
      const includeMatch =
        codeContent && codeContent.match(/^@include\s['"](.*)['"]$/);
      if (!includeMatch) return [node];

      const [_includePath, hash] = includeMatch[1].split("#", 2);

      // read the file contents
      const includePath = path.join(resolveFrom || file.dirname, _includePath);
      let includeContents;
      try {
        includeContents = readSync(includePath, "utf8");
      } catch (err) {
        throw new Error(
          `The @include file path at ${includePath} was not found.\n\nInclude Location: ${file.path}:${node.position.start.line}:${node.position.start.column}`,
        );
      }

      // trim trailing newline
      includeContents.contents = includeContents.contents.trim();

      if (hash) {
        /**
         * @type {string[]}
         */
        const lines = includeContents.contents.split("\n");

        const start = lines.findIndex((l) => l.includes(`/* #${hash} */`));

        if (start === -1) {
          throw new Error(`${hash} is not found`);
        }

        const end = lines.findIndex(
          (l, index) => index > start && l.includes(`/* #${hash} */`),
        );

        includeContents.contents = includeContents.contents
          .split("\n")
          .slice(start + 1, end)
          .filter((s) => !s.includes("/* #")) // Remove markers
          .join("\n");
      }

      // return contents wrapped inside a "code" node
      return [
        {
          ...node,
          lang: node.lang || includePath.match(/\.(\w+)$/)[1],
          meta: [node.meta, "showLineNumbers"].join(" "),
          value: includeContents,
        },
      ];
    });
  };
};
