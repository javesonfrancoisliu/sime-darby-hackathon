import { apiFetch } from "@sdh/api-client";
import type { Notice, NoticeKind, Paged } from "@sdh/contracts";

export const noticesApi = {
  async list(kind: NoticeKind): Promise<Notice[]> {
    return (await apiFetch<Paged<Notice>>(`/api/notices?kind=${kind}`)).items;
  },
};
