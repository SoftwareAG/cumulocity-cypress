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

export function isAuth(obj: any): obj is C8yAuthOptions {
  return obj && _.isObjectLike(obj) && obj.user && obj.password;
}
