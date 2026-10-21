import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useSession } from "@sdh/api-client";

import { EditPreferencesModal, PreferencesCard } from "../../components/profile";
import { AppLinkButton, PageHeader, SignInPrompt, useToast } from "../../components/ui";

// My details: the volunteering preferences used for matching, with the existing editor.
export function ProfileDetailsPage() {
  const { user } = useSession();
  const [editPrefs, setEditPrefs] = useState(false);
  const { notify, toast } = useToast();

  return (
    <>
      <AppLinkButton to="/profile" variant="ghost" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Profile
      </AppLinkButton>
      <PageHeader title="My details" subtitle="What you can help with, and when." />

      {user ? (
        <section className="ui-section">
          <PreferencesCard onEdit={() => setEditPrefs(true)} />
        </section>
      ) : (
        <SignInPrompt what="your details" />
      )}

      <EditPreferencesModal
        key={editPrefs ? "prefs-open" : "prefs-closed"}
        open={editPrefs}
        onClose={() => setEditPrefs(false)}
        onSaved={() => notify("Saved")}
      />
      {toast}
    </>
  );
}
