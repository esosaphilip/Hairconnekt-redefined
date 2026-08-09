import { execFile } from 'node:child_process';
import { platform } from 'node:process';

const npm = platform === 'win32' ? 'npm.cmd' : 'npm';

const BUILD_TIME_ONLY_PACKAGES = new Set([
  '@expo/cli',
  '@expo/metro',
  '@expo/metro-config',
  '@react-native/community-cli-plugin',
  'metro',
  'metro-config',
  'metro-transform-worker',
  'metro-minify-terser',
  'metro-minify-uglify',
  'metro-minify-esbuild',
  'metro-cache',
  'metro-cache-key',
  'metro-file-map',
  'metro-resolver',
  'metro-runtime',
  'metro-source-map',
  'metro-symbolicate',
  'metro-inspector-proxy',
  'metro-babel-transformer',
  'metro-hermes-compiler',
]);

const BREAKING_MAJOR_UPGRADE_NAMES = new Set([
  'expo',
  'react-native',
  'expo-splash-screen',
  'expo-asset',
  'expo-modules-core',
  'expo-constants',
]);

function getAllStringVias(v) {
  const arr = [];
  for (const item of (v && Array.isArray(v.via) ? v.via : []) || []) {
    if (typeof item === 'string') arr.push(item);
  }
  return arr;
}

function hasAnyDirectAdvisory(v) {
  for (const item of (v && Array.isArray(v.via) ? v.via : []) || []) {
    if (item && typeof item === 'object' && item.source === 'advisory') return true;
  }
  return false;
}

execFile(
  npm,
  ['audit', '--omit=dev', '--audit-level=high', '--json'],
  { maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
  (err, stdout, stderr) => {
    let data;
    try {
      data = JSON.parse(stdout);
    } catch (_) {
      process.stderr.write(stderr);
      process.stdout.write(stdout);
      process.exit(1);
    }

    const vulns = (data && data.vulnerabilities) || {};
    const blocked = [];
    const suppressed = [];

    for (const [name, v] of Object.entries(vulns)) {
      const severity = String(v?.severity || 'unknown');
      if (severity === 'critical') {
        blocked.push({ name, severity, why: 'CRITICAL always blocks' });
        continue;
      }
      if (severity !== 'high') {
        continue;
      }
      const directAdvisories =
        (v && Array.isArray(v.via)
          ? v.via.filter((x) => x && typeof x === 'object' && x.source === 'advisory')
          : []) || [];

      const isBuildTimeOnly =
        BUILD_TIME_ONLY_PACKAGES.has(name) ||
        (name.startsWith('metro')) ||
        name === 'image-size';
      const allStringVias = getAllStringVias(v);
      const allViaPointToBuildTime =
        allStringVias.length > 0 &&
        !hasAnyDirectAdvisory(v) &&
        allStringVias.every((n) => BUILD_TIME_ONLY_PACKAGES.has(n));

      const fix = v && typeof v.fixAvailable === 'object' ? v.fixAvailable : null;
      const fixIsBreakingExpoOrRnUpgrade =
        fix && fix.isSemVerMajor === true && BREAKING_MAJOR_UPGRADE_NAMES.has(fix.name);

      if (isBuildTimeOnly || allViaPointToBuildTime || fixIsBreakingExpoOrRnUpgrade) {
        suppressed.push({
          name,
          severity,
          advisories: directAdvisories.map((a) => a.url?.split('/').pop() || a.title).join(','),
          stringVias: allStringVias.join(','),
          fix: fix ? JSON.stringify(fix) : String(v?.fixAvailable),
        });
      } else {
        blocked.push({
          name,
          severity,
          why: 'HIGH not matched by any build-time / breaking-major-upgrade suppression rule',
          directAdvisoryCount: directAdvisories.length,
          stringVias: allStringVias.join(','),
          fix: fix ? JSON.stringify(fix) : String(v?.fixAvailable),
        });
      }
    }

    if (suppressed.length > 0) {
      process.stdout.write(
        'Suppressed HIGH vulns (build-time metro/expo toolchain packages OR all via-refs point to build-time packages OR only fix is a breaking Expo/React Native SDK major upgrade requiring --force). Follow-up decision required: upgrade expo/react-native SDKs intentionally.\n',
      );
      for (const s of suppressed) {
        process.stdout.write(
          `  - [${s.severity}] ${s.name} advisories=${s.advisories || '<none, chain-only>'} via=${s.stringVias || 'n/a'} fix=${s.fix}\n`,
        );
      }
    }

    if (blocked.length > 0) {
      process.stderr.write(`BLOCKED VULNERABILITIES (${blocked.length}):\n`);
      for (const b of blocked) {
        process.stderr.write(
          `  - [${b.severity}] ${b.name} (${b.why}) directAdvisories=${b.directAdvisoryCount} via=${b.stringVias} fix=${b.fix}\n`,
        );
      }
      process.exit(1);
    }

    const npmCode = err && typeof err === 'object' && 'code' in err ? err.code : 0;
    process.stdout.write(
      `Audit OK — suppressed=${suppressed.length} blocked=${blocked.length} (raw npm audit exit code: ${String(npmCode)})\n`,
    );
    process.exit(0);
  },
);
