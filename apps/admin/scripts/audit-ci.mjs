import { execFile } from 'node:child_process';
import { platform } from 'node:process';

/**
 * Admins use BrowserRouter + plain client-side axios requests.
 * React Router RSC / Actions / SSR / ScrollRestoration / prerender
 * features are NEVER loaded or reachable. All advisories listed below
 * apply only to those server-side features.
 *
 * Any CRITICAL advisory, OR any HIGH advisory on any dep OTHER THAN
 * react-router / react-router-dom (unless listed here), will still
 * FAIL the CI build. This list is reviewed with every dep upgrade.
 */
const RSC_ONLY_REACT_ROUTER_GHSAS = new Set([
  'GHSA-2j2x-hqr9-3h42',
  'GHSA-2w69-qvjg-hvjx',
  'GHSA-337j-9hxr-rhxg',
  'GHSA-49rj-9fvp-4h2h',
  'GHSA-84g9-w2xq-vcv6',
  'GHSA-8646-j5j9-6r62',
  'GHSA-8v8x-cx79-35w7',
  'GHSA-8x6r-g9mw-2r78',
  'GHSA-chx6-hx7r-mcp5',
  'GHSA-f22v-gfqf-p8f3',
  'GHSA-h5cw-625j-3rxh',
  'GHSA-h8fp-f39c-q6mh',
  'GHSA-jjmj-jmhj-qwj2',
  'GHSA-qwww-vcr4-c8h2',
  'GHSA-rxv8-25v2-qmq8',
  'GHSA-wrjc-x8rr-h8h6',
]);

const npm = platform === 'win32' ? 'npm.cmd' : 'npm';

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

    for (const [name, v] of Object.entries(vulns)) {
      if (!v || !Array.isArray(v.via)) continue;
      for (const via of v.via) {
        if (!via || typeof via !== 'object' || !via.url || via.source !== 'advisory') continue;
        const ghsa = String(via.url.split('/').pop());
        const severity = String(via.severity || v.severity || 'unknown');
        const isRR = name === 'react-router' || name === 'react-router-dom';
        const allowed = isRR && RSC_ONLY_REACT_ROUTER_GHSAS.has(ghsa);
        if (severity === 'critical' || !allowed) {
          blocked.push({ name, ghsa, severity, title: String(via.title || '') });
        }
      }
    }

    const suppressedCount = RSC_ONLY_REACT_ROUTER_GHSAS.size;
    process.stdout.write(
      `React Router GHSAs suppressed (RSC/SSR/Actions-only; app uses BrowserRouter+axios): ${suppressedCount}\n`,
    );

    if (blocked.length > 0) {
      process.stderr.write(`BLOCKED VULNERABILITIES (${blocked.length}):\n`);
      for (const b of blocked) {
        process.stderr.write(
          `- [${b.severity}] ${b.name} ${b.ghsa}: ${b.title}\n`,
        );
      }
      process.exit(1);
    }

    const npmCode = err && typeof err === 'object' && 'code' in err ? err.code : 0;
    process.stdout.write(`Audit OK (raw npm audit exit code: ${String(npmCode)})\n`);
    process.exit(0);
  },
);
