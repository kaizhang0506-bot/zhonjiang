# 中奖 2.0版本

这是一个可导入扣子编程的 Next.js 项目。它根据用户在页面中录入的三位历史数字，按每个位置的历史出现频次排序，展示可选的数字组合；数据保存在当前浏览器的本地存储中。

## 扣子编程结构

- `.coze`：扣子编程项目与开发、部署命令配置
- `src/app`：Next.js App Router 页面与样式
- `scripts`：Windows 与 macOS/Linux 的准备、开发、校验、构建、启动脚本
- `package.json`：pnpm、Next.js 16、React 19 依赖声明

## 本地运行

```bash
pnpm install
pnpm validate
pnpm build
pnpm dev
```

扣子编程导入时请直接选择本项目导出的 `.tar.gz` 文件。
