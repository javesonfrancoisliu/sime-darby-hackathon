import {
  installFakeApi as installSharedFakeApi,
  signInAs as signInAsUser,
} from "@sdh/api-client/testing";

import { ELDER } from "./fixtures";

type Routes = Parameters<typeof installSharedFakeApi>[0];

// The resident is signed in by default, so /api/me answers with the fixture elder.
export function installFakeApi(routes: Routes = {}) {
  return installSharedFakeApi({ "GET /api/me": { body: ELDER }, ...routes });
}

export function signInAs(userId: string = ELDER.id) {
  signInAsUser(userId);
}
