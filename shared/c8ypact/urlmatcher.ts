import _ from "lodash";

export interface C8yPactUrlMatcher {
  /**
   * List of parameters to ignore when matching urls.
   * Default parameters ignored are dateFrom, dateTo and _.
   */
  ignoreParameters: string[];

  /**
   * Matches two urls. Returns true if the urls match, false otherwise.
   *
   * @param url1 First url to match.
   * @param url2 Second url to match.
   */
  match: (url1: string | URL, url2: string | URL) => boolean;
}

/**
 * Default implementation of C8yPactUrlMatcher. URL matching can be configured
 * to ignore certain parameters (such as dateFrom, dateTo, etc.).
 */
export class C8yDefaultPactUrlMatcher implements C8yPactUrlMatcher {
  ignoreParameters: string[] = [];
  baseUrl: string;
  constructor(ignoreParameters: string[] = [], baseUrl: string = "") {
    this.ignoreParameters = ignoreParameters;
    this.baseUrl = baseUrl;
  }

  match(url1: string | URL, url2: string | URL): boolean {
    if (!url1 || !url2) return false;
    const normalizeUrl = (
      url: string | URL,
      parametersToRemove: string[] = []
    ) => {
      const urlObj = isURL(url) ? url : new URL(decodeURIComponent(url));
      parametersToRemove.forEach((name) => {
        urlObj.searchParams.delete(name);
      });
      return decodeURIComponent(urlObj.toString()?.replace(this.baseUrl, ""));
    };

    return _.isEqual(
      normalizeUrl(url1, this.ignoreParameters),
      normalizeUrl(url2, this.ignoreParameters)
    );
  }
}

function isURL(obj: any): obj is URL {
  return obj instanceof URL;
}
