import { Link, useNavigate } from "react-router-dom";
import { Check, HandHelping, House } from "lucide-react";

import type { SelfRole } from "@sdh/contracts";

import { Screen } from "../components/Screen";
import { PATHS, ROLE_LABEL } from "../lib/constants";
import { readPending, savePending } from "../lib/pending";

const ROLE_CARDS: { role: SelfRole; text: string; dark: boolean }[] = [
  {
    role: "elder",
    text: "I would like help from neighbours with errands, lifts and phones.",
    dark: false,
  },
  { role: "volunteer", text: "I want to volunteer and help neighbours nearby.", dark: true },
];

export function SignUpRole() {
  const navigate = useNavigate();
  const chosen = readPending().role;

  function choose(role: SelfRole) {
    savePending({ role });
    navigate(PATHS.signUpDetails);
  }

  return (
    <Screen
      title="Create an account"
      heading="Who is this account for?"
      backTo={PATHS.signIn}
      backLabel="Back to sign in"
      stepLabel="Step 1 of 3"
      step={1}
    >
      <p className="lead">You choose this once. It decides which app you see after you sign in.</p>
      <div className="cards" role="group" aria-label="Choose a role">
        {ROLE_CARDS.map(({ role, text, dark }) => {
          const selected = chosen === role;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={selected}
              className={`role-card${selected ? " role-card--on" : ""}`}
              onClick={() => choose(role)}
            >
              <span className={`role-card__icon${dark ? " role-card__icon--dark" : ""}`}>
                {role === "elder" ? (
                  <House aria-hidden="true" size={30} />
                ) : (
                  <HandHelping aria-hidden="true" size={30} />
                )}
              </span>
              <span className="role-card__text">
                <span className="role-card__name">{ROLE_LABEL[role]}</span>
                <span className="role-card__desc">{text}</span>
              </span>
              {selected && <Check aria-hidden="true" size={28} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
      <p className="small">
        Youth accounts are checked by a coordinator before you can see neighbours&apos; requests.
      </p>
      <div className="footer-line">
        <span>Already have an account?</span>
        <Link to={PATHS.signIn} className="link">
          Sign in
        </Link>
      </div>
    </Screen>
  );
}
