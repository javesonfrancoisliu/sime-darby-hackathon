import { useNavigate } from "react-router-dom";
import type { HelpCategory } from "../api/client";
import { BackLink } from "../ui/BackLink";
import {
  IconShoppingBag,
  IconCar,
  IconDevice,
  IconHeartHandshake,
  IconHeartPulse,
  IconChevronRight,
} from "../ui/Icons";

interface SupportCategoryItem {
  id: HelpCategory;
  ariaLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
}

const CATEGORIES: SupportCategoryItem[] = [
  {
    id: "groceries",
    ariaLabel: "Groceries",
    title: "Trip to Groceries",
    subtitle: "A trip to groceries together with younger volunteers",
    badge: "Most Requested",
  },
  {
    id: "transport",
    ariaLabel: "Transport",
    title: "Transport to Amenities",
    subtitle: "Transport to nearby clinic, groceries, or simple daily needs",
  },
  {
    id: "digital_literacy",
    ariaLabel: "Learning technology",
    title: "Digital Literacy & AI",
    subtitle: "Guidance on new technologies, e-wallets, video calls, AI taught by youth volunteers",
    badge: "Youth Mentors",
  },
  {
    id: "volunteer_support",
    ariaLabel: "Volunteer Support",
    title: "Youth Support & Household Fixes",
    subtitle: "Volunteers from younger neighbourhoods support and help with home repairs & tasks",
  },
  {
    id: "health_literacy",
    ariaLabel: "Health Literacy and Events",
    title: "Health Literacy & Wellness Events",
    subtitle: "Understand medical notes, accompany to screenings, and join township wellness sessions",
  },
];

function getCategoryIcon(id: HelpCategory) {
  switch (id) {
    case "groceries":
      return <IconShoppingBag size={24} strokeWidth={1.8} />;
    case "transport":
      return <IconCar size={24} strokeWidth={1.8} />;
    case "digital_literacy":
      return <IconDevice size={24} strokeWidth={1.8} />;
    case "volunteer_support":
      return <IconHeartHandshake size={24} strokeWidth={1.8} />;
    case "health_literacy":
      return <IconHeartPulse size={24} strokeWidth={1.8} />;
  }
}

/**
 * Help a Neighbour — Category Selection
 * Covers the 5 daily support areas requested for Elderly:
 * a. A trip to groceries together with younger volunteers
 * b. Transport to nearby amenities (clinic, groceries or any other simple daily needs)
 * c. Digital Literacy help, with short guidance on new technologies, e-wallets, video calls, AI taught by youth volunteers
 * d. Volunteers from younger neighbourhoods support and help the elderly community.
 * e. Health Literacy and Events
 */
export function CategoryPage() {
  const navigate = useNavigate();

  return (
    <div className="category-selection-page">
      <BackLink />
      <h1 className="ui-page-title">What do you need help with?</h1>
      <p className="ui-page-subtitle app-page-lead">
        Choose a daily support area to match with a verified youth volunteer in Elmina.
      </p>

      <div className="ui-stack">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="category-choice-card"
            aria-label={cat.ariaLabel}
            onClick={() => navigate(`/request/${cat.id}`)}
          >
            <div className="category-choice-card__icon" aria-hidden="true">
              {getCategoryIcon(cat.id)}
            </div>
            <div className="category-choice-card__content">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span className="category-choice-card__title">{cat.title}</span>
                {cat.badge && (
                  <span className="safety-chip" style={{ background: "#FEF2F2", color: "#D71920", fontSize: 11 }}>
                    {cat.badge}
                  </span>
                )}
              </div>
              <span className="category-choice-card__desc">{cat.subtitle}</span>
            </div>
            <span className="category-choice-card__arrow" aria-hidden="true">
              <IconChevronRight size={18} strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
