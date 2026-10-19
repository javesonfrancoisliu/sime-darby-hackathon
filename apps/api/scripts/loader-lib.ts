// Pure helpers for load-content.ts, kept apart so tests can import them without running the loader.
import {
  CreateBadgeBody,
  CreateChallengeBody,
  CreateEventBody,
  CreateFacilityReportBody,
  CreateNoticeBody,
  CreateQuizBody,
  CreateRewardBody,
  PatchFacilityReportBody,
  PutSafetyReadingBody,
  PutTownshipBody,
} from "@sdh/contracts";
import type { ZodType } from "zod";
import * as content from "./content/index";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLoopbackUrl(url: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export type Auth = { kind: "bearer"; token: string } | { kind: "demo"; userId?: string };

export type AuthResult = { ok: true; auth: Auth } | { ok: false; error: string };

// Deployed URLs need a bearer token; loopback URLs use the demo header. The demo header never goes to a remote host.
export function resolveAuth(baseUrl: string, env: Record<string, string | undefined>): AuthResult {
  if (isLoopbackUrl(baseUrl)) {
    const userId = env.COORDINATOR_DEMO_USER_ID?.trim();
    return { ok: true, auth: { kind: "demo", ...(userId ? { userId } : {}) } };
  }
  if (!baseUrl.startsWith("https://")) {
    return { ok: false, error: "A non-local base URL must start with https://" };
  }
  const token = env.COORDINATOR_TOKEN?.trim();
  if (!token) return { ok: false, error: "COORDINATOR_TOKEN is not set" };
  return { ok: true, auth: { kind: "bearer", token } };
}

export function authHeaders(auth: Auth, userId?: string): Record<string, string> {
  if (auth.kind === "bearer") return { authorization: `Bearer ${auth.token}` };
  const id = auth.userId ?? userId;
  return id ? { "x-demo-user": id } : {};
}

export function parseBaseUrl(argv: string[]): string | undefined {
  const i = argv.indexOf("--base-url");
  const value = i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith("--base-url="))?.slice(11);
  return value ? value.replace(/\/+$/, "") : undefined;
}

// Only a short machine code is ever shown from an error body.
export function errorCodeOf(body: unknown): string {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return typeof code === "string" && /^[A-Z_]{1,40}$/.test(code) ? code : "UNKNOWN";
}

export function validate<T>(schema: ZodType<T>, label: string, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid ${label}: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`);
  }
  return result.data;
}

// A throwaway id so challenges that name a quiz validate before the quiz exists.
const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

// Validates every content item against its contract and returns the parsed bodies.
export function validateAllContent() {
  return {
    township: validate(PutTownshipBody, "township", content.township),
    notices: content.notices().map((n) => validate(CreateNoticeBody, `notice ${n.title}`, n)),
    safetyReadings: content
      .safetyReadings()
      .map((r) => validate(PutSafetyReadingBody, `reading ${r.type} ${r.area}`, r)),
    facilityReports: content.facilityReports.map((f) => ({
      body: validate(CreateFacilityReportBody, `facility report ${f.title}`, {
        title: f.title,
        area: f.area,
        category: f.category,
        description: f.description,
      }),
      status: validate(PatchFacilityReportBody, `facility status ${f.title}`, { status: f.status })
        .status!,
    })),
    events: content.volunteerDrives().map((e) => validate(CreateEventBody, `event ${e.title}`, e)),
    quiz: validate(CreateQuizBody, "quiz", content.ecoQuiz),
    challenges: content.challenges().map(({ quizTitle, ...c }) => ({
      quizTitle,
      body: validate(CreateChallengeBody, `challenge ${c.title}`, {
        ...c,
        ...(quizTitle ? { quizId: PLACEHOLDER_ID } : {}),
      }),
    })),
    rewards: content.rewards.map((r) => validate(CreateRewardBody, `reward ${r.title}`, r)),
    badges: content.badges.map((b) => validate(CreateBadgeBody, `badge ${b.title}`, b)),
  };
}
