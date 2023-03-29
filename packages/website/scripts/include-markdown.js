// Based on https://github.com/hashicorp/remark-plugins/blob/main/plugins/include-markdown/index.js

const path = require("path");

const remark = require("remark");
const remarkMdx = require("remark-mdx");
const { readSync } = require("to-vfile");
const flatMap = require("unist-util-flatmap");

const mdAstToMdxAst = require("./md-ast-to-mdx-ast");

module.exports = function includeMarkdownPlugin({
  resolveFrom,
  resolveMdx,
} = {}) {
  return function transformer(tree, file) {
    return flatMap(tree, (node) => {
      if (node.type !== "paragraph") return [node];

      // detect an `@include` statement
      const includeMatch =
        node.children[0].value &&
        node.children[0].value.match(/^@include\s['"](.*)['"]$/);
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

      // if we are including a ".md" or ".mdx" file, we add the contents as processed markdown
      // if any other file type, they are embedded into a code block
      if (includePath.match(/\.md(?:x)?$/)) {
        // return the file contents in place of the @include
        // (takes a couple steps because we're processing includes with remark)
        const processor = remark();
        // if the include is MDX, and the plugin consumer has confirmed their
        // ability to stringify MDX nodes (eg "jsx"), then use remarkMdx to support
        // custom components (which would otherwise appear as likely invalid HTML nodes)
        const isMdx = includePath.match(/\.mdx$/);
        if (isMdx && resolveMdx) processor.use(remarkMdx).use(mdAstToMdxAst);
        // use the includeMarkdown plugin to allow recursive includes
        processor.use(includeMarkdownPlugin, { resolveFrom, resolveMdx });
        // Process the file contents, then return them
        const ast = processor.parse(includeContents);
        return processor.runSync(ast, includeContents).children;
      } else {
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
            type: "code",
            lang: includePath.match(/\.(\w+)$/)[1],
            value: includeContents,
          },
        ];
      }
    });
  };
};
