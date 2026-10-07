// PostToolUse (Edit/Write) : formate et corrige le lint du fichier que Claude vient de modifier.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (!file || relative(root, file).startsWith('..')) process.exit(0);

const run = (cmd, args) => {
  try {
    execFileSync('npx', [cmd, ...args, file], { cwd: root, stdio: 'pipe' });
  } catch {
    /* le hook Stop remonte les erreurs restantes */
  }
};
if (/\.(ts|tsx|js|mjs|json|css|ya?ml)$/.test(file)) run('prettier', ['--write', '--ignore-unknown']);
if (/\.(ts|tsx)$/.test(file)) run('eslint', ['--fix']);
