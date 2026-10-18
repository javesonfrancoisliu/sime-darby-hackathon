/* ─────────────────────────────────────────────────────────
   Mock "My Requests" data — used only as a DEV fallback when
   the backend API is not running, so the elderly resident's
   request history is visible in the demo. Replaced by the real
   @sdh/contracts API in production.
───────────────────────────────────────────────────────── */
import type { HelpRequest } from "../api/client";

export const MOCK_HELP_REQUESTS: HelpRequest[] = [
  {
    id: "HR-1042",
    category: "groceries",
    description: "Help carrying groceries up to my flat on the 3rd floor.",
    status: "matched",
    volunteerName: "Aisha Rahman",
  },
  {
    id: "HR-1038",
    category: "transport",
    description: "Ride to Klinik Komuniti Elmina for my 10am check-up on Tuesday.",
    status: "in_progress",
    volunteerName: "Daniel Tan",
  },
  {
    id: "HR-1035",
    category: "digital_literacy",
    description: "Teach me how to make a WhatsApp video call to my grandchildren.",
    status: "pending",
  },
  {
    id: "HR-1021",
    category: "volunteer_support",
    description: "Replace two ceiling light bulbs in the kitchen and hallway.",
    status: "completed",
    volunteerName: "Siti Nurhaliza",
  },
  {
    id: "HR-1007",
    category: "health_literacy",
    description: "Explain my new blood-pressure medication schedule.",
    status: "completed",
    volunteerName: "Faizal Omar",
  },
];
