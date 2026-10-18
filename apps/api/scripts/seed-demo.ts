// Fills DynamoDB Local with demo users, open help requests and upcoming events.
// Goes through the services so every record follows the same rules as the API.
// Refuses to run without DYNAMODB_ENDPOINT so it never touches AWS. Skips if users already exist.
import type { Category, CreateUserBody, Day } from "@sdh/contracts";
import { config } from "../src/lib/config";
import { createEvent } from "../src/modules/events/service";
import { createRequest, reviewRequest } from "../src/modules/requests/service";
import { createUser, listDemoUsers, reviewVolunteer } from "../src/modules/users/service";

if (!config.dynamodbEndpoint) {
  console.error("DYNAMODB_ENDPOINT is not set; copy apps/api/.env.example to apps/api/.env first.");
  process.exit(1);
}

if ((await listDemoUsers()).length > 0) {
  console.info(
    "Demo users already exist; nothing to seed. To pick up renamed demo data, run: docker compose down -v, then pnpm db:up, pnpm db:setup and pnpm db:seed.",
  );
  process.exit(0);
}

// City of Elmina, the demo township the web app shows. ~0.009 degrees is about 1 km.
const BASE = { lat: 3.0738, lng: 101.5183 };
const KM = 0.009;
const near = (northKm: number, eastKm: number) => ({
  lat: BASE.lat + northKm * KM,
  lng: BASE.lng + eastKm * KM,
});

// Malaysia local time, `days` from today, so the demo never goes stale.
function at(days: number, hour: number, minute = 0): string {
  const myt = new Date(Date.now() + 8 * 3600_000);
  myt.setUTCDate(myt.getUTCDate() + days);
  myt.setUTCHours(hour, minute, 0, 0);
  return new Date(myt.getTime() - 8 * 3600_000).toISOString();
}

const ALL_DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const person = (
  name: string,
  role: CreateUserBody["role"],
  area: string,
  location: { lat: number; lng: number },
  extra: Partial<CreateUserBody> = {},
): CreateUserBody => ({
  name,
  role,
  area,
  location,
  skills: [],
  experience: "",
  availability: [],
  ...extra,
});

const coordinator = await createUser(
  person(
    "Puan Aminah (Coordinator)",
    "coordinator",
    "Management Office, City of Elmina",
    near(0, 0),
  ),
);

const volunteer = await createUser(
  person("Justina Tan", "volunteer", "Block C, Elmina West", near(0, 0), {
    skills: ["groceries", "digital_literacy", "transport", "community_activity"],
    experience: "Helps her grandparents with phones and errands every week.",
    availability: ALL_DAYS.map((day) => ({ day, start: "08:00", end: "21:00" })),
  }),
);
await reviewVolunteer(volunteer.id, "verified");

// Left pending so the "not verified yet" path can be shown too.
await createUser(
  person("Aiman Hakim", "volunteer", "Block D, Elmina West", near(-0.4, 0.6), {
    skills: ["home_help"],
  }),
);

const elders = await Promise.all([
  createUser(person("Uncle Lim", "elder", "Block A, Elmina West", near(0.3, 0.4))),
  createUser(person("Auntie Mary", "elder", "Block B, Elmina West", near(0.9, -0.5))),
  createUser(person("Encik Rahman", "elder", "Elmina Valley", near(-1.6, 1.1))),
]);

const requests: {
  elder: number;
  category: Category;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
}[] = [
  {
    elder: 0,
    category: "groceries",
    title: "Weekly grocery run",
    description: "Carry and deliver a small grocery list from the market to Block A.",
    scheduledAt: at(1, 9, 30),
    durationMinutes: 45,
  },
  {
    elder: 1,
    category: "digital_literacy",
    title: "Set up video calls on a phone",
    description: "Help install and try a video-call app to reach family.",
    scheduledAt: at(1, 16),
    durationMinutes: 30,
  },
  {
    elder: 2,
    category: "transport",
    title: "Ride to the health clinic",
    description: "Accompany to a routine clinic appointment and back.",
    scheduledAt: at(2, 8),
    durationMinutes: 90,
  },
  {
    elder: 0,
    category: "health_literacy",
    title: "Explain a health leaflet",
    description: "Read through a clinic leaflet together and answer questions.",
    scheduledAt: at(3, 15, 30),
    durationMinutes: 25,
  },
  {
    elder: 1,
    category: "home_help",
    title: "Change a ceiling light bulb",
    description: "Needs someone steady on a ladder to swap a kitchen bulb.",
    scheduledAt: at(4, 11),
    durationMinutes: 20,
  },
];

for (const r of requests) {
  const elder = elders[r.elder]!;
  const created = await createRequest(elder, {
    category: r.category,
    title: r.title,
    description: r.description,
    scheduledAt: r.scheduledAt,
    durationMinutes: r.durationMinutes,
    location: { ...elder.location, area: elder.area },
  });
  await reviewRequest(created.id, { decision: "approved" });
}

const events = [
  {
    title: "Smartphone help clinic for seniors",
    category: "digital_literacy" as const,
    description: "Young volunteers help with messaging, e-wallets and video calls.",
    startsAt: at(3, 15),
    durationMinutes: 90,
    location: { ...near(1.2, 0.9), area: "Reading Room, Block C" },
    capacity: 20,
  },
  {
    title: "Central Park clean-up",
    category: "community_activity" as const,
    description: "Join the neighbourhood clean-up at Central Park.",
    startsAt: at(6, 8, 30),
    durationMinutes: 120,
    location: { ...near(1.1, 1.0), area: "Central Park, City of Elmina" },
    capacity: 40,
  },
  {
    title: "Neighbourhood potluck morning",
    category: "community_activity" as const,
    description: "Bring a dish and meet the folks on your street over breakfast.",
    startsAt: at(7, 9),
    durationMinutes: 120,
    location: { ...near(0.2, -0.3), area: "Community Hall, Elmina West" },
    capacity: 80,
  },
];

for (const e of events) await createEvent(coordinator, e);

console.info(
  `Seeded ${requests.length} open requests and ${events.length} events in ${config.tableName}.`,
);
console.info(`Verified volunteer: ${volunteer.name} (${volunteer.id})`);
