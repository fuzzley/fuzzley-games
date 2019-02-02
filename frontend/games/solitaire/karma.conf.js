const webpackConfig = require("./webpack.config");
const path = require("path");

delete webpackConfig.entry;

module.exports = function(config) {
  config.set({
    frameworks: ["jasmine", "karma-typescript"],
    plugins: [
      "karma-jasmine",
      "karma-chrome-launcher",
      "karma-typescript",
      "karma-coverage"
    ],
    files: [{ pattern: "src/**/*.ts" }, { pattern: "test/**/*.ts" }],
    preprocessors: {
      "src/**/*.ts": ["karma-typescript", "coverage"],
      "test/**/*.ts": ["karma-typescript"],
      "test/**/*.js": ["karma-typescript"],
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true
    },
    reporters: ["progress", "coverage", "karma-typescript"],
    browsers: ["Chrome"]
  });
};
