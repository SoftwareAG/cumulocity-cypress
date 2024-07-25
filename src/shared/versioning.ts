import * as semver from "semver";

import lodash1 from "lodash";
import * as lodash2 from "lodash";
const _ = lodash1 || lodash2;

/**
 * A configuration option for required versions. It is an array of semver ranges or `null` to allow
 * version without specifying a range.
 */
export type C8yRequireConfigOption = (string | null)[];

/**
 * Checks if the given version satisfies the requirements provided as an array of semver ranges.
 * If no required ranges are provided or range is empty, `true` is returned.
 * @param version - The version to check as a string or SemVer object.
 * @param requires - The required versions as semver ranges or `null` to allow version without specifying a range.
 * @returns `true` if the version satisfies the requirements, `false` otherwise.
 */
export function isVersionSatisfyingRequirements(
  version?: string | semver.SemVer,
  requires?: C8yRequireConfigOption
): boolean {
  if (!requires || !_.isArrayLike(requires) || _.isEmpty(requires)) return true;
  if (requires.length === 1 && _.first(requires) == null) return true;

  let result = true;
  if (version != null) {
    const requiredRanges = getRangesSatisfyingVersion(version, requires);
    result = !_.isEmpty(requiredRanges);
  } else {
    // null is a special placeholder to mark the test to be executed if NO system version
    // is configured. Used for example for mocked tests with cy.intercept.
    result = requires?.includes(null);
  }
  return result;
}

/**
 * Returns the required semver ranges that are satisfied by the given version.
 * @param version - The version to check as a string or SemVer object.
 * @param requires - The required versions as semver ranges or `null` to allow version without specifying a range.
 * @returns The ranges that are satisfied by the version.
 */
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

/**
 * Returns the minimum satisfying version for the given version and required ranges. If there is
 * more than one range that is satisfied by the version, the minimum version is returned.
 * @param version - The version to check as a string or SemVer object.
 * @param ranges - The required versions as semver ranges or `null` to allow version without specifying a range.
 * @returns The minimum satisfying version.
 */
export function getMinSatisfyingVersion(
  version: string | semver.SemVer,
  ranges: (string | null)[]
): semver.SemVer | undefined {
  const minVersions = getMinSatisfyingVersions(version, ranges);
  return _.first(minVersions);
}

/**
 * Returns all minimum satisfying versions for the given version and required ranges.
 * @param version - The version to check as a string or SemVer object.
 * @param ranges - The required versions as semver ranges or `null` to allow version without specifying a range.
 * @returns All minimum satisfying versions for the given ranges sorted in ascending order.
 */
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
        const coercedVersion = semver.coerce(version) ?? version;
        if (semver.satisfies(coercedVersion, range)) {
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

/**
 * Returns the minimized version string for the given version. Trailing `.0` patch versions or
 * `.0.0` minor versions and patch versions are omitted. If the version is a prerelease or build version,
 * the full version is returned.
 * @param version - The version to minimize as a string or SemVer object.
 * @returns The minimized version string.
 */
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

/**
 * Converts the given version to a semver compatible version string. This is for
 * example converting `1.2` to `1.2.0`.
 * @param version - The version to convert.
 * @returns The semver version string.
 */
export function toSemverVersion(version: string) {
  if (version == null) return undefined;

  // version could possibly be a number, make sure to always convert to string
  const result = semver.coerce(version.toString());
  return result?.toString();
}

function filterNonNull<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item !== null) as T[];
}
