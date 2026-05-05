const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function withAdiRegistration(config, props = {}) {
  const envVar = props.envVar ?? 'PLAY_ADI_REGISTRATION_SNIPPET';

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const snippet = String(process.env[envVar] ?? '').trim();
      if (!snippet) return config;

      const projectRoot = config.modRequest.projectRoot;
      const assetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
      await fs.promises.mkdir(assetsDir, { recursive: true });

      const filePath = path.join(assetsDir, 'adi-registration.properties');
      await fs.promises.writeFile(filePath, snippet, 'utf8');

      return config;
    },
  ]);
};
