import { Route, Routes } from "react-router-dom";

import { SessionProvider, type SessionAuth } from "@sdh/api-client";

import { ChallengesPage } from "./app/community/ChallengesPage";
import { CommunityPage } from "./app/community/CommunityPage";
import { HomePage } from "./app/HomePage";
import { ProfilePage } from "./app/profile/ProfilePage";
import { SafetyPage } from "./app/safety/SafetyPage";
import { VolunteerPage } from "./app/volunteer/VolunteerPage";
import {
  AppShell,
  SessionGate,
  SessionRoleProvider,
  UserScope,
  YoungOnly,
} from "./components/layout";
import { AcceptedTasksProvider } from "./data/AcceptedTasksContext";
import { LargeTextProvider } from "./data/LargeTextContext";
import { ProfileProvider } from "./data/ProfileContext";

// auth is set only when Cognito is configured; otherwise the local sign-in picker is used.
export function App({ auth }: { auth?: SessionAuth }) {
  return (
    <SessionProvider auth={auth}>
      <SessionRoleProvider>
        <UserScope>
          <AcceptedTasksProvider>
            <ProfileProvider>
              <LargeTextProvider>
                <AppShell>
                  <SessionGate>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/community" element={<CommunityPage />} />
                      <Route
                        path="/community/challenges"
                        element={
                          <YoungOnly>
                            <ChallengesPage />
                          </YoungOnly>
                        }
                      />
                      <Route
                        path="/volunteer"
                        element={
                          <YoungOnly>
                            <VolunteerPage />
                          </YoungOnly>
                        }
                      />
                      <Route path="/safety" element={<SafetyPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="*" element={<HomePage />} />
                    </Routes>
                  </SessionGate>
                </AppShell>
              </LargeTextProvider>
            </ProfileProvider>
          </AcceptedTasksProvider>
        </UserScope>
      </SessionRoleProvider>
    </SessionProvider>
  );
}
