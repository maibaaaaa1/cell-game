# 下载与升级说明

## 下载

```bash
git clone <你的GitHub仓库地址>
cd <仓库目录>
corepack pnpm install
corepack pnpm run dev
```

## 升级

每次升级建议按这个流程：

```bash
git pull
corepack pnpm install
corepack pnpm run build
```

## 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库
2. Framework 选择 Vite
3. Build Command 使用 `npm run build` 或 `corepack pnpm run build`
4. Output Directory 使用 `dist`

## 版本记录

- V2.0：Combo连击、微奖励、随机掉落、癌细胞强化AI、危险/清屏反馈、拖拽部署、暂停菜单、图鉴详情。
