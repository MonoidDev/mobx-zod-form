const includeMarkdownPlugin = require("./scripts/include-markdown");

module.exports = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  mdxOptions: {
    remarkPlugins: [includeMarkdownPlugin],
  },
})({
  images: {
    unoptimized: true,
  },
});
