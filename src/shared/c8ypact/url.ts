import { C8yPactRecord } from "./c8ypact";
import _ from "lodash";

export function isURL(obj: any): obj is URL {
  return obj instanceof URL;
}

export function relativeURL(url: URL | string): string {
  const u = isURL(url) ? url : new URL(url);
  return u.pathname + u.search;
}

export function removeBaseUrlFromString(url: string, baseUrl?: string): string {
  if (!url || !baseUrl) {
    return url;
  }
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  let result = url.replace(normalizedBaseUrl, "");
  if (_.isEmpty(normalizedBaseUrl)) {
    result = "/";
  }
  return result;
}

export function removeBaseUrlFromRequestUrl(
  record: C8yPactRecord,
  baseUrl?: string
): void {
  if (!record?.request?.url || !baseUrl || !_.isString(baseUrl)) {
    return;
  }
  record.request.url = removeBaseUrlFromString(record.request.url, baseUrl);
}
