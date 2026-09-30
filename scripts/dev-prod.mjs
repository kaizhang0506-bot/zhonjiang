// dev-prod 启动器：确保 dist 存在后，以前台 uvicorn 托管生产形态（页面 + /api 同源）
// 供 `pnpm run dev` 使用，使沙箱守护进程拉起的预览即为公网可用的生产形态
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;

// 1) dist 不存在时先构建（pnpm install 由 .coze [dev].build 负责）
if (!existsSync(root + 'dist/index.html')) {
  console.log('[dev-prod] dist 不存在，先执行 pnpm run build ...');
  const buildResult = spawnSync('pnpm', ['run', 'build'], { stdio: 'inherit', cwd: root });
  if (buildResult.status !== 0) {
    console.error('[dev-prod] 构建失败，退出');
    process.exit(1);
  }
}

// 2) 前台启动 uvicorn（托管 dist + /api），端口读环境变量
const port = process.env.DEPLOY_RUN_PORT || '5000';
let stdioOption;
try {
  mkdirSync('/app/work/logs/bypass', { recursive: true });
  const logFd = openSync('/app/work/logs/bypass//app.log', 'a');
  stdioOption = ['ignore', logFd, logFd];
} catch {
  stdioOption = 'inherit';
}

console.log(`[dev-prod] 启动生产形态: uvicorn backend.main:app --port ${port}`);
const child = spawn(
  'python3',
  ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', port],
  { stdio: stdioOption, cwd: root },
);

child.on('exit', (code) => process.exit(code ?? 1));

const shutdown = () => {
  child.kill('SIGTERM');
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

