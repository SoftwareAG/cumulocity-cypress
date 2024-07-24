import * as semver from "semver";

import lodash1 from "lodash";
import * as lodash2 from "lodash";
const _ = lodash1 || lodash2;

export type C8yRequireConfigOption = (string | null)[];

/**
 * Checks if the current test case is satisfying the version requirement defined in `requires` property of
 * `C8yPactConfigOptions`.
 * @returns True if the current test case is satisfying the version requirement, false otherwise.
 */
export function isVersionSatisfyingRequirements(
  version?: string | semver.SemVer,
  requires?: C8yRequireConfigOption
): boolean {
  if (!requires || !_.isArrayLike(requires) || _.isEmpty(requires)) return true;
  if (requires.length === 1 && _.first(requires) == null) return true;

  let skipTest = false;
  if (version != null) {
    const requiredRanges = getRangesSatisfyingVersion(version, requires);
    skipTest = _.isEmpty(requiredRanges);
  } else {
    // null is a special placeholder to mark the test to be executed if NO system version
    // is configured. Used for example for mocked tests with cy.intercept.
    skipTest = !requires?.includes(null);
  }
  return !skipTest;
}

export function getRangesSatisfyingVersion(
  version: semver.SemVer | string,
  requires?: (string | null)[]
): string[] {
  if (version == null || requires == null || _.isEmpty(requires)) {
    return [];
  }
  return filterNonNull(requires)
    .filter((v) => semver.satisfies(version, v))
    .filter((v) => v != null);
}

export function getMinSatisfyingVersion(
  version: string | semver.SemVer,
  ranges: (string | null)[]
): semver.SemVer | undefined {
  const minVersions = getMinSatisfyingVersions(version, ranges);
  return _.first(minVersions);
}

export function getMinSatisfyingVersions(
  version: string | semver.SemVer,
  ranges: (string | null)[]
): semver.SemVer[] {
  if (!version || !ranges || !_.isString(version) || !_.isArray(ranges)) {
    return [];
  }
  if (filterNonNull(ranges).length === 0) {
    return [];
  }
  if (_.isEmpty(ranges)) {
    const v = semver.coerce(version);
    return v ? [v] : [];
  }
  const minVersions = ranges.reduce(
    (acc: semver.SemVer[], range: string | null) => {
      if (range != null && _.isString(range)) {
        if (semver.satisfies(version, range)) {
          const v = semver.minVersion(range);
          if (v) acc.push(v);
        }
      } else {
        const v = semver.coerce(version);
        if (v) acc.push(v);
      }
      return acc;
    },
    []
  );

  return semver.sort(minVersions);
}

export function getMinimizedVersionString(version: string | semver.SemVer) {
  const semVerObj = _.isString(version) ? semver.parse(version) : version;
  if (semVerObj == null) return undefined;

  const props = ["major", "minor", "patch", "prerelease", "build"];
  if (!props.every((prop) => prop in semVerObj)) {
    return undefined;
  }

  if (
    semVerObj.patch === 0 &&
    semVerObj.minor === 0 &&
    !semVerObj.prerelease.length &&
    !semVerObj.build.length
  ) {
    return `${semVerObj.major}`;
  } else if (
    semVerObj.patch === 0 &&
    !semVerObj.prerelease.length &&
    !semVerObj.build.length
  ) {
    return `${semVerObj.major}.${semVerObj.minor}`;
  } else {
    return semVerObj.version;
  }
}

export function toSemverVersion(version: string) {
  if (version == null) return undefined;

  // version could possibly be a number, make sure to always convert to string
  const result = semver.coerce(version.toString());
  return result?.toString();
}

function filterNonNull<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item !== null) as T[];
}
