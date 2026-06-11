import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(scriptDir);
const webDir = dirname(appDir);
const outputDir = join(appDir, 'dist', 'runtime-deploy');
const envFile = join(appDir, '.env');
const deployArgs = [
  'deploy',
  '--legacy',
  '--filter',
  'panda-wiki-app',
  '--prod',
  outputDir,
];
const spawnCommand = process.platform === 'win32' ? 'cmd' : 'pnpm';
const spawnArgs =
  process.platform === 'win32' ? ['/c', 'pnpm', ...deployArgs] : deployArgs;

rmSync(outputDir, { recursive: true, force: true });

execFileSync(spawnCommand, spawnArgs, {
  cwd: webDir,
  stdio: 'inherit',
});

if (existsSync(envFile)) {
  copyFileSync(envFile, join(outputDir, '.env'));
}
