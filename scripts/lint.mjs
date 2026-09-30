// lint 包装脚本：执行 vue-tsc 类型检查，忽略 pnpm 透传的附加参数（如 --quiet）
import { spawnSync } from 'node:child_process';

const result = spawnSync('vue-tsc', ['--noEmit'], {
  stdio: 'inherit',
  cwd: new URL('..', import.meta.url).pathname,
});

process.exit(result.status ?? 1);

