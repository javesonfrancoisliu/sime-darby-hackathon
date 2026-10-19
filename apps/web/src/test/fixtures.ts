import {
  Badge,
  Challenge,
  CommunityEvent,
  ContributionsResponse,
  FacilityReport,
  HelpRequest,
  HelpRequestSummary,
  Notice,
  PointsSummary,
  Quiz,
  QuizPublic,
  Reward,
  Settings,
  Township,
  User,
  type OpportunitiesResponse,
  type SafetyResponse,
} from "@sdh/contracts";

// Fixtures are parsed with the contract schemas so a drifting shape fails the test.
const BASE_USER = {
  location: { lat: 3.2, lng: 101.5 },
  skills: [],
  experience: "",
  availability: [],
  createdAt: "2026-10-01T09:00:00+08:00",
  updatedAt: "2026-10-01T09:00:00+08:00",
};

export const VOLUNTEER = User.parse({
  ...BASE_USER,
  id: "5b0d3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
  role: "volunteer",
  name: "Aisha Rahman",
  area: "Elmina West",
  verification: "verified",
});

export const OTHER_VOLUNTEER = User.parse({
  ...VOLUNTEER,
  id: "7c1e4b63-7a1b-4d44-8e8f-1b2a7d2e3f02",
  name: "Daniel Lim",
  area: "Elmina Valley",
});

export const PENDING_VOLUNTEER = User.parse({
  ...VOLUNTEER,
  id: "8d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03",
  name: "Hafiz Aziz",
  verification: "pending",
});

export const ELDER = User.parse({
  ...BASE_USER,
  id: "9e3a6d85-9c3d-4f66-8aa1-3d4c9f4a5b04",
  role: "elder",
  name: "Puan Salmah",
  area: "Elmina Valley",
  verification: "not_required",
});

const PLACE = { lat: 3.2, lng: 101.5, area: "Elmina Valley" };
const STAMP = "2026-10-18T09:00:00+08:00";

export function makeRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return HelpRequest.parse({
    id: "a14b7e96-ad4e-4a77-9bb2-4e5dad5b6c05",
    elderId: ELDER.id,
    elderName: ELDER.name,
    category: "groceries",
    title: "Groceries",
    description: "Milk and bread",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes: 60,
    location: PLACE,
    status: "open",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

export function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return CommunityEvent.parse({
    id: "b25c8fa7-be5f-4b88-8cc3-5f6ebe6c7d06",
    title: "Tea morning",
    category: "community_activity",
    description: "Tea and a chat",
    startsAt: "2026-10-22T10:00:00+08:00",
    durationMinutes: 90,
    location: PLACE,
    capacity: 20,
    signupCount: 3,
    status: "upcoming",
    createdBy: VOLUNTEER.id,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

export function makeRequestOpportunity(
  overrides: Partial<HelpRequestSummary> = {},
): OpportunitiesResponse["items"][number] {
  const { id, category, title, description, scheduledAt, durationMinutes, status } = makeRequest();
  return {
    kind: "request",
    matchScore: 80,
    reasons: ["Close to you"],
    request: HelpRequestSummary.parse({
      id,
      category,
      title,
      description,
      scheduledAt,
      durationMinutes,
      status,
      createdAt: STAMP,
      updatedAt: STAMP,
      area: "Elmina Valley",
      distanceKm: 1.5,
      ...overrides,
    }),
  };
}

export const NO_CONTRIBUTIONS = ContributionsResponse.parse({
  totalMinutes: 0,
  completedCount: 0,
  items: [],
});

const ID_A = "0a1b2c3d-1111-4a11-8a11-000000000001";
const ID_B = "0a1b2c3d-2222-4a22-8a22-000000000002";
const ID_C = "0a1b2c3d-3333-4a33-8a33-000000000003";

export const TOWNSHIP = Township.parse({
  id: "elmina",
  name: "Elmina",
  securityLine: { display: "03-5000 1234", tel: "0350001234" },
  emergencyNumber: "999",
  updatedAt: STAMP,
});

export function makeNotice(overrides: Partial<Notice> = {}): Notice {
  return Notice.parse({
    id: ID_A,
    kind: "update",
    title: "New recycling hours",
    description: "The recycling centre opens an hour earlier.",
    area: "Elmina Valley",
    topic: "Recycling",
    priority: "normal",
    source: "Township office",
    publishedAt: "2026-10-17T09:00:00Z",
    createdBy: VOLUNTEER.id,
    createdAt: "2026-10-17T09:00:00Z",
    updatedAt: "2026-10-17T09:00:00Z",
    ...overrides,
  });
}

export function makeMaintenance(overrides: Partial<Notice> = {}): Notice {
  return makeNotice({
    id: ID_B,
    kind: "maintenance",
    title: "Lift service at Block C",
    topic: "Lifts",
    windowStart: "2026-10-21T01:00:00Z",
    windowEnd: "2026-10-21T05:00:00Z",
    impact: "The lift is closed for the morning.",
    status: "scheduled",
    publishedAt: "2026-10-16T09:00:00Z",
    ...overrides,
  });
}

export function makeDrive(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return makeEvent({
    id: ID_C,
    title: "River clean-up drive",
    purpose: "volunteer_drive",
    organiser: "Green Elmina",
    capacity: 10,
    signupCount: 4,
    ...overrides,
  });
}

export function makeFacility(overrides: Partial<FacilityReport> = {}): FacilityReport {
  return FacilityReport.parse({
    id: ID_A,
    title: "Broken swing",
    area: "Elmina West",
    category: "Playground",
    status: "reported",
    description: "The seat is cracked.",
    reportedAt: "2026-10-18T01:00:00Z",
    updatedAt: "2026-10-18T01:00:00Z",
    ...overrides,
  });
}

export const SAFETY: SafetyResponse = {
  readings: [
    {
      type: "air",
      level: "moderate",
      area: "Elmina West",
      value: 62,
      unit: "AQI",
      advice: "Limit long outdoor exercise.",
      measuredAt: "2026-10-19T00:30:00Z",
    },
    {
      type: "water",
      level: "watch",
      name: "Sungai Buloh",
      waterBody: "river",
      normalMax: 2,
      area: "Elmina Valley",
      value: 2.4,
      unit: "m",
      advice: "Stay away from the bank.",
      measuredAt: "2026-10-19T00:30:00Z",
    },
    {
      type: "heat",
      level: "warning",
      area: "Elmina East",
      value: 34,
      unit: "°C",
      feelsLike: 39,
      humidity: 70,
      advice: "Drink water often.",
      measuredAt: "2026-10-19T00:30:00Z",
    },
  ],
  facilityReports: [
    makeFacility(),
    makeFacility({ id: ID_B, title: "Fixed gate", status: "resolved" }),
  ],
};

export function makeChallenge(overrides: Partial<Challenge> = {}) {
  return {
    ...Challenge.parse({
      id: ID_A,
      title: "Walk 20,000 steps",
      description: "Walk with your neighbours.",
      icon: "walk",
      category: "fitness",
      mode: "individual",
      audience: "all",
      goal: { target: 20000, unit: "steps", type: "steps" },
      points: 50,
      requiresVerification: false,
      endsOn: "2026-12-01T00:00:00Z",
      createdBy: VOLUNTEER.id,
      createdAt: STAMP,
      updatedAt: STAMP,
      ...overrides,
    }),
    ended: false,
  };
}

export function makeReward(
  overrides: Partial<Reward> & { status?: string; redeemedAt?: string } = {},
) {
  const { status = "available", redeemedAt, ...rest } = overrides;
  return {
    ...Reward.parse({
      id: ID_A,
      title: "Coffee voucher",
      description: "A free coffee.",
      pointsCost: 40,
      icon: "coffee",
      audience: "all",
      category: "food",
      active: true,
      createdAt: STAMP,
      updatedAt: STAMP,
      ...rest,
    }),
    status,
    ...(redeemedAt && { redeemedAt }),
  };
}

export function makeBadge(overrides: Partial<Badge> & { earned?: boolean } = {}) {
  const { earned = false, ...rest } = overrides;
  return {
    ...Badge.parse({
      id: ID_A,
      title: "First steps",
      description: "Reach 50 points.",
      icon: "star",
      kind: "points",
      threshold: 50,
      audience: "all",
      createdAt: STAMP,
      ...rest,
    }),
    earned,
  };
}

export const QUIZ = Quiz.parse({
  id: ID_A,
  title: "Eco quiz",
  questions: [
    {
      id: "q1",
      question: "Which bin?",
      options: ["Red", "Blue", "Green", "Black"],
      correctIndex: 1,
    },
    { id: "q2", question: "Second?", options: ["Yes", "No", "Maybe", "Never"], correctIndex: 0 },
  ],
  passMark: 2,
  createdAt: STAMP,
  updatedAt: STAMP,
});

export const QUIZ_PUBLIC = QuizPublic.parse({
  ...QUIZ,
  questions: QUIZ.questions.map(({ correctIndex: _correct, ...question }) => {
    void _correct;
    return question;
  }),
});

export function makePoints(points: number, ledger: PointsSummary["ledger"]["items"] = []) {
  return PointsSummary.parse({ points, lifetimePoints: points, ledger: { items: ledger } });
}

export const SETTINGS = Settings.parse({
  notifyEvents: true,
  notifyVolunteering: false,
  shareApproxLocation: false,
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
  voiceAssist: false,
  updatedAt: STAMP,
});
