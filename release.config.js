module.exports = {
  branches: [
    {
      name: "release/v+([0-9])?(.{+([0-9]),x}).x",
      range: "${name.replace(/^release\\/v/g, '')}",
    },
    "main",
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { breaking: true, release: "major" },
          { revert: true, release: "patch" },
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "chore", release: "patch" },
          { type: "docs", release: "patch" },
        ],
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "npm pkg set version=${nextRelease.version} && npm pkg set version=${nextRelease.version} --ws && npx copyfiles CHANGELOG.md ./dist",
      },
    ],
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
        pkgRoot: "dist/",
        tarballDir: "./",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [{ path: "*.tgz", label: "Package (.tgz)" }],
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "packages/*/package.json", "CHANGELOG.md"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
