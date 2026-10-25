import { execSync } from 'node:child_process';
import './env';

/** Bring the test database schema up to date (non-destructive; suites truncate their own data). */
export default function setup(): void {
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
}
