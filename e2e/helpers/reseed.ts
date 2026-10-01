import { execSync } from 'child_process';
import { resolve } from 'path';

// Remet DB + bucket de dev dans l'état du seed (~3 s, fonctionne API lancée)
export function reseed(): void {
  execSync('npm run seed', { cwd: resolve(__dirname, '../..'), stdio: 'pipe' });
}
