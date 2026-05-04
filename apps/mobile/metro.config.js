const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (config.watcher) {
  delete config.watcher.useWatchman;
  delete config.watcher.unstable_workerThreads;
}

module.exports = config;
