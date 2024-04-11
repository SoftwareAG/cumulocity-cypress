/// <reference types="cypress" />

import _ from "lodash";
import { IAuthentication, ICredentials } from "@c8y/client";

export interface C8yAuthOptions extends ICredentials {
  sendImmediately?: boolean;
  bearer?: (() => string) | string;
  userAlias?: string;
  type?: string;
  xsfrToken?: string;
}

export type C8yAuthentication = IAuthentication;

/**
 * Checks if the given object is a C8yAuthOptions and contains at least a user
 * and a type or userAlias property.
 *
 * @param obj The object to check.
 * @returns True if the object is a C8yAuthOptions, false otherwise.
 */
export function isAuthOptions(obj: any): obj is C8yAuthOptions {
  return (
    _.isObjectLike(obj) &&
    "user" in obj &&
    ("type" in obj || "userAlias" in obj)
  );
}
