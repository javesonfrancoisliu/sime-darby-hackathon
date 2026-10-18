import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateRequest } from "../hooks/useRequests";
import { findCategoryOption, PLACEHOLDERS } from "../requests/categories";
import { buildCreateBody, isSlotPast, type DayChoice, type TimeSlot } from "../requests/schedule";
import { useResident } from "../session/useResident";
import { Banner } from "../ui/Banner";
import { BackLink } from "../ui/BackLink";
import { ConfirmStep } from "./requestFlow/ConfirmStep";
import { DescribeStep } from "./requestFlow/DescribeStep";
import { LengthStep } from "./requestFlow/LengthStep";
import { WhenStep } from "./requestFlow/WhenStep";
import { EMPTY_CHOICES, FLOW_STEPS, type FlowChoices, type FlowStep } from "./requestFlow/types";

const STEP_HEADING: Record<Exclude<FlowStep, "describe">, string> = {
  when: "When?",
  length: "How long?",
  confirm: "Is this right?",
};

const STALE_TIME_MESSAGE = "That time has passed. Please choose another time.";

// Four short steps: note, day and time, length, then a plain summary to confirm.
export function RequestFlowPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const resident = useResident();
  const option = findCategoryOption(category);
  const { run, status, error } = useCreateRequest();
  const [step, setStep] = useState<FlowStep>("describe");
  const [choices, setChoices] = useState<FlowChoices>(EMPTY_CHOICES);
  const [timeMessage, setTimeMessage] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

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

  const index = FLOW_STEPS.indexOf(step);
  const previousStep = FLOW_STEPS[index - 1];
  const now = new Date();
  const sending = status === "loading";

  function pick<K extends keyof FlowChoices>(key: K, value: FlowChoices[K]) {
    setChoices((prev) => ({ ...prev, [key]: value }));
  }

  function pickDay(day: DayChoice) {
    setChoices((prev) => ({
      ...prev,
      day,
      // A time that is already past today cannot stay selected.
      slot: prev.slot && isSlotPast(day, prev.slot, new Date()) ? null : prev.slot,
    }));
  }

  function goTo(next: FlowStep) {
    setTimeMessage(undefined);
    setStep(next);
  }

  async function send() {
    const { day, slot, durationMinutes } = choices;
    if (!option || !resident || !day || !slot || durationMinutes === null) return;
    const sendTime = new Date();
    if (isSlotPast(day, slot, sendTime)) {
      setChoices((prev) => ({ ...prev, slot: null }));
      setTimeMessage(STALE_TIME_MESSAGE);
      setStep("when");
      return;
    }
    const created = await run(
      buildCreateBody({
        category: option.id,
        description: choices.description,
        day,
        slot,
        durationMinutes,
        resident,
        now: sendTime,
      }),
    );
    if (created) navigate("/request/confirmation", { state: { request: created } });
  }

  return (
    <div className="apple-subpage">
      <BackLink onBack={previousStep ? () => goTo(previousStep) : undefined} />
      <p className="step-count">
        Step {index + 1} of {FLOW_STEPS.length}
      </p>
      <h1 className="ui-page-title" ref={headingRef} tabIndex={-1}>
        {step === "describe" ? option.label : STEP_HEADING[step]}
      </h1>
      {timeMessage ? <Banner message={timeMessage} /> : null}

      {step === "describe" ? (
        <DescribeStep
          value={choices.description}
          placeholder={PLACEHOLDERS[option.id] ?? ""}
          onChange={(value) => pick("description", value)}
          onNext={() => goTo("when")}
        />
      ) : null}
      {step === "when" ? (
        <WhenStep
          day={choices.day}
          slot={choices.slot}
          now={now}
          onDay={pickDay}
          onSlot={(slot: TimeSlot) => pick("slot", slot)}
          onNext={() => goTo("length")}
        />
      ) : null}
      {step === "length" ? (
        <LengthStep
          minutes={choices.durationMinutes}
          onPick={(minutes) => pick("durationMinutes", minutes)}
          onNext={() => goTo("confirm")}
        />
      ) : null}
      {step === "confirm" && choices.day && choices.slot && choices.durationMinutes !== null ? (
        <ConfirmStep
          categoryLabel={option.label}
          description={choices.description}
          day={choices.day}
          slot={choices.slot}
          durationMinutes={choices.durationMinutes}
          area={resident.area}
          now={now}
          sending={sending}
          errorMessage={status === "error" ? error?.message : undefined}
          onSend={() => void send()}
        />
      ) : null}
    </div>
  );
}
