const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const githubBasePath =
  process.env.GITHUB_ACTIONS === "true" &&
  repositoryName &&
  !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}`
    : "";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? githubBasePath;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  agentRules: false,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
