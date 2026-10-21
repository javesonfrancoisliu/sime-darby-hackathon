import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MALAYSIAN_PHONE, PutMedicalIdBody, type BloodGroup } from "@sdh/contracts";
import { useMedicalId, useRemoveMedicalId, useSaveMedicalId } from "../hooks/useMedicalId";
import { BLOOD_GROUPS, bloodGroupText } from "../medical/bloodGroup";
import { useAnnounce } from "../ui/Announcer";
import { BackLink } from "../ui/BackLink";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { ChoiceButton } from "../ui/ChoiceButton";
import { Spinner } from "../ui/Spinner";
import { TextField } from "../ui/TextField";

interface FormState {
  bloodGroup: BloodGroup | null;
  name: string;
  relation: string;
  phone: string;
}

const EMPTY: FormState = { bloodGroup: null, name: "", relation: "", phone: "" };

type Errors = Partial<Record<"bloodGroup" | "name" | "relation" | "phone", string>>;

function validate(form: FormState): { body?: PutMedicalIdBody; errors: Errors } {
  const errors: Errors = {};
  if (!form.bloodGroup) errors.bloodGroup = "Please choose your blood group, or Not sure.";
  if (!form.name.trim()) errors.name = "Please type the name of the person to call.";
  if (!form.relation.trim()) errors.relation = "Please type how they are related to you.";
  if (!MALAYSIAN_PHONE.test(form.phone.trim())) {
    errors.phone = "Please type a Malaysian phone number, for example 012-345 6789.";
  }
  if (Object.keys(errors).length > 0) return { errors };
  const parsed = PutMedicalIdBody.safeParse({
    bloodGroup: form.bloodGroup,
    nextOfKinName: form.name,
    nextOfKinRelation: form.relation,
    nextOfKinPhone: form.phone,
  });
  if (!parsed.success) return { errors: { name: "Please check what you typed." } };
  return { body: parsed.data, errors };
}

// Add, change or remove the Medical ID. Large buttons and plain words throughout.
export function MedicalIdPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const announce = useAnnounce();
  const medical = useMedicalId();
  const save = useSaveMedicalId();
  const remove = useRemoveMedicalId();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const filled = useRef(false);
  const removeRef = useRef<HTMLDivElement>(null);
  const bloodRef = useRef<HTMLFieldSetElement>(null);

  const exists = medical.data !== undefined;

  // Fill the form once from what is already saved.
  useEffect(() => {
    if (!medical.data || filled.current) return;
    filled.current = true;
    setForm({
      bloodGroup: medical.data.bloodGroup,
      name: medical.data.nextOfKinName,
      relation: medical.data.nextOfKinRelation,
      phone: medical.data.nextOfKinPhone,
    });
  }, [medical.data]);

  useEffect(() => {
    if (confirmingRemove) removeRef.current?.focus();
  }, [confirmingRemove]);

  const notFound = medical.status === "error" && medical.error?.code === "NOT_FOUND";

  if (medical.status === "loading" && !medical.data) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Spinner label="Loading your Medical ID" />
      </div>
    );
  }

  if (medical.status === "error" && !notFound) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Banner
          message={medical.error?.message ?? "We could not load your Medical ID."}
          onRetry={medical.refetch}
        />
      </div>
    );
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Send keyboard and screen reader focus to the first field that needs fixing.
  function focusFirstInvalid(found: Errors) {
    if (found.bloodGroup) {
      bloodRef.current?.querySelector<HTMLElement>("button")?.focus();
      return;
    }
    const fields = ["name", "relation", "phone"] as const;
    const index = fields.findIndex((key) => found[key]);
    const inputs = bloodRef.current?.parentElement?.querySelectorAll<HTMLInputElement>("input");
    inputs?.[index]?.focus();
  }

  // Pop back to Profile so this form is not left in the history; a direct visit replaces it.
  function returnToDetails() {
    if (location.key === "default") navigate("/me", { replace: true });
    else navigate(-1);
  }

  async function onSave() {
    const { body, errors: found } = validate(form);
    setErrors(found);
    if (!body) {
      focusFirstInvalid(found);
      return;
    }
    const saved = await save.run(body);
    if (!saved) return;
    announce("Your Medical ID was saved.");
    returnToDetails();
  }

  async function onRemove() {
    if (!(await remove.run())) return;
    announce("Your Medical ID was removed.");
    returnToDetails();
  }

  return (
    <div className="apple-subpage">
      <BackLink />
      <div className="apple-detail-hero">
        <h1 className="ui-page-title mb-1">
          {exists ? "Change your Medical ID" : "Add your Medical ID"}
        </h1>
        <p className="ui-page-subtitle">
          This helps people who come to your aid. Only you can see it.
        </p>
      </div>

      <fieldset ref={bloodRef} className="medical-field">
        <legend className="ui-label">Blood group</legend>
        <div className="choice-grid">
          {BLOOD_GROUPS.map((group) => (
            <ChoiceButton
              key={group}
              selected={form.bloodGroup === group}
              onClick={() => set("bloodGroup", group)}
            >
              {bloodGroupText(group)}
            </ChoiceButton>
          ))}
        </div>
        {errors.bloodGroup ? (
          <p className="ui-error" role="alert">
            {errors.bloodGroup}
          </p>
        ) : null}
      </fieldset>

      <TextField
        label="Name of the person to call"
        value={form.name}
        onChange={(v) => set("name", v)}
        placeholder="For example, Zainal"
        maxLength={80}
        error={errors.name}
      />
      <TextField
        label="How are they related to you?"
        value={form.relation}
        onChange={(v) => set("relation", v)}
        placeholder="For example, Son"
        maxLength={40}
        error={errors.relation}
      />
      <TextField
        label="Their phone number"
        value={form.phone}
        onChange={(v) => set("phone", v)}
        placeholder="For example, 012-345 6789"
        maxLength={20}
        inputMode="tel"
        error={errors.phone}
      />

      {save.status === "error" ? (
        <Banner message={save.error?.message ?? "We could not save your Medical ID."} />
      ) : null}

      <Button block onClick={() => void onSave()} disabled={save.status === "loading"}>
        {save.status === "loading" ? "Saving…" : "Save my Medical ID"}
      </Button>

      {exists ? (
        <div className="mt-8">
          {remove.status === "error" ? (
            <Banner message={remove.error?.message ?? "We could not remove your Medical ID."} />
          ) : null}
          {confirmingRemove ? (
            <div ref={removeRef} tabIndex={-1} className="apple-confirm-card">
              <p className="apple-confirm-card__title">Remove your Medical ID?</p>
              <p className="apple-confirm-card__sub">
                Your blood group and the person to call will be deleted.
              </p>
              <div className="ui-stack stack-gap-3 mt-4">
                <Button
                  block
                  variant="danger"
                  onClick={() => void onRemove()}
                  disabled={remove.status === "loading"}
                >
                  {remove.status === "loading" ? "Removing…" : "Yes, remove it"}
                </Button>
                <Button block variant="secondary" onClick={() => setConfirmingRemove(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button block variant="danger" onClick={() => setConfirmingRemove(true)}>
              Remove
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
