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
  User,
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

export const SYNTHETIC_COORDINATOR_ID = "00000000-0000-0000-0000-000000000000";

// Stands in for a coordinator so createdBy is filled; it is never written to the table.
export function syntheticCoordinator(nowIso: string = new Date().toISOString()): User {
  return User.parse({
    id: SYNTHETIC_COORDINATOR_ID,
    name: "Content loader",
    role: "coordinator",
    verification: "not_required",
    area: "Elmina",
    location: { lat: 3.0738, lng: 101.5183 },
    skills: [],
    experience: "",
    availability: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export interface DirectArgs {
  direct: boolean;
  table?: string;
  region?: string;
  yes: boolean;
}

function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  const value =
    i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
  const trimmed = value?.trim();
  return trimmed && !trimmed.startsWith("--") ? trimmed : undefined;
}

export function parseDirectArgs(argv: string[]): DirectArgs {
  return {
    direct: argv.includes("--direct"),
    table: flagValue(argv, "--table"),
    region: flagValue(argv, "--region"),
    yes: argv.includes("--yes"),
  };
}

export type DirectTarget =
  | { ok: true; table: string; region?: string; endpoint?: string; local: boolean }
  | { ok: false; error: string };

// Real AWS needs a table and a region; a loopback DYNAMODB_ENDPOINT means DynamoDB Local; any other endpoint is refused.
export function resolveDirectTarget(
  args: DirectArgs,
  env: Record<string, string | undefined>,
): DirectTarget {
  const table = args.table ?? env.TABLE_NAME?.trim();
  if (!table) return { ok: false, error: "Direct mode needs --table (or TABLE_NAME)" };
  const endpoint = env.DYNAMODB_ENDPOINT?.trim() || undefined;
  if (endpoint) {
    if (!isLoopbackUrl(endpoint)) {
      return {
        ok: false,
        error: "Refusing to run: DYNAMODB_ENDPOINT must be unset (AWS) or a loopback URL",
      };
    }
    return {
      ok: true,
      table,
      endpoint,
      local: true,
      ...(args.region ? { region: args.region } : {}),
    };
  }
  if (!args.region) return { ok: false, error: "Direct mode needs --region" };
  return { ok: true, table, region: args.region, local: false };
}

export function describeDirectTarget(target: Extract<DirectTarget, { ok: true }>): string {
  return target.local
    ? `DynamoDB Local at ${target.endpoint}, table ${target.table}`
    : `AWS DynamoDB, table ${target.table}, region ${target.region}`;
}

// What a dry run prints: the target and how many items of each type would be written.
export function dryRunLines(
  target: Extract<DirectTarget, { ok: true }>,
  content: ReturnType<typeof validateAllContent>,
): string[] {
  return [
    `Dry run (no changes). Direct mode would write to ${describeDirectTarget(target)}.`,
    `  township: 1`,
    `  notices: ${content.notices.length}`,
    `  safety readings: ${content.safetyReadings.length}`,
    `  facility reports: ${content.facilityReports.length}`,
    `  events: ${content.events.length}`,
    `  quizzes: 1`,
    `  challenges: ${content.challenges.length}`,
    `  rewards: ${content.rewards.length}`,
    `  badges: ${content.badges.length}`,
    "Add --yes to proceed.",
  ];
}
