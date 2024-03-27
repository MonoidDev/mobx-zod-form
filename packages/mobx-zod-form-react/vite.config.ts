export default {
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        runScripts: "dangerously",
      },
    },
    setupFiles: "./test/setup.ts",
  },
};
