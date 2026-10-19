import { LogIn } from "lucide-react";

import { AppLinkButton } from "./AppLinkButton";
import { EmptyState } from "./EmptyState";
import { InfoCard } from "./InfoCard";

// Shown on screens that need a signed-in person when nobody is signed in.
export function SignInPrompt({ what }: { what: string }) {
  return (
    <InfoCard>
      <EmptyState
        icon={LogIn}
        title="Please sign in"
        description={`Sign in to see ${what}.`}
        action={<AppLinkButton to="/profile">Go to Profile</AppLinkButton>}
      />
    </InfoCard>
  );
}
