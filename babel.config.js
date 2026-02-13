module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      development: {},
      production: {
        plugins: ["transform-remove-console"]
      }
    },
    plugins: [
      ["react-native-worklets-core/plugin"],
    ],
  };
};
