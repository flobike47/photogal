// Stop : avant de rendre la main, vérifie typecheck + lint (+ tests API si l'API a changé).
// En cas d'échec, sort en code 2 : Claude reçoit les erreurs et doit les corriger.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
if (input.stop_hook_active) process.exit(0); // déjà relancé une fois par ce hook : ne pas boucler

const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const changed = execSync('git status --porcelain', { cwd, encoding: 'utf8' })
  .split('\n')
  .map((l) => l.slice(3).trim())
  .filter((f) => /\.(ts|tsx)$/.test(f));
if (changed.length === 0) process.exit(0);

const steps = ['npm run typecheck', 'npm run lint'];
if (changed.some((f) => f.startsWith('apps/api/'))) steps.push('npm test');

for (const cmd of steps) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
    process.stderr.write(`\`${cmd}\` échoue. Corrige avant de terminer :\n${out}\n`);
    process.exit(2);
  }
}
