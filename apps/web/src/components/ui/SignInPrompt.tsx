import { CloudOff, LogIn } from "lucide-react";

import { useSession } from "@sdh/api-client";

import { AppButton } from "./AppButton";
import { AppLinkButton } from "./AppLinkButton";
import { EmptyState } from "./EmptyState";
import { InfoCard } from "./InfoCard";

// Shown on screens that need a signed-in person when nobody is signed in.
// If the person is signed in but their profile could not be loaded, it offers a retry instead.
export function SignInPrompt({ what }: { what: string }) {
  const { status, refresh } = useSession();
  if (status === "error") {
    return (
      <InfoCard>
        <EmptyState
          icon={CloudOff}
          title="We could not load this"
          description="Check your connection and try again."
          action={<AppButton onClick={refresh}>Try again</AppButton>}
        />
      </InfoCard>
    );
  }
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
