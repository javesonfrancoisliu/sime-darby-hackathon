import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Category,
  CreateMeBody,
  CreateRequestBody,
  PutMedicalIdBody,
  PutSettingsBody,
  UpdateMeBody,
} from "@sdh/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  CREDENTIAL_HEADING,
  ELDERS,
  PERSONAS,
  REQUESTS,
  REQUEST_TITLE_PREFIX,
  YOUTH,
  cognitoIdentity,
  emailFor,
  fileCredentialStore,
  generatePassword,
  httpCall,
  localIdentity,
  parseCredentialSection,
  planLines,
  resolveConfig,
  runFinish,
  runSeed,
  upsertCredentialSection,
  type CallFn,
  type Config,
  type CredentialStore,
  type Headers,
  type Persona,
} from "./demo-personas-lib";

const POOL = "ap-southeast-5_AbCdEf123";
const cognitoArgs = [
  "--cognito",
  "--base-url",
  "https://dev.example.com",
  "--user-pool-id",
  POOL,
  "--client-id",
  "client123",
  "--region",
  "ap-southeast-5",
  "--i-know-this-is-dev",
];
const okConfig = (argv: string[], env: Record<string, string> = {}) => {
  const res = resolveConfig(argv, env);
  if (!res.ok) throw new Error(res.error);
  return res.config;
};

describe("arguments and guards", () => {
  it("accepts a local loopback run and defaults to the seed dry run", () => {
    const c = okConfig(["--local", "--base-url", "http://localhost:3001/"]);
    expect(c).toMatchObject({
      mode: "local",
      pass: "seed",
      yes: false,
      baseUrl: "http://localhost:3001",
    });
  });
  it("ignores the bare -- that pnpm passes through", () => {
    expect(resolveConfig(["--", "--local", "--base-url", "http://localhost:3001"], {}).ok).toBe(
      true,
    );
  });
  it("refuses a local run against a remote host", () => {
    const res = resolveConfig(["--local", "--base-url", "https://dev.example.com"], {});
    expect(res.ok).toBe(false);
  });
  it("needs exactly one mode, a base url and a known pass", () => {
    expect(resolveConfig(["--base-url", "http://localhost:3001"], {}).ok).toBe(false);
    expect(
      resolveConfig(["--local", "--cognito", "--base-url", "http://localhost:3001"], {}).ok,
    ).toBe(false);
    expect(resolveConfig(["--local"], {}).ok).toBe(false);
    expect(
      resolveConfig(["--local", "--base-url", "http://localhost:3001", "--pass", "verify"], {}).ok,
    ).toBe(false);
    expect(resolveConfig(["--local", "--base-url", "http://localhost:3001", "--nope"], {}).ok).toBe(
      false,
    );
  });
  it("refuses a non-https non-loopback base url in cognito mode", () => {
    const args = cognitoArgs.map((a) =>
      a === "https://dev.example.com" ? "http://dev.example.com" : a,
    );
    expect(resolveConfig(args, {}).ok).toBe(false);
    expect(resolveConfig(cognitoArgs, {}).ok).toBe(true);
  });
  it("needs the dev acknowledgement and every cognito id", () => {
    expect(
      resolveConfig(
        cognitoArgs.filter((a) => a !== "--i-know-this-is-dev"),
        {},
      ).ok,
    ).toBe(false);
    expect(
      resolveConfig(
        cognitoArgs.filter((a) => a !== "--client-id" && a !== "client123"),
        {},
      ).ok,
    ).toBe(false);
  });
  it("refuses a pool id outside the allow pattern or region", () => {
    const swap = (id: string) => cognitoArgs.map((a) => (a === POOL ? id : a));
    expect(resolveConfig(swap("us-east-1_AbCdEf123"), {}).ok).toBe(false);
    expect(resolveConfig(swap("ap-southeast-5_Ab Cd"), {}).ok).toBe(false);
    expect(
      resolveConfig(cognitoArgs, { DEMO_POOL_ALLOW_PATTERN: "^ap-southeast-5_Other$" }).ok,
    ).toBe(false);
    expect(resolveConfig(cognitoArgs, { DEMO_POOL_ALLOW_PATTERN: "(" }).ok).toBe(false);
    expect(resolveConfig(cognitoArgs, { DEMO_POOL_ALLOW_PATTERN: `^${POOL}$` }).ok).toBe(true);
  });
  it("needs AWS_PROFILE only to apply", () => {
    expect(resolveConfig([...cognitoArgs, "--yes"], {}).ok).toBe(false);
    const c = okConfig([...cognitoArgs, "--yes"], { AWS_PROFILE: "javesonpersonal" });
    expect(c.cognito?.profile).toBe("javesonpersonal");
    expect(resolveConfig(cognitoArgs, {}).ok).toBe(true);
  });
});

describe("plan", () => {
  const config: Config = okConfig(["--local", "--base-url", "http://localhost:3001"]);
  it("lists counts, names and the flow without secrets", () => {
    const text = planLines(config).join("\n");
    expect(text).toContain("8 elderly residents and 10 youth volunteers");
    expect(text).toContain("Help requests (25");
    expect(text).toContain(PERSONAS[0]!.name);
    expect(text).toContain("--pass finish");
    expect(text).toContain("verified automatically");
    expect(text).toContain("Add --yes");
    expect(text.toLowerCase()).not.toContain("password:");
  });
  it("describes the finish pass and the credentials file in cognito mode", () => {
    const c = okConfig(cognitoArgs);
    expect(planLines({ ...c, pass: "finish" }).join("\n")).toContain("Finish pass");
    expect(planLines(c).join("\n")).toContain("docs/CREDENTIAL.md");
  });
});

describe("persona data", () => {
  it("has the required mix", () => {
    expect(ELDERS).toHaveLength(8);
    expect(YOUTH).toHaveLength(10);
    expect(REQUESTS).toHaveLength(25);
    expect(new Set(PERSONAS.map((p) => p.precinct)).size).toBe(4);
    expect(new Set(REQUESTS.map((r) => r.category))).toEqual(new Set(Category.options));
    expect(YOUTH.filter((p) => p.leaderboardOptIn).length).toBeGreaterThanOrEqual(7);
  });
  it("uses unique fictional emails and prefixed unique titles", () => {
    expect(new Set(PERSONAS.map((p) => p.email)).size).toBe(PERSONAS.length);
    for (const p of PERSONAS) expect(p.email).toMatch(/^[a-z]+\.[a-z]+@township-demo\.example$/);
    expect(emailFor("Nurul Aisyah binti Razak")).toBe("nurul.razak@township-demo.example");
    expect(new Set(REQUESTS.map((r) => r.title)).size).toBe(REQUESTS.length);
    for (const r of REQUESTS) expect(r.title.startsWith(REQUEST_TITLE_PREFIX)).toBe(true);
  });
  it("validates against the contracts", () => {
    for (const p of PERSONAS) {
      expect(
        CreateMeBody.safeParse({ role: p.role, name: p.name, precinct: p.precinct }).success,
      ).toBe(true);
      const patch = {
        area: p.area,
        skills: p.skills,
        experience: p.experience,
        availability: p.availability,
        interests: p.interests,
        languages: p.languages,
        leaderboardOptIn: p.leaderboardOptIn,
      };
      expect(UpdateMeBody.safeParse(patch).success).toBe(true);
      if (p.settings) expect(PutSettingsBody.safeParse(p.settings).success).toBe(true);
      if (p.medical) expect(PutMedicalIdBody.safeParse(p.medical).success).toBe(true);
    }
    for (const r of REQUESTS) {
      const parsed = CreateRequestBody.safeParse({
        category: r.category,
        title: r.title,
        description: r.description,
        scheduledAt: "2027-01-01T01:00:00.000Z",
        durationMinutes: r.durationMinutes,
        location: { lat: 3, lng: 101, area: "x" },
      });
      expect(parsed.success).toBe(true);
    }
  });
  it("never gives one volunteer two accepted requests at the same time", () => {
    const seen = new Set<string>();
    for (const r of REQUESTS) {
      if (!("volunteer" in r.stage) || r.stage.kind === "cancelled" || r.stage.kind === "withdrawn")
        continue;
      const key = `${r.stage.volunteer}:${JSON.stringify(r.when)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe("password and credentials file", () => {
  it("makes 24 character passwords with every class", () => {
    const a = generatePassword();
    expect(a).toHaveLength(24);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/\d/);
    expect(a).not.toBe(generatePassword());
  });
  it("replaces only its own section and round-trips", () => {
    const entries = new Map([
      ["a.b@township-demo.example", { password: "Pw1", role: "elder", name: "A B" }],
    ]);
    const base = "# Credentials\n\nkeep this\n\n## Other\n\nmore\n";
    const first = upsertCredentialSection(base, entries);
    expect(first).toContain("keep this");
    expect(first).toContain(CREDENTIAL_HEADING);
    expect(parseCredentialSection(first).get("a.b@township-demo.example")?.password).toBe("Pw1");
    entries.set("c.d@township-demo.example", { password: "Pw2", role: "volunteer", name: "C D" });
    const second = upsertCredentialSection(first, entries);
    expect(second.match(new RegExp(CREDENTIAL_HEADING.replace(/[()]/g, "\\$&"), "g"))).toHaveLength(
      1,
    );
    expect(parseCredentialSection(second).size).toBe(2);
    expect(second).toContain("## Other");
  });
  it("creates the file when missing, writes it private and keeps other content", () => {
    const dir = mkdtempSync(join(tmpdir(), "demo-personas-"));
    try {
      const path = join(dir, "CREDENTIAL.md");
      const store = fileCredentialStore(path);
      store.set(PERSONAS[0]!, "Secret1");
      store.save();
      expect(statSync(path).mode & 0o777).toBe(0o600);
      expect(readFileSync(path, "utf8")).toContain(CREDENTIAL_HEADING);
      expect(fileCredentialStore(path).get(PERSONAS[0]!.email)).toBe("Secret1");
      writeFileSync(path, `${readFileSync(path, "utf8")}\n## Later\n\nnotes\n`);
      store.save();
      expect(readFileSync(path, "utf8")).toContain("## Later");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("http errors", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reports only status and a short code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "CONFLICT", message: "token=abc" } }), {
            status: 409,
          }),
      ),
    );
    const err = (await httpCall("http://localhost:3001")("POST", "/api/x", {
      authorization: "Bearer secret-token",
    }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("POST /api/x failed: 409 CONFLICT");
    expect(JSON.stringify(err.message)).not.toContain("secret-token");
  });
});

// ---------- fakes ----------

interface FakeRequest {
  id: string;
  title: string;
  elderId: string;
  status: string;
  scheduledAt: string;
  volunteerId?: string;
  confirmedAt?: string;
}

function fakeApi(clock: { now: number }) {
  const users = new Map<string, Persona & { id: string; configured: boolean }>();
  const requests: FakeRequest[] = [];
  const checkedIn = new Set<string>();
  const calls: string[] = [];
  let seq = 0;
  const fail = (status: number, code: string): never => {
    throw new ApiError(status, code, `${status} ${code}`);
  };
  const subOf = (h: Headers): string => {
    const demo = h["x-demo-user"];
    if (demo) return demo;
    const bearer = h.authorization?.replace("Bearer ", "");
    return bearer ?? fail(401, "UNAUTHENTICATED");
  };
  const personaByName = (name: string) => PERSONAS.find((p) => p.name === name)!;

  const call: CallFn = async (method, path, headers, body) => {
    calls.push(`${method} ${path.split("?")[0]}`);
    const route = `${method} ${path.split("?")[0]}`;
    const b = (body ?? {}) as Record<string, unknown>;
    if (route === "GET /api/demo/users") {
      return { users: [...users.values()].map((u) => ({ id: u.id, name: u.name, role: u.role })) };
    }
    if (route === "POST /api/users") {
      const id = `local-${(seq += 1)}`;
      users.set(id, { ...personaByName(String(b.name)), id, configured: false });
      return { id };
    }
    if (route === "POST /api/me") {
      const sub = subOf(headers);
      if (users.has(sub)) fail(409, "CONFLICT");
      users.set(sub, { ...personaByName(String(b.name)), id: sub, configured: false });
      return {
        id: sub,
        verification: b.role === "volunteer" ? "verified" : "not_required",
        languages: [],
      };
    }
    const me = users.get(subOf(headers));
    if (route === "GET /api/me") {
      if (!me) return fail(403, "PROFILE_REQUIRED");
      return {
        id: me.id,
        verification: me.role === "volunteer" ? "verified" : "not_required",
        languages: me.configured ? ["en"] : [],
      };
    }
    if (!me) return fail(403, "PROFILE_REQUIRED");
    if (route === "PATCH /api/me") {
      me.configured = true;
      return {};
    }
    if (route === "PUT /api/me/settings" || route === "PUT /api/me/medical-id") return {};
    if (route === "GET /api/requests/mine") {
      return {
        requests: requests.filter((r) =>
          me.role === "elder" ? r.elderId === me.id : r.volunteerId === me.id,
        ),
      };
    }
    if (route === "POST /api/requests") {
      const r: FakeRequest = {
        id: `req-${(seq += 1)}`,
        title: String(b.title),
        elderId: me.id,
        status: "open",
        scheduledAt: String(b.scheduledAt),
      };
      requests.push(r);
      return r;
    }
    const m = /^POST \/api\/requests\/([^/]+)\/(accept|withdraw|cancel|complete|confirm)$/.exec(
      route,
    );
    if (m) {
      const r = requests.find((x) => x.id === m[1]) ?? fail(404, "NOT_FOUND");
      if (m[2] === "accept") {
        if (r.status !== "open") fail(409, "CONFLICT");
        Object.assign(r, { status: "matched", volunteerId: me.id });
      } else if (m[2] === "withdraw") {
        Object.assign(r, { status: "open", volunteerId: undefined });
      } else if (m[2] === "cancel") {
        r.status = "cancelled";
      } else if (m[2] === "complete") {
        if (Date.parse(r.scheduledAt) > clock.now) fail(409, "CONFLICT");
        r.status = "completed";
      } else {
        if (r.confirmedAt) fail(409, "ALREADY_DONE");
        r.confirmedAt = new Date(clock.now).toISOString();
      }
      return r;
    }
    if (route === "POST /api/me/check-in") {
      if (checkedIn.has(me.id)) fail(409, "ALREADY_DONE");
      checkedIn.add(me.id);
      return {};
    }
    if (route === "GET /api/events") return { events: [] };
    if (route === "GET /api/challenges") return { challenges: [] };
    if (route === "GET /api/rewards") return { rewards: [] };
    if (route === "GET /api/leaderboard") return { entries: [] };
    return fail(404, "NOT_FOUND");
  };
  return { call, users, requests, calls };
}

function fakeCognito() {
  const accounts = new Map<string, string | undefined>();
  const log: { name: string; input: Record<string, unknown> }[] = [];
  const named = (name: string, message = name) => Object.assign(new Error(message), { name });
  return {
    accounts,
    log,
    client: {
      async send(command: unknown) {
        const name = (command as object).constructor.name;
        const input = (command as { input: Record<string, unknown> }).input;
        log.push({ name, input });
        const email = String(
          input.Username ?? (input.AuthParameters as Record<string, string> | undefined)?.USERNAME,
        );
        if (name === "AdminGetUserCommand") {
          if (!accounts.has(email)) throw named("UserNotFoundException");
          return {};
        }
        if (name === "AdminCreateUserCommand") {
          accounts.set(email, undefined);
          return {};
        }
        if (name === "AdminSetUserPasswordCommand") {
          accounts.set(email, String(input.Password));
          return {};
        }
        if (name === "InitiateAuthCommand") {
          const password = (input.AuthParameters as Record<string, string>).PASSWORD;
          if (accounts.get(email) !== password) throw named("NotAuthorizedException");
          return { AuthenticationResult: { AccessToken: email } };
        }
        throw new Error(`unexpected ${name}`);
      },
    },
  };
}

function memoryStore(): CredentialStore & { saved: number; entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    saved: 0,
    get: (email) => entries.get(email),
    set: (persona, password) => void entries.set(persona.email, password),
    save() {
      this.saved += 1;
    },
  };
}

describe("local run", () => {
  it("seeds, is idempotent and finishes after the start times", async () => {
    const clock = { now: Date.parse("2026-10-22T04:00:00.000Z") };
    const api = fakeApi(clock);
    const logs: string[] = [];
    const deps = {
      call: api.call,
      identity: localIdentity(api.call),
      log: (l: string) => logs.push(l),
      now: () => clock.now,
    };

    await runSeed(deps);
    expect(api.users.size).toBe(18);
    expect(api.requests).toHaveLength(25);
    expect(api.requests.filter((r) => r.status === "cancelled")).toHaveLength(4);
    expect(api.requests.filter((r) => r.status === "matched")).toHaveLength(8 + 6);
    expect(api.requests.every((r) => r.title.startsWith(REQUEST_TITLE_PREFIX))).toBe(true);
    expect(logs.join("\n")).toContain("Seed pass done");

    const usersBefore = api.calls.filter((c) => c === "POST /api/users").length;
    await runSeed({ ...deps, identity: localIdentity(api.call) });
    expect(api.users.size).toBe(18);
    expect(api.requests).toHaveLength(25);
    expect(api.calls.filter((c) => c === "POST /api/users")).toHaveLength(usersBefore);
    expect(api.calls.filter((c) => c === "POST /api/requests")).toHaveLength(25);

    // Not due yet: nothing completes.
    await runFinish({ ...deps, identity: localIdentity(api.call) });
    expect(api.requests.filter((r) => r.status === "completed")).toHaveLength(0);
    expect(logs.join("\n")).toContain("have not started yet");

    clock.now += 15 * 60_000;
    await runFinish({ ...deps, identity: localIdentity(api.call) });
    expect(api.requests.filter((r) => r.status === "completed")).toHaveLength(8);
    expect(api.requests.filter((r) => r.confirmedAt)).toHaveLength(5);
    await runFinish({ ...deps, identity: localIdentity(api.call) });
    expect(api.requests.filter((r) => r.confirmedAt)).toHaveLength(5);
  });
});

describe("cognito run", () => {
  it("creates suppressed verified accounts, keeps passwords out of logs and reruns cleanly", async () => {
    const clock = { now: Date.parse("2026-10-22T04:00:00.000Z") };
    const api = fakeApi(clock);
    const cognito = fakeCognito();
    const store = memoryStore();
    let n = 0;
    const logs: string[] = [];
    const identity = () =>
      cognitoIdentity({
        client: cognito.client,
        userPoolId: POOL,
        clientId: "client123",
        store,
        password: () => `Zq9${String((n += 1)).padStart(21, "x")}`,
      });
    const deps = { call: api.call, log: (l: string) => logs.push(l), now: () => clock.now };

    await runSeed({ ...deps, identity: identity() });
    const creates = cognito.log.filter((c) => c.name === "AdminCreateUserCommand");
    expect(creates).toHaveLength(18);
    expect(creates[0]!.input).toMatchObject({
      UserPoolId: POOL,
      MessageAction: "SUPPRESS",
      UserAttributes: expect.arrayContaining([{ Name: "email_verified", Value: "true" }]),
    });
    const sets = cognito.log.filter((c) => c.name === "AdminSetUserPasswordCommand");
    expect(sets).toHaveLength(18);
    for (const s of sets) {
      expect(s.input.Permanent).toBe(true);
      expect(String(s.input.Password)).toHaveLength(24);
    }
    expect(store.entries.size).toBe(18);
    expect(api.users.size).toBe(18);
    expect(api.requests).toHaveLength(25);

    const everything = logs.join("\n");
    for (const password of store.entries.values()) expect(everything).not.toContain(password);
    for (const email of store.entries.keys()) expect(everything).not.toContain(`Bearer ${email}`);

    const createsBefore = creates.length;
    await runSeed({ ...deps, identity: identity() });
    expect(cognito.log.filter((c) => c.name === "AdminCreateUserCommand")).toHaveLength(
      createsBefore,
    );
    expect(cognito.log.filter((c) => c.name === "AdminSetUserPasswordCommand")).toHaveLength(18);
    expect(api.requests).toHaveLength(25);
    expect(api.users.size).toBe(18);

    clock.now += 15 * 60_000;
    await runFinish({ ...deps, identity: identity() });
    expect(api.requests.filter((r) => r.confirmedAt)).toHaveLength(5);
    for (const password of store.entries.values()) expect(logs.join("\n")).not.toContain(password);
  });

  it("issues a new password once when the stored one no longer works", async () => {
    const cognito = fakeCognito();
    const store = memoryStore();
    const persona = PERSONAS[0]!;
    cognito.accounts.set(persona.email, "ChangedElsewhere1");
    store.set(persona, "OldStoredPassword1");
    const identity = cognitoIdentity({
      client: cognito.client,
      userPoolId: POOL,
      clientId: "c",
      store,
      password: () => "NewPassword123456789012x",
    });
    const session = await identity.ensure(persona);
    expect(session.created).toBe(false);
    expect(store.get(persona.email)).toBe("NewPassword123456789012x");
    expect(store.saved).toBe(1);
    expect(session.headers.authorization).toBe(`Bearer ${persona.email}`);
  });
});
