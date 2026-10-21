import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { CalendarDays, Clock, Info, MapPin, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import type { Opportunity, Urgency } from "../../types/volunteer";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, Drawer, StatusBadge } from "../ui";

export type OpportunityCardProps = {
  opportunity: Opportunity;
  urgency: Urgency;
  joined: boolean;
  accepting?: boolean;
  onAccept: (opportunity: Opportunity) => void;
};

// Rephrase only evidence supplied by the backend; never infer missing profile facts.
export function matchingJustification(opportunity: Opportunity): string {
  if (
    opportunity.explanationSource === "ai" ||
    (opportunity.explanationSource === undefined && opportunity.matchSource === "ai")
  )
    return opportunity.reasons[0] ?? "";
  const clauses = opportunity.reasons
    .flatMap((reason) => reason.split("; "))
    .map((reason) => {
      if (reason === "Lists community activities as a skill")
        return "Community activities match your listed skills";
      if (reason.startsWith("Lists ") && reason.endsWith(" as a skill"))
        return `Your ${reason.slice(6, -11)} skills fit this task`;
      if (reason.startsWith("Experience mentions "))
        return `Your experience mentions ${reason.slice(20)}`;
      if (reason.startsWith("About ")) return `You are about ${reason.slice(6)}`;
      if (reason.startsWith("Free on ")) return "Your saved availability covers this time";
      return reason;
    });
  let explanation = "";
  for (const clause of clauses) {
    const next = `${explanation ? `${explanation} · ` : ""}${clause}`;
    if (next.length <= MAX_REASON_LENGTH) explanation = next;
  }
  return explanation;
}

export function OpportunityCard({
  opportunity,
  urgency,
  joined,
  accepting,
  onAccept,
}: OpportunityCardProps) {
  const [open, setOpen] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const reasonsId = useId();
  const textId = useId();
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const urgent = opportunity.kind === "request" && urgency === "high";
  const justification = matchingJustification(opportunity);
  const explanationSource =
    opportunity.explanationSource ?? (opportunity.matchSource === "ai" ? undefined : "rules");
  return (
    <li
      className={`community-event opportunity-card${urgent ? " opportunity-card--urgent" : ""}`}
      aria-label={`Opportunity: ${opportunity.title}${urgent ? ". Urgent" : ""}`}
    >
      <Drawer
        label={opportunity.title}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__info">
            <div className="community-event__title">
              <h3 className="feature-card-title">{opportunity.title}</h3>
              <span className="community-event__type">
                {TASK_CATEGORY_LABEL[opportunity.category]}
              </span>
              {urgent && <StatusBadge label="Urgent" variant="danger" />}
            </div>
            <span className="inline-icon">
              <MapPin size={16} aria-hidden="true" />
              {opportunity.area} / {opportunity.distanceKm} km away
            </span>
            <span className="inline-icon">
              <CalendarDays size={16} aria-hidden="true" />
              {formatDate(opportunity.scheduledAt)},{" "}
              {formatTimeRange(opportunity.scheduledAt, opportunity.durationMinutes)}
            </span>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{opportunity.summary}</p>
          <span className="inline-icon">
            <Clock size={16} aria-hidden="true" />
            {opportunity.durationMinutes} min
          </span>
        </div>
      </Drawer>
      <div className="opportunity-card__matching">
        <button
          type="button"
          className="match-score opportunity-card__match-toggle"
          aria-label={`${opportunity.matchScore}% match. Why this matches you`}
          aria-expanded={showReasons}
          aria-controls={reasonsId}
          title="Your match percentage combines skills (50%), distance (30%) and saved availability (20%). It is a suitability score, not a probability. Click for your matching explanation."
          onClick={() => setShowReasons((current) => !current)}
        >
          <Sparkles size={14} aria-hidden="true" />
          {opportunity.matchScore}% match
          <Info size={15} aria-hidden="true" />
        </button>
        {opportunity.matchSource === "ai" && (
          <StatusBadge label="AI-assisted" variant="info" icon={Sparkles} />
        )}
        {showReasons && (
          <div
            id={reasonsId}
            className="opportunity-card__reasons"
            role="region"
            aria-label="Why this matches you"
          >
            <strong>Why this matches you</strong>
            <span className="opportunity-card__source">
              {explanationSource === "ai"
                ? "Claude explanation"
                : explanationSource === "rules"
                  ? opportunity.matchSource === "ai"
                    ? "Rule-based explanation (fallback)"
                    : "Personalized rules"
                  : "Explanation source not recorded"}
            </span>
            {justification ? (
              <div
                id={textId}
                className={`opportunity-card__reason-lines${explanationSource === "ai" && justification.length > 170 && !showFullExplanation ? " opportunity-card__reason-lines--preview" : ""}`}
              >
                {(explanationSource !== "rules" ? [justification] : justification.split(" · ")).map(
                  (point, index) => (
                    <p className="ui-flush" key={index}>
                      {point}
                    </p>
                  ),
                )}
              </div>
            ) : (
              <p className="ui-flush">
                Matching reasons aren't available for this opportunity yet.
              </p>
            )}
            {explanationSource === "ai" && justification.length > 170 && (
              <AppButton
                variant="ghost"
                aria-expanded={showFullExplanation}
                aria-controls={textId}
                onClick={() => setShowFullExplanation((current) => !current)}
              >
                {showFullExplanation ? "Show less" : "Show more"}
              </AppButton>
            )}
          </div>
        )}
      </div>
      <div className="community-event__footer">
        {joined ? (
          <StatusBadge
            label={opportunity.kind === "event" ? "You joined this" : "You accepted this"}
            variant="success"
          />
        ) : (
          <AppButton variant="primary" loading={accepting} onClick={() => onAccept(opportunity)}>
            {opportunity.kind === "event" ? "Join event" : "Accept & help"}
          </AppButton>
        )}
      </div>
    </li>
  );
}
