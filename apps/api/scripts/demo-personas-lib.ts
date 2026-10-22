// Pure and injectable parts of demo-personas.ts so tests can run them with a fake API and a fake Cognito client.
import { randomInt } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  PRECINCT_LOCATIONS,
  type Category,
  type Day,
  type Language,
  type Precinct,
  type PutMedicalIdBody,
  type PutSettingsBody,
} from "@sdh/contracts";
import { at } from "./content/dates";
import { ecoQuiz } from "./content/quizzes";
import { authHeaders, errorCodeOf, isLoopbackUrl } from "./loader-lib";

export const REQUEST_TITLE_PREFIX = "Demo: ";
export const DEFAULT_POOL_ALLOW_PATTERN = "^ap-southeast-5_[A-Za-z0-9]+$";
export const CREDENTIAL_HEADING = "## Demo personas (dev)";
export const EMAIL_DOMAIN = "township-demo.example";
const REQUEST_TIMEOUT_MS = 15_000;
const PASSWORD_LENGTH = 24;

export type Mode = "local" | "cognito";
export type Pass = "seed" | "finish";
type Obj = Record<string, unknown>;

// ---------- arguments and guards ----------

export interface Config {
  mode: Mode;
  pass: Pass;
  yes: boolean;
  baseUrl: string;
  cognito?: { userPoolId: string; clientId: string; region: string; profile?: string };
}

export type ConfigResult = { ok: true; config: Config } | { ok: false; error: string };

const VALUE_FLAGS = ["--base-url", "--user-pool-id", "--client-id", "--region", "--pass"];
const SWITCH_FLAGS = ["--local", "--cognito", "--yes", "--i-know-this-is-dev"];

function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  const raw =
    i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
  const value = raw?.trim();
  return value && !value.startsWith("--") ? value : undefined;
}

export const USAGE =
  "Usage: demo:personas -- --local --base-url http://localhost:3001 [--pass seed|finish] [--yes]\n" +
  "       AWS_PROFILE=<profile> demo:personas -- --cognito --base-url https://<host> --user-pool-id <id> --client-id <id> --region <region> --i-know-this-is-dev [--pass seed|finish] [--yes]";

export function resolveConfig(
  argv: string[],
  env: Record<string, string | undefined>,
): ConfigResult {
  for (const arg of argv) {
    if (!arg.startsWith("--") || arg === "--") continue;
    const name = arg.split("=")[0] as string;
    if (!SWITCH_FLAGS.includes(name) && !VALUE_FLAGS.includes(name)) {
      return { ok: false, error: `Unknown option ${name}` };
    }
  }
  const local = argv.includes("--local");
  const cognito = argv.includes("--cognito");
  if (local === cognito) return { ok: false, error: "Choose exactly one of --local or --cognito" };
  const pass = flagValue(argv, "--pass") ?? "seed";
  if (pass !== "seed" && pass !== "finish") {
    return { ok: false, error: "--pass must be seed or finish" };
  }
  const baseUrl = flagValue(argv, "--base-url")?.replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "--base-url is required" };
  const yes = argv.includes("--yes");
  if (local) {
    if (!isLoopbackUrl(baseUrl)) {
      return { ok: false, error: "--local only talks to a loopback URL (localhost or 127.0.0.1)" };
    }
    return { ok: true, config: { mode: "local", pass, yes, baseUrl } };
  }
  if (!isLoopbackUrl(baseUrl) && !baseUrl.startsWith("https://")) {
    return { ok: false, error: "A non-local base URL must start with https://" };
  }
  const userPoolId = flagValue(argv, "--user-pool-id");
  const clientId = flagValue(argv, "--client-id");
  const region = flagValue(argv, "--region");
  if (!userPoolId || !clientId || !region) {
    return { ok: false, error: "--cognito needs --user-pool-id, --client-id and --region" };
  }
  if (!argv.includes("--i-know-this-is-dev")) {
    return { ok: false, error: "--cognito needs --i-know-this-is-dev (dev pool only)" };
  }
  let allow: RegExp;
  try {
    allow = new RegExp(env.DEMO_POOL_ALLOW_PATTERN?.trim() || DEFAULT_POOL_ALLOW_PATTERN);
  } catch {
    return { ok: false, error: "DEMO_POOL_ALLOW_PATTERN is not a valid regular expression" };
  }
  if (!allow.test(userPoolId)) {
    return {
      ok: false,
      error: "Refusing to run: the user pool id does not match the dev allow pattern",
    };
  }
  if (!userPoolId.startsWith(`${region}_`)) {
    return { ok: false, error: "The user pool id does not belong to --region" };
  }
  const profile = env.AWS_PROFILE?.trim() || undefined;
  if (yes && !profile) return { ok: false, error: "Set AWS_PROFILE to your own profile to apply" };
  return {
    ok: true,
    config: {
      mode: "cognito",
      pass,
      yes,
      baseUrl,
      cognito: { userPoolId, clientId, region, ...(profile ? { profile } : {}) },
    },
  };
}

// ---------- personas ----------

export interface Persona {
  key: string;
  role: "elder" | "volunteer";
  name: string;
  email: string;
  precinct: Precinct;
  area: string;
  languages: Language[];
  interests: Category[];
  skills: Category[];
  experience: string;
  availability: { day: Day; start: string; end: string }[];
  leaderboardOptIn: boolean;
  settings?: PutSettingsBody;
  medical?: PutMedicalIdBody;
}

// firstname.lastname from the first and last word of the name.
export function emailFor(name: string): string {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean);
  return `${words[0]}.${words[words.length - 1]}@${EMAIL_DOMAIN}`;
}

const slots = (days: Day[], start: string, end: string) => days.map((day) => ({ day, start, end }));
const WEEKEND: Day[] = ["sat", "sun"];
const EVENINGS: Day[] = ["mon", "wed", "fri"];

const settings = (over: Partial<PutSettingsBody>): PutSettingsBody => ({
  notifyEvents: true,
  notifyVolunteering: true,
  shareApproxLocation: false,
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
  voiceAssist: false,
  ...over,
});

interface ElderSpec {
  name: string;
  precinct: Precinct;
  area: string;
  languages: Language[];
  interests: Category[];
  settings?: PutSettingsBody;
  medical?: PutMedicalIdBody;
}

const ELDER_SPECS: ElderSpec[] = [
  {
    name: "Rosnah binti Abdullah",
    precinct: "Elmina West",
    area: "Block A, Elmina West",
    languages: ["ms", "en"],
    interests: ["groceries", "community_activity"],
    settings: settings({ fontSize: "large", voiceAssist: true }),
    medical: {
      bloodGroup: "O+",
      nextOfKinName: "Azlan Abdullah",
      nextOfKinRelation: "Son",
      nextOfKinPhone: "012-555 0143",
    },
  },
  {
    name: "Tan Kim Hock",
    precinct: "Elmina West",
    area: "Block B, Elmina West",
    languages: ["zh", "en"],
    interests: ["digital_literacy", "home_help"],
    medical: {
      bloodGroup: "A+",
      nextOfKinName: "Tan Wei Ling",
      nextOfKinRelation: "Daughter",
      nextOfKinPhone: "016-555 0172",
    },
  },
  {
    name: "Subramaniam Pillai",
    precinct: "Elmina Valley",
    area: "Valley Court, Elmina Valley",
    languages: ["en", "ms"],
    interests: ["transport", "health_literacy"],
    settings: settings({ fontSize: "xlarge", highContrast: true, shareApproxLocation: true }),
  },
  {
    name: "Lim Siew Fong",
    precinct: "Elmina East",
    area: "Jalan Elmina East 3, Elmina East",
    languages: ["zh", "ms"],
    interests: ["health_literacy", "community_activity"],
    medical: {
      bloodGroup: "B+",
      nextOfKinName: "Lim Chun Yew",
      nextOfKinRelation: "Husband",
      nextOfKinPhone: "019-555 0108",
    },
  },
  {
    name: "Abdul Rahman bin Ismail",
    precinct: "Central Park",
    area: "Park Residences, Central Park",
    languages: ["ms", "en"],
    interests: ["home_help", "community_activity"],
    settings: settings({ notifyEvents: false, reducedMotion: true }),
    medical: {
      bloodGroup: "AB+",
      nextOfKinName: "Noraini Abdul Rahman",
      nextOfKinRelation: "Wife",
      nextOfKinPhone: "013-555 0126",
    },
  },
  {
    name: "Kamala Devi Nair",
    precinct: "Elmina Valley",
    area: "Valley Court, Elmina Valley",
    languages: ["en", "ms"],
    interests: ["digital_literacy", "groceries"],
    settings: settings({ fontSize: "large" }),
  },
  {
    name: "Wong Ah Lian",
    precinct: "Elmina East",
    area: "Jalan Elmina East 5, Elmina East",
    languages: ["zh", "en"],
    interests: ["groceries", "health_literacy"],
    medical: {
      bloodGroup: "O-",
      nextOfKinName: "Wong Jia Hao",
      nextOfKinRelation: "Grandson",
      nextOfKinPhone: "017-555 0159",
    },
  },
  {
    name: "Zainab binti Omar",
    precinct: "Central Park",
    area: "Park Residences, Central Park",
    languages: ["ms"],
    interests: ["digital_literacy", "health_literacy"],
  },
];

interface YouthSpec {
  name: string;
  precinct: Precinct;
  area: string;
  languages: Language[];
  interests: Category[];
  skills: Category[];
  experience: string;
  availability: Persona["availability"];
  leaderboardOptIn: boolean;
}

const YOUTH_SPECS: YouthSpec[] = [
  {
    name: "Nurul Aisyah binti Razak",
    precinct: "Elmina West",
    area: "Elmina West",
    languages: ["ms", "en"],
    interests: ["community_activity", "health_literacy"],
    skills: ["groceries", "health_literacy", "community_activity"],
    experience: "Nursing student who helps her grandmother with medicines and clinic visits.",
    availability: slots(WEEKEND, "09:00", "17:00"),
    leaderboardOptIn: true,
  },
  {
    name: "Daniel Lee",
    precinct: "Elmina West",
    area: "Elmina West",
    languages: ["en", "zh"],
    interests: ["digital_literacy", "community_activity"],
    skills: ["digital_literacy", "home_help"],
    experience: "Software intern who runs phone clinics for relatives.",
    availability: slots(EVENINGS, "18:00", "21:00"),
    leaderboardOptIn: true,
  },
  {
    name: "Priya Ramasamy",
    precinct: "Elmina Valley",
    area: "Elmina Valley",
    languages: ["en", "ms"],
    interests: ["digital_literacy", "health_literacy"],
    skills: ["digital_literacy", "health_literacy", "transport"],
    experience: "Peer tutor at university; has driven her grandparents to appointments for years.",
    availability: [...slots(["tue", "thu"], "17:00", "20:00"), ...slots(WEEKEND, "08:00", "14:00")],
    leaderboardOptIn: true,
  },
  {
    name: "Muhammad Hafiz bin Kamal",
    precinct: "Elmina Valley",
    area: "Elmina Valley",
    languages: ["ms", "en"],
    interests: ["home_help", "community_activity"],
    skills: ["home_help", "groceries", "transport"],
    experience: "Part-time electrician's assistant; comfortable with small repairs.",
    availability: [...slots(["sat"], "08:00", "18:00"), ...slots(["wed"], "16:00", "21:00")],
    leaderboardOptIn: true,
  },
  {
    name: "Chloe Chong",
    precinct: "Elmina East",
    area: "Elmina East",
    languages: ["en", "zh"],
    interests: ["groceries", "community_activity"],
    skills: ["groceries", "community_activity", "digital_literacy"],
    experience: "Runs her school's community service club.",
    availability: slots(["fri", "sat", "sun"], "10:00", "18:00"),
    leaderboardOptIn: true,
  },
  {
    name: "Arjun Krishnan",
    precinct: "Elmina East",
    area: "Elmina East",
    languages: ["en", "ms"],
    interests: ["transport", "health_literacy"],
    skills: ["transport", "health_literacy"],
    experience: "Has a driving licence and a first aid certificate.",
    availability: [...slots(["mon", "tue"], "17:30", "21:00"), ...slots(["sun"], "09:00", "16:00")],
    leaderboardOptIn: true,
  },
  {
    name: "Siti Nabilah binti Hassan",
    precinct: "Central Park",
    area: "Central Park",
    languages: ["ms", "en"],
    interests: ["community_activity", "digital_literacy"],
    skills: ["community_activity", "digital_literacy", "groceries"],
    experience: "Community radio volunteer; likes walking groups and storytelling.",
    availability: slots(["thu", "fri", "sat"], "09:00", "15:00"),
    leaderboardOptIn: true,
  },
  {
    name: "Ethan Goh",
    precinct: "Central Park",
    area: "Central Park",
    languages: ["en", "zh", "ms"],
    interests: ["home_help", "digital_literacy"],
    skills: ["home_help", "digital_literacy"],
    experience: "Engineering student who fixes laptops and phones for neighbours.",
    availability: [...slots(WEEKEND, "10:00", "19:00"), ...slots(["wed"], "18:00", "21:00")],
    leaderboardOptIn: true,
  },
  {
    name: "Farah Izzati binti Mansor",
    precinct: "Elmina West",
    area: "Elmina West",
    languages: ["ms", "en"],
    interests: ["groceries", "health_literacy"],
    skills: ["groceries", "transport", "health_literacy"],
    experience: "Pharmacy assistant on weekends; explains labels in plain language.",
    availability: slots(["mon", "tue", "thu"], "17:00", "20:30"),
    leaderboardOptIn: false,
  },
  {
    name: "Kavitha Selvam",
    precinct: "Elmina East",
    area: "Elmina East",
    languages: ["en", "ms"],
    interests: ["community_activity", "home_help"],
    skills: ["community_activity", "home_help", "groceries"],
    experience: "Temple youth group volunteer who helps with festival preparations.",
    availability: slots(["sat", "sun"], "08:00", "13:00"),
    leaderboardOptIn: false,
  },
];

export const PERSONAS: Persona[] = [
  ...ELDER_SPECS.map((e, i): Persona => ({
    key: `elder-${i}`,
    role: "elder",
    name: e.name,
    email: emailFor(e.name),
    precinct: e.precinct,
    area: e.area,
    languages: e.languages,
    interests: e.interests,
    skills: [],
    experience: "",
    availability: [],
    leaderboardOptIn: false,
    ...(e.settings ? { settings: e.settings } : {}),
    ...(e.medical ? { medical: e.medical } : {}),
  })),
  ...YOUTH_SPECS.map((y, i): Persona => ({
    ...y,
    key: `youth-${i}`,
    role: "volunteer",
    email: emailFor(y.name),
  })),
];

export const ELDERS = PERSONAS.filter((p) => p.role === "elder");
export const YOUTH = PERSONAS.filter((p) => p.role === "volunteer");

// ---------- requests ----------

type When = { days: number; hour: number; minute?: number } | { inMinutes: number };

export type Stage =
  // Stays open for any volunteer.
  | { kind: "open" }
  // A volunteer accepts and keeps it.
  | { kind: "accepted"; volunteer: number }
  // A volunteer accepts and then backs out; the request returns to open.
  | { kind: "withdrawn"; volunteer: number }
  // Starts a few minutes after seeding; the finish pass completes it and optionally the elder confirms.
  | { kind: "finish"; volunteer: number; minutesSpent: number; confirm: boolean }
  // The elder cancels, either while open or after a volunteer accepted.
  | { kind: "cancelled"; volunteer?: number };

export interface RequestPlan {
  title: string;
  elder: number;
  category: Category;
  description: string;
  durationMinutes: number;
  when: When;
  stage: Stage;
}

const req = (
  title: string,
  elder: number,
  category: Category,
  description: string,
  durationMinutes: number,
  when: When,
  stage: Stage,
): RequestPlan => ({
  title: `${REQUEST_TITLE_PREFIX}${title}`,
  elder,
  category,
  description,
  durationMinutes,
  when,
  stage,
});

export const REQUESTS: RequestPlan[] = [
  req(
    "Carry groceries from the market",
    0,
    "groceries",
    "Carry a small grocery bag from the wet market back to Block A.",
    45,
    { inMinutes: 3 },
    { kind: "finish", volunteer: 0, minutesSpent: 40, confirm: true },
  ),
  req(
    "Set up WhatsApp video calls",
    1,
    "digital_literacy",
    "Install WhatsApp and practise a video call with my daughter.",
    30,
    { inMinutes: 4 },
    { kind: "finish", volunteer: 1, minutesSpent: 35, confirm: true },
  ),
  req(
    "Ride to the health clinic",
    2,
    "transport",
    "Go with me to my routine check-up and back home.",
    90,
    { inMinutes: 5 },
    { kind: "finish", volunteer: 2, minutesSpent: 85, confirm: true },
  ),
  req(
    "Explain my blood pressure leaflet",
    3,
    "health_literacy",
    "Read through the leaflet from the clinic and explain the readings.",
    25,
    { inMinutes: 6 },
    { kind: "finish", volunteer: 4, minutesSpent: 25, confirm: true },
  ),
  req(
    "Change the hallway light bulb",
    4,
    "home_help",
    "Someone steady on a ladder to swap a high bulb.",
    20,
    { inMinutes: 7 },
    { kind: "finish", volunteer: 6, minutesSpent: 20, confirm: true },
  ),
  req(
    "Join the morning tai chi group",
    5,
    "community_activity",
    "Walk with me to the park and stay for the first session.",
    60,
    { inMinutes: 8 },
    { kind: "finish", volunteer: 0, minutesSpent: 55, confirm: false },
  ),
  req(
    "Pick up medicine from the pharmacy",
    6,
    "groceries",
    "Collect a prepared prescription and bring it to my door.",
    30,
    { inMinutes: 9 },
    { kind: "finish", volunteer: 6, minutesSpent: 30, confirm: false },
  ),
  req(
    "Learn to pay with an e-wallet",
    7,
    "digital_literacy",
    "Set up an e-wallet and pay for something small together.",
    40,
    { inMinutes: 10 },
    { kind: "finish", volunteer: 7, minutesSpent: 45, confirm: false },
  ),
  req(
    "Weekly grocery run",
    0,
    "groceries",
    "Fresh vegetables, eggs and rice from the market.",
    45,
    { days: 1, hour: 9, minute: 30 },
    { kind: "accepted", volunteer: 8 },
  ),
  req(
    "Set up a tablet for video calls",
    5,
    "digital_literacy",
    "Help me use the tablet my grandson gave me.",
    30,
    { days: 1, hour: 16 },
    { kind: "accepted", volunteer: 2 },
  ),
  req(
    "Ride to the dental clinic",
    3,
    "transport",
    "Accompany me to a dental appointment and back.",
    90,
    { days: 2, hour: 8 },
    { kind: "accepted", volunteer: 9 },
  ),
  req(
    "Read through my clinic letter",
    7,
    "health_literacy",
    "Explain the letter about my next appointment.",
    25,
    { days: 2, hour: 15, minute: 30 },
    { kind: "accepted", volunteer: 7 },
  ),
  req(
    "Fix a dripping kitchen tap",
    2,
    "home_help",
    "The kitchen tap drips all night; a simple washer change may help.",
    40,
    { days: 3, hour: 11 },
    { kind: "accepted", volunteer: 3 },
  ),
  req(
    "Join the Central Park morning walk",
    4,
    "community_activity",
    "Company for a gentle walk around the lake.",
    60,
    { days: 4, hour: 7, minute: 30 },
    { kind: "accepted", volunteer: 6 },
  ),
  req(
    "Move a cabinet in the living room",
    1,
    "home_help",
    "Slide a light cabinet to the other wall.",
    60,
    { days: 3, hour: 10 },
    { kind: "withdrawn", volunteer: 1 },
  ),
  req(
    "Help with online bill payment",
    6,
    "digital_literacy",
    "Pay the water and electricity bills through the bank app.",
    30,
    { days: 4, hour: 14 },
    { kind: "withdrawn", volunteer: 5 },
  ),
  req(
    "Carry rice and cooking oil",
    7,
    "groceries",
    "Heavy items from the shop to my flat.",
    45,
    { days: 5, hour: 9 },
    { kind: "withdrawn", volunteer: 7 },
  ),
  req(
    "Drive to the temple festival",
    1,
    "transport",
    "A lift to the evening prayers and back.",
    120,
    { days: 6, hour: 18 },
    { kind: "cancelled" },
  ),
  req(
    "Help hang new curtains",
    5,
    "home_help",
    "Hang two curtains in the front room.",
    45,
    { days: 6, hour: 10 },
    { kind: "cancelled" },
  ),
  req(
    "Help me buy a new phone",
    3,
    "digital_literacy",
    "Go to the shop with me and choose a simple phone.",
    90,
    { days: 5, hour: 11 },
    { kind: "cancelled", volunteer: 4 },
  ),
  req(
    "Grocery run before the long weekend",
    0,
    "groceries",
    "Stock up before the shops close.",
    45,
    { days: 6, hour: 9 },
    { kind: "cancelled", volunteer: 0 },
  ),
  req(
    "Teach me to use the community app",
    2,
    "digital_literacy",
    "Show me how to read notices and sign up for events.",
    45,
    { days: 2, hour: 10 },
    { kind: "open" },
  ),
  req(
    "Go with me to the Friday market",
    4,
    "transport",
    "A ride to the market and back.",
    60,
    { days: 3, hour: 8 },
    { kind: "open" },
  ),
  req(
    "Healthy eating talk at the clinic",
    6,
    "health_literacy",
    "Come with me to the talk and help me take notes.",
    60,
    { days: 5, hour: 15 },
    { kind: "open" },
  ),
  req(
    "Neighbourhood gotong-royong tidy-up",
    7,
    "community_activity",
    "Help tidy the shared garden with the neighbours.",
    90,
    { days: 7, hour: 8 },
    { kind: "open" },
  ),
];

const whenIso = (when: When, now: number): string =>
  "inMinutes" in when
    ? new Date(now + when.inMinutes * 60_000).toISOString()
    : at(when.days, when.hour, when.minute ?? 0, now);

// ---------- dry run ----------

export function planLines(config: Config): string[] {
  const kinds = (k: Stage["kind"]) => REQUESTS.filter((r) => r.stage.kind === k).length;
  const lines: string[] = [];
  lines.push(
    `Dry run (no changes). Pass: ${config.pass}. Mode: ${config.mode}. Target: ${config.baseUrl}.`,
  );
  if (config.pass === "seed") {
    lines.push(
      `Personas: ${ELDERS.length} elderly residents and ${YOUTH.length} youth volunteers (fictional, ${EMAIL_DOMAIN}).`,
    );
    for (const p of PERSONAS) {
      lines.push(
        `  ${p.role === "elder" ? "elder    " : "volunteer"}  ${p.name}  <${p.email}>  ${p.precinct}`,
      );
    }
    lines.push(
      `Help requests (${REQUESTS.length}, titles start with "${REQUEST_TITLE_PREFIX}", all categories):`,
      `  ${kinds("finish")} start a few minutes after seeding and are completed by the finish pass (${REQUESTS.filter((r) => r.stage.kind === "finish" && r.stage.confirm).length} confirmed by the elder, the rest left for the elder to confirm)`,
      `  ${kinds("accepted")} accepted by a volunteer for the coming days`,
      `  ${kinds("withdrawn")} accepted and then withdrawn by the volunteer (back to open)`,
      `  ${kinds("cancelled")} cancelled by the elder`,
      `  ${kinds("open")} left open`,
      "Also: events joined, challenges joined with progress and completions, team contributions, a quiz passed, daily check-ins, rewards redeemed, leaderboard opt-in for most volunteers, medical ID and settings for some elders.",
    );
  } else {
    lines.push(
      "Finish pass: volunteers complete the demo requests whose start time has passed, elders confirm the ones planned for confirmation, and eligible volunteers redeem a reward.",
    );
  }
  lines.push(
    "Flow: 1 dry run, 2 seed (--yes), 3 wait about 12 minutes, 4 finish (--pass finish --yes). Re-running any step is safe.",
    "Verification: volunteers created through POST /api/me are verified automatically by the API (users/service.ts createUser), so no coordinator step or --pass verify is needed. If a volunteer ever shows as not verified, a coordinator must verify them (RUNBOOK.md, Content loading and coordinator account).",
  );
  if (config.mode === "cognito") {
    lines.push(
      "Accounts are created with AdminCreateUser (invitation email suppressed, email verified) and a random 24 character permanent password.",
      'Logins are written only to docs/CREDENTIAL.md under "Demo personas (dev)". Passwords and tokens are never printed.',
    );
  } else {
    lines.push("Local mode uses the demo header; no Cognito and no credentials file.");
  }
  lines.push("Add --yes to proceed.");
  return lines;
}

// ---------- passwords and credentials file ----------

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

export type RandomInt = (max: number) => number;

// Letters and digits only so the password is safe in a shell; at least one of each class.
export function generatePassword(
  length: number = PASSWORD_LENGTH,
  rand: RandomInt = randomInt,
): string {
  const all = LOWER + UPPER + DIGITS;
  const chars = [LOWER, UPPER, DIGITS].map((set) => set[rand(set.length)] as string);
  while (chars.length < length) chars.push(all[rand(all.length)] as string);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join("");
}

export interface CredentialEntry {
  password: string;
  role: string;
  name: string;
}

export function parseCredentialSection(text: string): Map<string, CredentialEntry> {
  const entries = new Map<string, CredentialEntry>();
  let inSection = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === CREDENTIAL_HEADING) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,6} /.test(line)) break;
    if (!inSection || !line.startsWith("- ")) continue;
    const [email, password, role = "", name = ""] = line.slice(2).split(" | ");
    if (email && password) entries.set(email.trim(), { password: password.trim(), role, name });
  }
  return entries;
}

export function upsertCredentialSection(
  text: string,
  entries: Map<string, CredentialEntry>,
): string {
  const section = [
    CREDENTIAL_HEADING,
    "",
    "Fictional logins for the live dev site, written by apps/api/scripts/demo-personas.ts. Never commit.",
    "",
    "Format: email | password | role | name",
    ...[...entries].map(([email, e]) => `- ${email} | ${e.password} | ${e.role} | ${e.name}`),
    "",
  ].join("\n");
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === CREDENTIAL_HEADING);
  if (start < 0) return `${text.replace(/\n*$/, "\n\n")}${section}`;
  let end = lines.findIndex((l, i) => i > start && /^#{1,6} /.test(l));
  if (end < 0) end = lines.length;
  return [...lines.slice(0, start), ...section.split("\n").slice(0, -1), "", ...lines.slice(end)]
    .join("\n")
    .replace(/\n*$/, "\n");
}

export interface CredentialStore {
  get(email: string): string | undefined;
  set(persona: Persona, password: string): void;
  save(): void;
}

// docs/CREDENTIAL.md holds the logins; the file is created when missing and written atomically.
export function fileCredentialStore(path: string): CredentialStore {
  const original = existsSync(path)
    ? readFileSync(path, "utf8")
    : "# Credentials (gitignored, never commit)\n";
  const entries = parseCredentialSection(original);
  return {
    get: (email) => entries.get(email)?.password,
    set: (persona, password) =>
      entries.set(persona.email, { password, role: persona.role, name: persona.name }),
    save: () => {
      const current = existsSync(path) ? readFileSync(path, "utf8") : original;
      const tmp = `${path}.tmp`;
      writeFileSync(tmp, upsertCredentialSection(current, entries), { mode: 0o600 });
      renameSync(tmp, path);
    },
  };
}

// ---------- api and identities ----------

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type Headers = Record<string, string>;
export type CallFn = (
  method: string,
  path: string,
  headers: Headers,
  body?: unknown,
) => Promise<unknown>;

// Only a method, path, status and short error code are ever put in an error message.
export function httpCall(baseUrl: string): CallFn {
  return async (method, path, headers, body) => {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(0, "UNREACHABLE", `${method} ${path} failed: could not reach ${baseUrl}`);
    }
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    if (!res.ok) {
      const code = errorCodeOf(parsed);
      throw new ApiError(res.status, code, `${method} ${path} failed: ${res.status} ${code}`);
    }
    return parsed;
  };
}

export interface Session {
  persona: Persona;
  headers: Headers;
  // True when the sign-in account or the profile was created in this run.
  created: boolean;
}

export interface Identity {
  ensure(persona: Persona): Promise<Session>;
}

const rec = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(rec) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

const profileBody = (p: Persona) => ({
  role: p.role,
  name: p.name,
  area: p.area,
  location: PRECINCT_LOCATIONS[p.precinct],
  skills: p.skills,
  experience: p.experience,
  availability: p.availability,
});

// Local demo header sign-in: finds the persona by role and name, else creates the profile.
export function localIdentity(call: CallFn): Identity {
  let known: Map<string, string> | undefined;
  return {
    async ensure(persona) {
      if (!known) {
        const users = list(rec(await call("GET", "/api/demo/users", {})).users);
        known = new Map(users.map((u) => [`${str(u.role)}:${str(u.name)}`, str(u.id)]));
      }
      const key = `${persona.role}:${persona.name}`;
      let id = known.get(key);
      let created = false;
      if (!id) {
        id = str(rec(await call("POST", "/api/users", {}, profileBody(persona))).id);
        known.set(key, id);
        created = true;
      }
      return { persona, headers: authHeaders({ kind: "demo", userId: id }), created };
    },
  };
}

export interface CognitoSend {
  send(command: unknown): Promise<unknown>;
}

const errorName = (e: unknown): string => (e instanceof Error ? e.name : "");

// Admin-created, email-verified accounts with a random permanent password; tokens come from USER_PASSWORD_AUTH.
export function cognitoIdentity(opts: {
  client: CognitoSend;
  userPoolId: string;
  clientId: string;
  store: CredentialStore;
  password?: () => string;
}): Identity {
  const { client, userPoolId, clientId, store } = opts;
  const newPassword = opts.password ?? (() => generatePassword());

  const signIn = async (email: string, password: string): Promise<string> => {
    const out = rec(
      await client.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: clientId,
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      ),
    );
    const token = str(rec(out.AuthenticationResult).AccessToken);
    if (!token) throw new Error("Sign-in did not return an access token");
    return token;
  };

  // Saved before it is set, so a password that was set can never be lost.
  const resetPassword = async (persona: Persona): Promise<string> => {
    const password = newPassword();
    store.set(persona, password);
    store.save();
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: persona.email,
        Password: password,
        Permanent: true,
      }),
    );
    return password;
  };

  return {
    async ensure(persona) {
      let exists = true;
      try {
        await client.send(
          new AdminGetUserCommand({ UserPoolId: userPoolId, Username: persona.email }),
        );
      } catch (error) {
        if (errorName(error) !== "UserNotFoundException") throw error;
        exists = false;
      }
      if (!exists) {
        await client.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: persona.email,
            UserAttributes: [
              { Name: "email", Value: persona.email },
              { Name: "email_verified", Value: "true" },
            ],
            MessageAction: "SUPPRESS",
          }),
        );
      }
      let password = exists ? store.get(persona.email) : undefined;
      let reset = false;
      if (!password) {
        password = await resetPassword(persona);
        reset = true;
      }
      let token: string;
      try {
        token = await signIn(persona.email, password);
      } catch (error) {
        if (reset || errorName(error) !== "NotAuthorizedException") throw error;
        // The stored password no longer works (changed elsewhere); issue a new one once.
        token = await signIn(persona.email, await resetPassword(persona));
      }
      return { persona, headers: authHeaders({ kind: "bearer", token }), created: !exists };
    },
  };
}

// ---------- runner ----------

export interface RunDeps {
  call: CallFn;
  identity: Identity;
  log: (line: string) => void;
  now?: () => number;
}

type Attempt<T> = { ok: true; value: T } | { ok: false; code: string };

class Counts {
  private rows = new Map<string, { done: number; skipped: number }>();
  tally(type: string, done: boolean) {
    const row = this.rows.get(type) ?? { done: 0, skipped: 0 };
    if (done) row.done += 1;
    else row.skipped += 1;
    this.rows.set(type, row);
  }
  lines(): string[] {
    return [...this.rows].map(
      ([type, c]) => `  ${type}: ${c.done} done, ${c.skipped} skipped or already in place`,
    );
  }
}

function makeContext(deps: RunDeps) {
  const now = deps.now ?? Date.now;
  const counts = new Counts();
  const attempt = async <T>(run: () => Promise<T>): Promise<Attempt<T>> => {
    try {
      return { ok: true, value: await run() };
    } catch (error) {
      if (error instanceof ApiError && error.status !== 0) return { ok: false, code: error.code };
      throw error;
    }
  };
  const api = (s: Session) => ({
    get: (path: string) => deps.call("GET", path, s.headers).then(rec),
    send: (method: string, path: string, body?: unknown) =>
      attempt(() => deps.call(method, path, s.headers, body).then(rec)),
    must: (method: string, path: string, body?: unknown) =>
      deps.call(method, path, s.headers, body).then(rec),
  });
  return { now, counts, attempt, api, log: deps.log, deps };
}
type Context = ReturnType<typeof makeContext>;

// Profile, preferences, settings and medical ID; applied when the person is new or never configured.
async function prepare(ctx: Context, persona: Persona): Promise<Session> {
  const session = await ctx.deps.identity.ensure(persona);
  const api = ctx.api(session);
  let created = session.created;
  let me = await ctx.attempt(() => api.get("/api/me"));
  if (!me.ok) {
    if (me.code !== "PROFILE_REQUIRED")
      throw new ApiError(0, me.code, `GET /api/me failed: ${me.code}`);
    me = {
      ok: true,
      value: await api.must("POST", "/api/me", {
        role: persona.role,
        name: persona.name,
        precinct: persona.precinct,
      }),
    };
    created = true;
  }
  const configured = Array.isArray(me.value.languages) && me.value.languages.length > 0;
  if (created || !configured) {
    await api.must("PATCH", "/api/me", {
      area: persona.area,
      skills: persona.skills,
      experience: persona.experience,
      availability: persona.availability,
      interests: persona.interests,
      languages: persona.languages,
      leaderboardOptIn: persona.leaderboardOptIn,
    });
    if (persona.settings) await api.must("PUT", "/api/me/settings", persona.settings);
    if (persona.medical) await api.must("PUT", "/api/me/medical-id", persona.medical);
    created = true;
  }
  ctx.counts.tally(persona.role === "elder" ? "elders" : "youth volunteers", created);
  if (persona.role === "volunteer" && rec(me.value).verification !== "verified" && created) {
    ctx.log(
      `  note: ${persona.name} is not verified; a coordinator must verify them (see RUNBOOK.md)`,
    );
  }
  return { ...session, created };
}

const OUTCOMES = ["none", "join", "partial", "complete"] as const;
const DAILY_CODES = new Set(["ALREADY_DONE", "CONFLICT"]);

async function seedRequests(ctx: Context, sessions: Map<string, Session>) {
  const at0 = ctx.now();
  let latestFinish = 0;
  for (const [elderIndex, elder] of ELDERS.entries()) {
    const es = sessions.get(elder.key) as Session;
    const ea = ctx.api(es);
    const mine = new Map(
      list((await ea.get("/api/requests/mine")).requests).map((r) => [str(r.title), r]),
    );
    for (const plan of REQUESTS.filter((r) => r.elder === elderIndex)) {
      let current = mine.get(plan.title);
      const createdNow = !current;
      if (!current) {
        current = await ea.must("POST", "/api/requests", {
          category: plan.category,
          title: plan.title,
          description: plan.description,
          scheduledAt: whenIso(plan.when, ctx.now()),
          durationMinutes: plan.durationMinutes,
          location: { ...PRECINCT_LOCATIONS[elder.precinct], area: elder.area },
        });
      }
      ctx.counts.tally("help requests", createdNow);
      if (plan.stage.kind === "finish") {
        latestFinish = Math.max(latestFinish, Date.parse(str(current.scheduledAt)));
      }
      const id = str(current.id);
      let status = str(current.status);
      const volunteerIndex = "volunteer" in plan.stage ? plan.stage.volunteer : undefined;
      const volunteer =
        volunteerIndex === undefined ? undefined : sessions.get(`youth-${volunteerIndex}`);
      const accept = async () => {
        if (!volunteer || status !== "open") return;
        const res = await ctx.api(volunteer).send("POST", `/api/requests/${id}/accept`);
        if (res.ok) {
          status = "matched";
          ctx.counts.tally("accepted requests", true);
        } else ctx.log(`  skipped accept for "${plan.title}": ${res.code}`);
      };
      switch (plan.stage.kind) {
        case "finish":
        case "accepted":
          await accept();
          break;
        case "withdrawn":
          if (createdNow) {
            await accept();
            if (status === "matched" && volunteer) {
              const res = await ctx.api(volunteer).send("POST", `/api/requests/${id}/withdraw`);
              if (res.ok) ctx.counts.tally("withdrawn requests", true);
            }
          }
          break;
        case "cancelled":
          if (createdNow) await accept();
          if (status === "open" || status === "matched") {
            const res = await ea.send("POST", `/api/requests/${id}/cancel`);
            ctx.counts.tally("cancelled requests", res.ok);
          } else ctx.counts.tally("cancelled requests", false);
          break;
        case "open":
          break;
      }
    }
  }
  return { at0, latestFinish };
}

async function joinEvents(ctx: Context, sessions: Map<string, Session>) {
  for (const [index, persona] of PERSONAS.entries()) {
    const api = ctx.api(sessions.get(persona.key) as Session);
    const events = list((await api.get("/api/events?includeJoined=true")).events).filter(
      (e) => str(e.status) === "upcoming",
    );
    const pool =
      persona.role === "volunteer" ? events : events.filter((e) => str(e.purpose) === "activity");
    if (pool.length === 0) continue;
    const wanted = new Set<number>();
    const personIndex = persona.role === "volunteer" ? Number(persona.key.split("-")[1]) : index;
    wanted.add(personIndex % pool.length);
    if (persona.role === "volunteer" && personIndex % 3 === 0)
      wanted.add((personIndex + 1) % pool.length);
    for (const i of wanted) {
      const event = pool[i] as Obj;
      if (event.joined === true) {
        ctx.counts.tally("event sign-ups", false);
        continue;
      }
      const res = await api.send("POST", `/api/events/${str(event.id)}/join`);
      ctx.counts.tally("event sign-ups", res.ok);
    }
  }
}

const quizAnswers = new Map(ecoQuiz.questions.map((q) => [q.question, q.correctIndex]));

async function runQuiz(ctx: Context, session: Session, quizId: string, failFirst: boolean) {
  const api = ctx.api(session);
  const quiz = await api.get(`/api/quizzes/${quizId}`);
  const questions = list(quiz.questions);
  const answers = (right: boolean) =>
    questions.map((q) => {
      const correct = quizAnswers.get(str(q.question));
      return {
        questionId: str(q.id),
        optionIndex: correct === undefined ? 0 : right ? correct : (correct + 1) % 4,
      };
    });
  if (questions.some((q) => !quizAnswers.has(str(q.question)))) return false;
  if (failFirst)
    await api.send("POST", `/api/quizzes/${quizId}/submit`, { answers: answers(false) });
  const res = await api.send("POST", `/api/quizzes/${quizId}/submit`, { answers: answers(true) });
  return res.ok && rec(res.value).passed === true;
}

async function playChallenges(ctx: Context, sessions: Map<string, Session>) {
  for (const [index, persona] of PERSONAS.entries()) {
    const session = sessions.get(persona.key) as Session;
    const api = ctx.api(session);
    const challenges = list((await api.get("/api/challenges")).challenges)
      .filter((c) => c.ended !== true)
      .sort((a, b) => str(a.title).localeCompare(str(b.title)));
    const individual = challenges.filter((c) => str(c.mode) === "individual");
    for (const [j, c] of challenges.entries()) {
      const id = str(c.id);
      const progress = rec(c.progress);
      if (str(c.mode) === "team") {
        // Most people add to their precinct's team once a day.
        if ((index + j) % 4 !== 3) {
          const res = await api.send("POST", `/api/challenges/${id}/contribute`);
          if (!res.ok && !DAILY_CODES.has(res.code))
            ctx.log(`  skipped team contribution: ${res.code}`);
          ctx.counts.tally("team contributions", res.ok);
        }
        continue;
      }
      const goal = rec(c.goal);
      const target = num(goal.target);
      const position = individual.indexOf(c);
      const outcome = OUTCOMES[(index + position) % OUTCOMES.length];
      if (outcome === "none") continue;
      if (str(goal.type) === "quiz") {
        if (str(progress.status) === "completed") {
          ctx.counts.tally("quizzes passed", false);
        } else if (outcome === "complete" && str(c.quizId)) {
          ctx.counts.tally(
            "quizzes passed",
            await runQuiz(ctx, session, str(c.quizId), index % 3 === 1),
          );
        }
        continue;
      }
      if (str(progress.status) === "completed" || str(progress.status) === "pending_verification") {
        ctx.counts.tally("challenge completions", false);
        continue;
      }
      if (!c.progress) {
        const res = await api.send("POST", `/api/challenges/${id}/join`);
        ctx.counts.tally("challenges joined", res.ok);
        if (!res.ok) continue;
      } else {
        ctx.counts.tally("challenges joined", false);
      }
      if (outcome === "join") continue;
      const goalValue =
        outcome === "partial"
          ? Math.max(1, Math.floor(target * (0.4 + 0.1 * ((index + j) % 4))))
          : target;
      if (num(progress.current) < goalValue) {
        await api.send("PUT", `/api/challenges/${id}/progress`, { current: goalValue });
      }
      if (outcome === "complete") {
        const res = await api.send("POST", `/api/challenges/${id}/complete`);
        ctx.counts.tally("challenge completions", res.ok);
      }
    }
  }
}

async function checkIns(ctx: Context, sessions: Map<string, Session>) {
  for (const [index, persona] of PERSONAS.entries()) {
    // A few people skip today so the streaks differ.
    if (index % 6 === 5) continue;
    const res = await ctx
      .api(sessions.get(persona.key) as Session)
      .send("POST", "/api/me/check-in");
    ctx.counts.tally("check-ins", res.ok);
  }
}

// Each listed person redeems the cheapest reward they can afford until they hold `target` redemptions.
async function redeemRewards(
  ctx: Context,
  sessions: Map<string, Session>,
  targets: Map<string, number>,
) {
  for (const [key, target] of targets) {
    const api = ctx.api(sessions.get(key) as Session);
    const rewards = list((await api.get("/api/rewards")).rewards);
    let held = rewards.filter((r) => str(r.status) === "redeemed").length;
    const available = rewards
      .filter((r) => str(r.status) === "available")
      .sort((a, b) => num(a.pointsCost) - num(b.pointsCost));
    for (const reward of available) {
      if (held >= target) break;
      const res = await api.send("POST", `/api/rewards/${str(reward.id)}/redeem`);
      if (res.ok) {
        held += 1;
        ctx.counts.tally("rewards redeemed", true);
      }
    }
    if (held >= target) ctx.counts.tally("rewards redeemed", false);
  }
}

const SEED_REDEEMERS = new Map([0, 2, 4, 6].map((i) => [`youth-${i}`, 1]));
const FINISH_REDEEMERS = new Map([0, 2, 4, 6].map((i) => [`youth-${i}`, 2]));

async function leaderboardLines(ctx: Context, sessions: Map<string, Session>): Promise<string[]> {
  const first = sessions.get("youth-0") as Session;
  const board = await ctx.api(first).get("/api/leaderboard");
  return list(board.entries)
    .slice(0, 5)
    .map((e) => `  #${num(e.rank)} ${str(e.displayName)}: ${num(e.lifetimePoints)} points`);
}

export async function runSeed(deps: RunDeps): Promise<void> {
  const ctx = makeContext(deps);
  const sessions = new Map<string, Session>();
  for (const persona of PERSONAS) {
    sessions.set(persona.key, await prepare(ctx, persona));
    ctx.log(`  ready: ${persona.name}`);
  }
  const { latestFinish } = await seedRequests(ctx, sessions);
  await joinEvents(ctx, sessions);
  await playChallenges(ctx, sessions);
  await checkIns(ctx, sessions);
  await redeemRewards(ctx, sessions, SEED_REDEEMERS);
  ctx.log("Seed pass done");
  for (const line of ctx.counts.lines()) ctx.log(line);
  const wait = Math.max(0, Math.ceil((latestFinish - ctx.now()) / 60_000));
  ctx.log(
    `Next: wait about ${wait + 1} minutes (until ${new Date(latestFinish).toISOString()}), then run the finish pass.`,
  );
}

export async function runFinish(deps: RunDeps): Promise<void> {
  const ctx = makeContext(deps);
  const sessions = new Map<string, Session>();
  for (const persona of PERSONAS) sessions.set(persona.key, await prepare(ctx, persona));
  const plans = new Map(REQUESTS.map((r) => [r.title, r]));
  let notDue = 0;
  let nextDue = Number.POSITIVE_INFINITY;
  for (const volunteer of YOUTH) {
    const api = ctx.api(sessions.get(volunteer.key) as Session);
    for (const r of list((await api.get("/api/requests/mine")).requests)) {
      const plan = plans.get(str(r.title));
      if (!plan || plan.stage.kind !== "finish") continue;
      if (str(r.status) !== "matched") {
        ctx.counts.tally("completed requests", false);
        continue;
      }
      const startsAt = Date.parse(str(r.scheduledAt));
      if (startsAt > ctx.now()) {
        notDue += 1;
        nextDue = Math.min(nextDue, startsAt);
        continue;
      }
      const res = await api.send("POST", `/api/requests/${str(r.id)}/complete`, {
        minutesSpent: plan.stage.minutesSpent,
      });
      ctx.counts.tally("completed requests", res.ok);
    }
  }
  for (const elder of ELDERS) {
    const api = ctx.api(sessions.get(elder.key) as Session);
    for (const r of list((await api.get("/api/requests/mine")).requests)) {
      const plan = plans.get(str(r.title));
      if (!plan || plan.stage.kind !== "finish" || !plan.stage.confirm) continue;
      if (str(r.status) !== "completed" || r.confirmedAt) {
        ctx.counts.tally("confirmed requests", false);
        continue;
      }
      const res = await api.send("POST", `/api/requests/${str(r.id)}/confirm`);
      ctx.counts.tally("confirmed requests", res.ok);
    }
  }
  await redeemRewards(ctx, sessions, FINISH_REDEEMERS);
  ctx.log("Finish pass done");
  for (const line of ctx.counts.lines()) ctx.log(line);
  if (notDue > 0) {
    ctx.log(
      `${notDue} request(s) have not started yet; run the finish pass again after ${new Date(nextDue).toISOString()}.`,
    );
  }
  ctx.log("Leaderboard (top 5):");
  for (const line of await leaderboardLines(ctx, sessions)) ctx.log(line);
}
