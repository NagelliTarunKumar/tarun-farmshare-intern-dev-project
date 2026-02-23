import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveBasePath(): string {
  // In GitHub Actions this is typically "owner/repo".
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const supportedRepos = new Set([
    "farmshare-intern-dev-project",
    "tarun-farmshare-intern-dev-project",
  ]);

  if (repository && supportedRepos.has(repository)) {
    return `/${repository}/`;
  }

  // Keep legacy GH Pages path as fallback for compatibility.
  if (process.env.GITHUB_ACTIONS === "true") {
    return "/farmshare-intern-dev-project/";
  }

  // Local/dev fallback.
  return "/";
}

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
});
