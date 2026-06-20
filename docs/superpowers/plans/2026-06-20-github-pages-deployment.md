# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the game at `https://maibaaaaa1.github.io/cell-game/` and automatically redeploy every push to `main`.

**Architecture:** Vite uses a dedicated `github-pages` build mode to emit repository-relative asset URLs. A GitHub Actions workflow installs locked dependencies, builds `dist`, uploads the Pages artifact, and deploys it with GitHub's official Pages actions.

**Tech Stack:** Vite 6, React 19, Phaser 3, pnpm 10, GitHub Actions, GitHub Pages

---

### Task 1: Configure the GitHub Pages asset base

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Record the failing production-path check**

Run:

```bash
rg 'github-pages|/cell-game/' vite.config.ts
```

Expected: no matches and exit code 1.

- [ ] **Step 2: Add a mode-specific base path**

Replace the Vite configuration export with:

```ts
export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/cell-game/" : "/",
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    target: "es2020"
  }
}));
```

- [ ] **Step 3: Verify the path check passes**

Run:

```bash
rg 'github-pages.*cell-game' vite.config.ts
```

Expected: one matching line and exit code 0.

### Task 2: Add the remote Pages deployment workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Add the workflow**

Create `.github/workflows/deploy-pages.yml` with:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm run build -- --mode github-pages
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate repository formatting**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit deployment configuration**

```bash
git add vite.config.ts .github/workflows/deploy-pages.yml
git commit -m "Deploy game with GitHub Pages"
```

### Task 3: Publish and verify the permanent URL

**Files:**
- No local file changes

- [ ] **Step 1: Push the deployment commit**

Run:

```bash
git push origin main
```

Expected: `main -> main` succeeds.

- [ ] **Step 2: Enable GitHub Pages workflow builds**

Run:

```bash
gh api --method POST repos/maibaaaaa1/cell-game/pages -f build_type=workflow
```

Expected: repository Pages metadata containing `build_type: workflow`. If Pages already exists, query it with `gh api repos/maibaaaaa1/cell-game/pages` and confirm the same setting.

- [ ] **Step 3: Wait for the deployment workflow**

Run:

```bash
gh run watch --repo maibaaaaa1/cell-game --exit-status
```

Expected: the latest `Deploy GitHub Pages` run completes successfully.

- [ ] **Step 4: Verify the public game and assets**

Run:

```bash
curl --fail --location --silent --show-error https://maibaaaaa1.github.io/cell-game/
```

Expected: HTML containing the Vite application root and asset URLs under `/cell-game/`.

- [ ] **Step 5: Confirm repository state**

Run:

```bash
git status -sb
git ls-remote origin refs/heads/main
```

Expected: clean tracking state and the same local/remote commit hash.
