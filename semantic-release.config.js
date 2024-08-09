module.exports = {
  branches: [
    "main",
    {
      name: "release/v*",
      channel: (name) => name.replace(/^release\/v/, ""),
    },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
        pkgRoot: "dist/",
      },
    ],
    // "@semantic-release/github",
    // [
    //   "@semantic-release/git",
    //   {
    //     assets: ["CHANGELOG.md", "package.json"],
    //     message:
    //       "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
    //   },
    // ],
    [
      "@semantic-release/exec",
      {
        prepareCmd: "npm run package",
      },
    ],
  ],
};
