import type { Category } from "@sdh/contracts";

export interface CategoryOption {
  id: Category;
  // Short name used on badges, headings and as the request title.
  label: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

// Every contract category has a plain label; only some are offered to residents.
export const CATEGORY_TEXT: Record<Category, string> = {
  groceries: "Groceries",
  transport: "Transport",
  digital_literacy: "Phone and computer help",
  health_literacy: "Health help",
  home_help: "Help at home",
  community_activity: "Community activity",
};

// Categories a resident can ask for, in display order.
export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "groceries",
    label: CATEGORY_TEXT.groceries,
    title: "Grocery Trip Together",
    subtitle: "A trip to groceries together with younger volunteers",
    description:
      "Get paired with a friendly neighbourhood youth volunteer to shop for fresh market produce or household essentials together.",
    badge: "Most Requested",
  },
  {
    id: "transport",
    label: CATEGORY_TEXT.transport,
    title: "Transport to Amenities",
    subtitle: "Transport to nearby clinic, groceries, or daily errands",
    description:
      "Safe, guided rides to local clinics, pharmacies, post offices, or township community centres.",
  },
  {
    id: "digital_literacy",
    label: CATEGORY_TEXT.digital_literacy,
    title: "Digital Literacy Guidance",
    subtitle: "Learn smartphone apps, e-wallets, video calls & AI",
    description:
      "Patient, one-on-one guidance from youth volunteers on using Touch 'n Go, WhatsApp video calls, online banking, and AI tools.",
    badge: "Youth Mentors",
  },
  {
    id: "home_help",
    label: CATEGORY_TEXT.home_help,
    title: "Youth Support & Repairs",
    subtitle: "Volunteers from younger neighbourhoods support & help",
    description:
      "Assistance with light household fixes, bulb replacement, moving bulky items, gardening, or friendly companionship.",
  },
  {
    id: "health_literacy",
    label: CATEGORY_TEXT.health_literacy,
    title: "Health Literacy & Events",
    subtitle: "Guidance on wellness, screenings & community sessions",
    description:
      "Support understanding medication schedules, accompanying you to health screenings, and attending wellness sessions.",
  },
];

export function findCategoryOption(value: string | undefined): CategoryOption | undefined {
  return CATEGORY_OPTIONS.find((option) => option.id === value);
}

export const PLACEHOLDERS: Record<string, string> = {
  groceries:
    "For example: I'd like a volunteer to walk with me to the morning market or supermarket to buy vegetables and groceries.",
  transport:
    "For example: Need a lift to Klinik Kesihatan or community pharmacy at 10:30 am on Thursday.",
  digital_literacy:
    "For example: Guidance on setting up Touch 'n Go e-wallet, making WhatsApp video calls, or using AI assistance.",
  home_help:
    "For example: Need help changing high ceiling lightbulbs, fixing a loose garden gate, or light home repairs.",
  health_literacy:
    "For example: Looking for a volunteer to explain my medication schedule or accompany me to the health screening.",
};
