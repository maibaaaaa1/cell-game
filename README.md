# 免疫细胞大作战 V2.0 - 上瘾强化版

HTML5网页版塔防小游戏：植物大战僵尸 × 人体免疫系统 × 健康科普。

## 技术栈

- React
- TypeScript
- Vite
- Phaser 3
- TailwindCSS
- LocalStorage
- Vercel 静态部署

## 本地运行

```bash
corepack pnpm install
corepack pnpm run dev
```

打开终端显示的本地地址即可游玩。

如果内存不足，可以不启动本地预览，只执行构建检查：

```bash
corepack pnpm run build
```

## 当前V2.0内容

- 首页、关卡选择、图鉴、成就、设置
- 3张可挑战地图：鼻腔、咽喉、肺部
- 9行 × 5列塔位
- 6种免疫细胞：巨噬细胞、树突细胞、NK细胞、B细胞、CD4辅助T细胞、CD8杀伤T细胞
- 5种常规敌人与Boss癌王
- 20波敌人、ATP资源、生命值、升级系统
- 主动技能：发烧模式、疫苗接种、CAR-T疗法
- 随机事件与本地图鉴/成就存档
- Combo连击、x3/x5/x10阶段奖励与免疫风暴
- 5-10秒微奖励、多巴胺浮字、屏幕震动与闪白释放
- 随机掉落：ATP暴击、攻速Buff、伤害Buff、冷却减少
- 癌细胞强化AI：复制、假死、低血量狂暴、压迫视觉
- 拖拽/点击部署、塔位高亮、路线箭头、暂停菜单、图鉴详情

## 目录结构

```text
src/
  assets/
  components/
  configs/
  entities/
  game/
  scenes/
  systems/
  types/
```

## 部署

推送到 GitHub 后，在 Vercel 导入项目，构建命令使用 `npm run build`，输出目录为 `dist`。

## 下载与升级

见 [UPGRADE.md](./UPGRADE.md)。
