# GitHub Pages Deployment Design

## Goal

Publish the existing Vite game at `https://maibaaaaa1.github.io/cell-game/` without running a local development server. Future pushes to `main` should redeploy automatically.

## Approach

Use GitHub Actions to install dependencies, build the static site, upload `dist`, and deploy it through GitHub Pages. Configure Vite's production base path as `/cell-game/` so generated JavaScript and CSS URLs resolve under the repository subpath while development keeps its existing behavior.

## Components

- `vite.config.ts`: select the GitHub Pages base path for production builds.
- `.github/workflows/deploy-pages.yml`: build and deploy on pushes to `main`, with manual dispatch support.
- GitHub Pages repository setting: use GitHub Actions as the deployment source.

## Data Flow

1. A commit reaches `main`.
2. GitHub Actions installs locked dependencies and runs the production build.
3. The workflow uploads `dist` as a Pages artifact.
4. GitHub Pages publishes the artifact at the permanent game URL.

## Failure Handling

The workflow stops on dependency or build errors and does not replace the last successful deployment. Concurrency settings cancel an older in-progress deployment when a newer commit arrives.

## Verification

- Confirm the workflow completes successfully.
- Confirm the public URL returns HTTP 200.
- Confirm the built JavaScript and CSS assets load from `/cell-game/`.
- Confirm the game renders in a browser without relying on a local server.
