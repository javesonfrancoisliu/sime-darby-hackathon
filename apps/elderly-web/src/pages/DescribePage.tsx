import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateRequest } from "../hooks/useRequests";
import { findCategoryOption, PLACEHOLDERS } from "../requests/categories";
import { buildCreateBody, TIME_SLOTS } from "../requests/schedule";
import { useResident } from "../session/useResident";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { Banner } from "../ui/Banner";
import { IconInfo } from "../ui/Icons";

export function DescribePage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { run, status, error } = useCreateRequest();
  const resident = useResident();
  const [description, setDescription] = useState("");
  const option = findCategoryOption(category);

  if (!option || !resident) {
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!option || !resident) return;
    const created = await run(
      buildCreateBody({
        category: option.id,
        description,
        day: "tomorrow",
        slot: TIME_SLOTS[0]!,
        durationMinutes: 60,
        resident,
        now: new Date(),
      }),
    );
    if (created) navigate("/request/confirmation", { state: { request: created } });
  }

  return (
    <div className="apple-subpage">
      <BackLink />
      <div className="apple-page-header">
        <h1 className="ui-page-title">{option.label}</h1>
        <p className="ui-page-subtitle app-page-lead" style={{ margin: "4px 0 20px" }}>
          Tell your neighbour volunteers what kind of help you need.
        </p>
      </div>

      {error ? (
        <div style={{ marginBottom: 16 }}>
          <Banner message={error.message} />
        </div>
      ) : null}

      <div className="apple-form-card">
        <form onSubmit={onSubmit} noValidate>
          <TextField
            label="Describe the help you need"
            value={description}
            onChange={setDescription}
            multiline
            placeholder={PLACEHOLDERS[option.id]}
          />

          <div className="apple-form-hint">
            <IconInfo size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Tip: Volunteers in Elmina are friendly neighbours. Mention any preferred time or
              specific needs!
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
