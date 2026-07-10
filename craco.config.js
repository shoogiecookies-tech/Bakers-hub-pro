const { getLoaders, loaderByName } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const { matches } = getLoaders(webpackConfig, loaderByName('postcss-loader'));
      matches.forEach(({ loader }) => {
        loader.options.postcssOptions.plugins = [require('@tailwindcss/postcss')];
      });
      return webpackConfig;
    },
  },
};
