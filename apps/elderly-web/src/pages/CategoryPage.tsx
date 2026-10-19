import { useNavigate } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { CATEGORY_OPTIONS } from "../requests/categories";
import { BackLink } from "../ui/BackLink";
import { CategoryIcon } from "../ui/CategoryIcon";
import { IconChevronRight } from "../ui/Icons";

// Help a Neighbour - Category Selection
// Covers the 5 daily support areas requested for Elderly:
// a. A trip to groceries together with younger volunteers
// b. Transport to nearby amenities (clinic, groceries or any other simple daily needs)
// c. Digital Literacy help, with short guidance on new technologies, e-wallets, video calls, AI taught by youth volunteers
// d. Volunteers from younger neighbourhoods support and help the elderly community.
// e. Health Literacy and Events
export function CategoryPage() {
  const navigate = useNavigate();
  const { speak } = useAccessibility();

  return (
    <div className="category-selection-page">
      <BackLink
        onReadAloud={() => speak("What do you need help with? Choose a daily support area.")}
      />
      <h1 className="ui-page-title">What do you need help with?</h1>
      <p className="ui-page-subtitle app-page-lead">
        Choose a daily support area to match with a verified youth volunteer in Elmina.
      </p>

      <div className="ui-stack">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="category-choice-card"
            aria-label={cat.label}
            onClick={() => navigate(`/request/${cat.id}`)}
          >
            <div className="category-choice-card__icon" aria-hidden="true">
              <CategoryIcon id={cat.id} size={24} />
            </div>
            <div className="category-choice-card__content">
              <div className="row-center category-choice-card__heading">
                <span className="category-choice-card__title">{cat.title}</span>
                {cat.badge && <span className="safety-chip tone-brand">{cat.badge}</span>}
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
