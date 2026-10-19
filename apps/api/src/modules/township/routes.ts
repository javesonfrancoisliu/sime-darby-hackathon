import { PutTownshipBody, type Township } from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { readTownship, saveTownship } from "./service";

export const townshipRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/township",
    // Public: the signed-out screens show the security line too.
    handler: async () => ok((await readTownship()) satisfies Township),
  },
  {
    method: "PUT",
    path: "/api/township",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(PutTownshipBody, req.body);
      return ok((await saveTownship(body)) satisfies Township);
    },
  },
];
