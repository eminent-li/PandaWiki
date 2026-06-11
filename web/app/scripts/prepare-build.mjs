import { existsSync, lstatSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(scriptDir);
const staleAppDir = join(appDir, 'app');

if (existsSync(staleAppDir) && lstatSync(staleAppDir).isDirectory()) {
  rmSync(staleAppDir, { recursive: true, force: true });
}
