import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { HelpCategory } from "../api/client";
import { useCreateHelpRequest } from "../hooks/useHelpRequests";
import { CATEGORY_TEXT } from "../ui/status";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { Banner } from "../ui/Banner";
import { IconInfo } from "../ui/Icons";

const VALID: (HelpCategory | "technology_learning")[] = [
  "groceries",
  "transport",
  "technology_learning",
  "digital_literacy",
  "volunteer_support",
  "health_literacy",
];

const PLACEHOLDERS: Record<string, string> = {
  groceries: "For example: I'd like a volunteer to walk with me to the morning market or supermarket to buy vegetables and groceries.",
  transport: "For example: Need a lift to Klinik Kesihatan or community pharmacy at 10:30 am on Thursday.",
  digital_literacy: "For example: Guidance on setting up Touch 'n Go e-wallet, making WhatsApp video calls, or using AI assistance.",
  technology_learning: "For example: Guidance on setting up Touch 'n Go e-wallet, making WhatsApp video calls, or using AI assistance.",
  volunteer_support: "For example: Need help changing high ceiling lightbulbs, fixing a loose garden gate, or light home repairs.",
  health_literacy: "For example: Looking for a volunteer to explain my medication schedule or accompany me to the health screening.",
};

function isCategory(value: string | undefined): value is HelpCategory {
  return !!value && (VALID as string[]).includes(value);
}

/**
 * Describe Page — Apple Inset Form for Silver Generation.
 * Features:
 * - High-contrast text input with generous padding (§10)
 * - Size-specific typography (§15)
 * - Immediate inline validation feedback (§16)
 * - Enter a description and submit the request (Req 5.2, 5.3, 5.5, 5.6).
 */
export function DescribePage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { submit, status, error } = useCreateHelpRequest();
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string>();

  if (!isCategory(category)) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Banner
          message="That help category was not recognised."
          onRetry={() => navigate("/request")}
          retryLabel="Choose a category"
        />
      </div>
    );
  }

  // Normalize legacy category name if passed
  const activeCategory =
    category === ("technology_learning" as unknown) ? "digital_literacy" : category;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim() === "") {
      setValidationError("Please enter a description of the help you need.");
      return;
    }
    setValidationError(undefined);
    try {
      await submit({
        category: activeCategory as HelpCategory,
        description: description.trim(),
      });
      navigate("/request/confirmation", {
        state: { category: activeCategory, description: description.trim() },
      });
    } catch {
      // error surfaced via the hook's error state below
    }
  }

  return (
    <div className="apple-subpage">
      <BackLink />
      <div className="apple-page-header">
        <h1 className="ui-page-title">{CATEGORY_TEXT[category]}</h1>
        <p className="ui-page-subtitle app-page-lead" style={{ margin: "4px 0 20px" }}>
          Tell your neighbour volunteers what kind of help you need.
        </p>
      </div>

      {error ? (
        <div style={{ marginBottom: 16 }}>
          <Banner
            message={error.message}
            onRetry={() => void onSubmit(new Event("submit") as unknown as React.FormEvent)}
          />
        </div>
      ) : null}

      <div className="apple-form-card">
        <form onSubmit={onSubmit} noValidate>
          <TextField
            label="Describe the help you need"
            value={description}
            onChange={setDescription}
            error={validationError}
            multiline
            placeholder={PLACEHOLDERS[category] || "Please describe the assistance you need."}
          />

          <div className="apple-form-hint">
            <IconInfo size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Tip: Volunteers in Elmina are friendly neighbours. Mention any preferred time or specific needs!
            </span>
          </div>

          <div style={{ marginTop: 24 }}>
            <Button type="submit" block disabled={status === "loading"}>
              {status === "loading" ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
