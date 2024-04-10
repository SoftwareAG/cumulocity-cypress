import _ from "lodash";
import {
  BasicAuth,
  CookieAuth,
  IAuthentication,
  ICredentials,
} from "@c8y/client";
import { getAuthOptions } from "../lib/utils";

export interface C8yAuthOptions extends ICredentials {
  sendImmediately?: boolean;
  bearer?: (() => string) | string;
  userAlias?: string;
  type?: string;
  xsfrToken?: string;
}

export type C8yAuthentication = IAuthentication;

export function isAuth(obj: any): obj is C8yAuthOptions {
  return obj && _.isObjectLike(obj) && obj.user && obj.password;
}

/**
 * Gets and implementation of IAuthentication from the given auth options.
 */
export function getC8yClientAuthentication(
  auth: C8yAuthOptions | string | IAuthentication | undefined
): IAuthentication | undefined {
  let authOptions: C8yAuthOptions | undefined;
  let result: IAuthentication | undefined;

  if (auth) {
    if (_.isString(auth)) {
      authOptions = getAuthOptions(auth);
    } else if (_.isObjectLike(auth)) {
      if ("logout" in auth) {
        result = auth as IAuthentication;
      } else {
        authOptions = auth as C8yAuthOptions;
      }
    }
  }

  if (!result) {
    const cookieAuth = new CookieAuth();
    const token: string = _.get(
      cookieAuth.getFetchOptions({}),
      "headers.X-XSRF-TOKEN"
    );
    if (token?.trim() && !_.isEmpty(token.trim())) {
      result = cookieAuth;
    } else if (authOptions) {
      result = new BasicAuth(authOptions);
    }
  }

  return result;
}
