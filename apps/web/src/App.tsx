import type { ReactElement, ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ChallengesPage } from "./app/community/ChallengesPage";
import { CommunityPage } from "./app/community/CommunityPage";
import { HomePage } from "./app/HomePage";
import { ProfilePage } from "./app/profile/ProfilePage";
import { SafetyPage } from "./app/safety/SafetyPage";
import { VolunteerPage } from "./app/volunteer/VolunteerPage";
import { AcceptedTasksProvider } from "./data/AcceptedTasksContext";
import { GamificationProvider } from "./data/useGamification";
import { ProfileProvider } from "./data/ProfileContext";
import { SessionProvider, useSession } from "./data/SessionContext";
import { AppShell, RoleProvider, useRole } from "./components/layout";
import { LoadingState } from "./components/ui";

/**
 * Feeds the signed-in demo user's role into RoleProvider (young when signed out).
 * Waits for the user to load so an elder never briefly gets the young screens.
 */
function SessionRoleProvider({ children }: { children: ReactNode }) {
  const { user, status } = useSession();
  if (status === "loading") {
    return (
      <main className="app-main">
        <LoadingState rows={2} label="Signing in" />
      </main>
    );
  }
  return (
    <RoleProvider role={user?.role === "elder" ? "elderly" : "young"}>{children}</RoleProvider>
  );
}

/** Restricts a route to the young role; others are redirected to Community. */
function YoungOnly({ children }: { children: ReactElement }) {
  const { role } = useRole();
  return role === "young" ? children : <Navigate to="/community" replace />;
}

export function App() {
  return (
    <SessionProvider>
      <SessionRoleProvider>
        <GamificationProvider>
          <AcceptedTasksProvider>
            <ProfileProvider>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  {/* Gamified Community Challenges — young role only (route-guarded, not
              just hidden). Direct navigation by other roles redirects to Community. */}
                  <Route
                    path="/community/challenges"
                    element={
                      <YoungOnly>
                        <ChallengesPage />
                      </YoungOnly>
                    }
                  />
                  {/* Young-role volunteering feature (Help a Neighbour). */}
                  <Route
                    path="/volunteer"
                    element={
                      <YoungOnly>
                        <VolunteerPage />
                      </YoungOnly>
                    }
                  />
                  {/* Placeholder — owned by the Health & Safety team (Module 1). */}
                  <Route path="/safety" element={<SafetyPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </AppShell>
            </ProfileProvider>
          </AcceptedTasksProvider>
        </GamificationProvider>
      </SessionRoleProvider>
    </SessionProvider>
  );
}
