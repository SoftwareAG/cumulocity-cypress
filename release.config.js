module.exports = {
  branches: [
    { name: "release/v+([0-9])?(.{+([0-9]),x}).x", prerelease: false },
    { name: "main", prerelease: false },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
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
