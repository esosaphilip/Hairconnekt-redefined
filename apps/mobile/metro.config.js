const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (config.resolver) {
  config.resolver.useWatchman = false;
}

if (config.watcher) {
  config.watcher.useWatchman = false;
}

module.exports = config;
