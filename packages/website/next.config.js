module.exports = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
})({
  images: {
    unoptimized: true,
  },
});
