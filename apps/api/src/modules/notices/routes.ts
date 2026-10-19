import {
  CreateNoticeBody,
  Id,
  NoticesQuery,
  PatchNoticeBody,
  type Notice,
  type Paged,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { createNotice, listNotices, patchNotice } from "./service";

export const noticeRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/notices",
    handler: async (req) => {
      await requireUser(req);
      const query = parse(NoticesQuery, req.query);
      return ok((await listNotices(query)) satisfies Paged<Notice>);
    },
  },
  {
    method: "POST",
    path: "/api/notices",
    handler: async (req) => {
      const coordinator = await requireUser(req, "coordinator");
      const body = parse(CreateNoticeBody, req.body);
      return ok((await createNotice(coordinator, body)) satisfies Notice, 201);
    },
  },
  {
    method: "PATCH",
    path: "/api/notices/{id}",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      const body = parse(PatchNoticeBody, req.body);
      return ok((await patchNotice(id, body)) satisfies Notice);
    },
  },
];
