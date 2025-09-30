import nextra from "nextra";

import includeCodePlugin from "./scripts/include-code.js";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  mdxOptions: {
    remarkPlugins: [includeCodePlugin],
  },
})

export default withNextra();
