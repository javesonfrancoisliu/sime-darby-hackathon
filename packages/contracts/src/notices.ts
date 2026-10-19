import { z } from "zod";
import { Area, Id, IsoDateTime } from "./common";
import { PagingQuery } from "./paging";

export const NoticeKind = z.enum(["maintenance", "update"]);
export type NoticeKind = z.infer<typeof NoticeKind>;

export const MaintenanceStatus = z.enum(["scheduled", "in_progress", "completed"]);
export type MaintenanceStatus = z.infer<typeof MaintenanceStatus>;

export const Priority = z.enum(["normal", "high"]);
export type Priority = z.infer<typeof Priority>;

const Text = z.string().trim().min(1);

// Maintenance-only fields (windowStart, windowEnd, impact, status) are absent on updates.
export const Notice = z.object({
  id: Id,
  kind: NoticeKind,
  title: Text.max(120),
  description: z.string().trim().max(2000),
  area: Area,
  topic: Text.max(40),
  priority: Priority,
  source: Text.max(80),
  publishedAt: IsoDateTime,
  windowStart: IsoDateTime.optional(),
  windowEnd: IsoDateTime.optional(),
  impact: z.string().trim().max(500).optional(),
  status: MaintenanceStatus.optional(),
  createdBy: Id,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Notice = z.infer<typeof Notice>;

export const CreateNoticeBody = Notice.pick({
  kind: true,
  title: true,
  area: true,
  topic: true,
  source: true,
  windowStart: true,
  windowEnd: true,
  impact: true,
  status: true,
})
  .extend({
    description: Notice.shape.description.default(""),
    priority: Priority.default("normal"),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.kind === "maintenance") {
      if (!body.windowStart || !body.windowEnd) {
        ctx.addIssue({ code: "custom", message: "Maintenance needs windowStart and windowEnd" });
      } else if (Date.parse(body.windowStart) >= Date.parse(body.windowEnd)) {
        ctx.addIssue({ code: "custom", message: "windowStart must be before windowEnd" });
      }
    } else if (body.windowStart || body.windowEnd || body.impact || body.status) {
      ctx.addIssue({
        code: "custom",
        message: "Window, impact and status are for maintenance only",
      });
    }
  });
export type CreateNoticeBody = z.infer<typeof CreateNoticeBody>;

export const PatchNoticeBody = Notice.pick({
  title: true,
  description: true,
  area: true,
  topic: true,
  priority: true,
  source: true,
  windowStart: true,
  windowEnd: true,
  impact: true,
  status: true,
})
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });
export type PatchNoticeBody = z.infer<typeof PatchNoticeBody>;

export const NoticesQuery = PagingQuery.extend({ kind: NoticeKind.optional() });
export type NoticesQuery = z.infer<typeof NoticesQuery>;
