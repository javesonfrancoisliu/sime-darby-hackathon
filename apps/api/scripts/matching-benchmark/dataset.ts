import { User, type Category } from "@sdh/contracts";
import type { MatchTarget } from "../../src/modules/matching/scoring";

export const DATASET_VERSION = "township-matching-v1";
export interface Scenario {
  id: string;
  title: string;
  target: MatchTarget;
  volunteers: User[];
  /** Most relevant tier first; order within each tier is intentionally unconstrained. */
  expectedTiers: string[][];
  excluded: string[];
  rationale: string;
  /** Context-specific evidence expected in the best candidate's explanation; a lexical proxy only. */
  explanationAnchors: string[];
}

const HOME = { lat: 3.1, lng: 101.5 };
const SLOT = { day: "wed", start: "13:00", end: "17:00" } as const;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

interface Definition {
  title: string;
  category: Category;
  description: string;
  specialist: string;
  generalist: string;
  rationale: string;
  anchors: string[];
}

// Fictional non-emergency requests. No real residents, contact details or medical records.
const definitions: Definition[] = [
  {
    title: "Heavy grocery bags",
    category: "groceries",
    description:
      "I can choose groceries but need someone to carry heavy bags from the shop to my door.",
    specialist: "Regularly carries grocery bags and helps neighbours unload shopping.",
    generalist: "Helps at grocery checkout and sorts receipts; no carrying experience listed.",
    rationale:
      "Carrying experience addresses the physical task better than checkout experience, despite a longer distance.",
    anchors: ["carry", "carrying", "bags"],
  },
  {
    title: "Pasar shopping list",
    category: "groceries",
    description:
      "Please accompany me to the pasar and help locate ingredients on my shopping list.",
    specialist:
      "Accompanies neighbours around the pasar and locates ingredients from shopping lists.",
    generalist: "Delivers sealed grocery orders to doorsteps.",
    rationale:
      "Market navigation fits accompanying and locating ingredients better than delivery alone.",
    anchors: ["pasar", "market", "ingredients", "list"],
  },
  {
    title: "Small grocery delivery",
    category: "groceries",
    description:
      "I am waiting for a repair visit. Please collect my prepaid grocery order and leave it at my door.",
    specialist: "Collects prepaid grocery orders and delivers them to neighbours at home.",
    generalist: "Leads supermarket tours and explains food labels.",
    rationale:
      "Order collection and delivery directly fit the request; food-label instruction is unrelated.",
    anchors: ["collect", "prepaid", "deliver", "order"],
  },
  {
    title: "Clinic transport with a walker",
    category: "transport",
    description:
      "I need a lift to a routine clinic appointment and help folding my walker into the car. No medical help is needed.",
    specialist: "Drives neighbours to appointments and has helped load folding walkers into cars.",
    generalist: "Drives community event guests and knows local parking areas.",
    rationale:
      "Walker-loading experience fits this routine journey; do not infer clinical qualifications.",
    anchors: ["walker", "fold", "appointment"],
  },
  {
    title: "Return trip from the library",
    category: "transport",
    description:
      "Please pick me up at the library and help carry my books to the car before taking me home.",
    specialist: "Provides library lifts and helps neighbours carry borrowed books to the car.",
    generalist: "Drives neighbours to sports events.",
    rationale:
      "Library pickups with book carrying match the request more closely than general event driving.",
    anchors: ["library", "books", "carry"],
  },
  {
    title: "Video call practice",
    category: "digital_literacy",
    description:
      "I want to practise answering a video call from my family on my smartphone, slowly and more than once.",
    specialist:
      "Patiently teaches smartphone video calls, repeating each step with older learners.",
    generalist: "Repairs desktop computers and installs printers.",
    rationale: "Patient phone teaching fits better than desktop repair expertise.",
    anchors: ["video", "repeat", "patient", "phone"],
  },
  {
    title: "Recognising suspicious messages",
    category: "digital_literacy",
    description:
      "Please help me recognise suspicious WhatsApp messages. I do not want anyone to open banking apps or ask for passwords.",
    specialist:
      "Runs WhatsApp scam-awareness practice and teaches people never to share passwords.",
    generalist: "Teaches smartphone photography and photo albums.",
    rationale:
      "Scam-awareness teaching addresses the safety context; no password or financial access should be suggested.",
    anchors: ["scam", "suspicious", "password", "whatsapp"],
  },
  {
    title: "Larger phone text",
    category: "digital_literacy",
    description:
      "The text on my phone is hard to read. Please help me make it larger and practise finding my contacts.",
    specialist: "Helps older smartphone users enlarge text and navigate their contact list.",
    generalist: "Helps neighbours buy laptops online.",
    rationale:
      "Accessibility settings and contact navigation are more relevant than online laptop shopping.",
    anchors: ["text", "larger", "enlarge", "contact"],
  },
  {
    title: "Read a clinic leaflet",
    category: "health_literacy",
    description:
      "Please read a general clinic appointment leaflet with me and help me write questions for the clinic. Do not diagnose or advise medicine changes.",
    specialist:
      "Reads general clinic leaflets with neighbours and helps prepare questions for qualified staff.",
    generalist: "Organises community fitness games.",
    rationale:
      "Leaflet reading and question preparation fit; no volunteer should be described as a clinician without evidence.",
    anchors: ["leaflet", "questions", "read"],
  },
  {
    title: "Find the clinic counter",
    category: "health_literacy",
    description:
      "At my routine clinic visit, I need help understanding the registration signs and finding the correct counter, not medical advice.",
    specialist:
      "Guides neighbours through clinic registration signs and helps locate appointment counters.",
    generalist: "Shares general healthy-living leaflets at events.",
    rationale:
      "Registration navigation addresses the practical assistance requested, without implying medical expertise.",
    anchors: ["registration", "counter", "signs"],
  },
  {
    title: "Loose cupboard handle",
    category: "home_help",
    description:
      "A cupboard handle is loose. Please help tighten its screws using hand tools; no electrical work is involved.",
    specialist: "Fixes loose furniture handles and tightens screws with hand tools.",
    generalist: "Helps water plants and sweep porches.",
    rationale:
      "Basic furniture repair directly fits the task; do not infer electrician certification.",
    anchors: ["handle", "screw", "furniture", "tools"],
  },
  {
    title: "Arrange light storage boxes",
    category: "home_help",
    description:
      "Please help move a few empty lightweight storage boxes from the floor to a low shelf so my walkway is clear.",
    specialist: "Helps neighbours organise lightweight boxes on low shelves and clear walkways.",
    generalist: "Fixes leaking outdoor taps.",
    rationale: "Organisation and clear-walkway experience fit better than plumbing repair.",
    anchors: ["boxes", "shelf", "shelves", "walkway"],
  },
  {
    title: "Join board games",
    category: "community_activity",
    description:
      "I am nervous about joining the community board-game afternoon. Please walk in with me and introduce me to the group.",
    specialist: "Welcomes first-time board-game visitors and introduces them to community groups.",
    generalist: "Sets up sound equipment for community events.",
    rationale: "Welcoming newcomers addresses social confidence; event logistics alone do not.",
    anchors: ["welcome", "introduc", "board", "first"],
  },
  {
    title: "Community garden visit",
    category: "community_activity",
    description:
      "Please accompany me on a relaxed community garden visit and help me find a seated activity rather than heavy gardening.",
    specialist:
      "Hosts gentle garden visits and helps neighbours choose seated seed-sorting activities.",
    generalist: "Organises heavy digging and landscaping at community clean-ups.",
    rationale:
      "Seated gentle activities fit the request; strength or heavy gardening is not the requested assistance.",
    anchors: ["seated", "gentle", "seed", "relaxed"],
  },
  {
    title: "Read an event timetable",
    category: "community_activity",
    description:
      "Please read the community fair timetable with me and help choose a quiet activity away from loud music.",
    specialist: "Helps neighbours read fair timetables and locate quiet community activities.",
    generalist: "Leads loud music sessions and stage performances at community events.",
    rationale:
      "Quiet-activity planning fits the stated preference better than music performance experience.",
    anchors: ["quiet", "timetable", "read"],
  },
];

export const scenarios: Scenario[] = definitions.map((d, index) => {
  const base = index * 10;
  const make = (offset: number, overrides: Partial<User>): User =>
    User.parse({
      id: id(base + offset),
      name: `Fictional helper ${base + offset}`,
      area: "Fictional Elmina precinct",
      role: "volunteer",
      verification: "verified",
      skills: [d.category],
      experience: "Helps with general community activities.",
      availability: [SLOT],
      location: HOME,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      ...overrides,
    });
  // Three simple controls align distance and experience; twelve cases require a contextual tradeoff.
  const control = [2, 7, 10].includes(index);
  const specialist = make(1, {
    experience: d.specialist,
    location: { ...HOME, lat: control ? 3.104 : 3.111 },
  });
  const generalist = make(2, {
    experience: d.generalist,
    location: { ...HOME, lat: control ? 3.111 : 3.104 },
  });
  const partial = make(3, {
    skills: [],
    experience: d.specialist,
    availability: [],
    location: { ...HOME, lat: 3.12 },
  });
  const unverified = make(4, { verification: "pending", experience: d.specialist });
  const unavailable = make(5, {
    experience: d.specialist,
    availability: [{ day: "thu", start: "13:00", end: "17:00" }],
  });
  const far = make(6, { experience: d.specialist, location: { ...HOME, lat: 3.2 } });
  // Mix proximity controls with contextual tradeoffs and disallowed lookalikes.
  return {
    id: `scenario-${String(index + 1).padStart(2, "0")}`,
    title: d.title,
    target: {
      category: d.category,
      title: d.title,
      description: d.description,
      scheduledAt: "2027-01-06T06:00:00Z",
      durationMinutes: 60,
      location: HOME,
    },
    volunteers: [far, generalist, unverified, partial, unavailable, specialist],
    expectedTiers: [[specialist.id], [generalist.id], [partial.id]],
    excluded: [unverified.id, unavailable.id, far.id],
    rationale: control
      ? `Control: relevant experience and proximity both favour the specialist. ${d.rationale}`
      : d.rationale,
    explanationAnchors: d.anchors,
  };
});
