const includeCodePlugin = require("./scripts/include-code");

module.exports = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  mdxOptions: {
    remarkPlugins: [includeCodePlugin],
  },
})({
  images: {
    unoptimized: true,
  },
});
