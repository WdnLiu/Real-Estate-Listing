import { execSync } from 'child_process';

export default function () {
  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
