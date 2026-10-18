import { Route, Routes } from "react-router-dom";
import { SessionProvider } from "@sdh/api-client";
import { SessionGate } from "./session/SessionGate";
import { AppShell } from "./ui/AppShell";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { DescribePage } from "./pages/DescribePage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { RequestsListPage } from "./pages/RequestsListPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { SafetyPage } from "./pages/SafetyPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { MePage } from "./pages/MePage";
import { AccessibilityProvider } from "./context/AccessibilityContext";

/**
 * Routes:
 *  /           → elder home dashboard (with primary actions & pillars)
 *  /home       → elder home dashboard
 *  /safety     → health & safety hazards
 *  /community  → centralised neighbourhood info
 *  /me         → profile
 *  /request/*  → help request flow
 *  /requests/* → my requests
 */
export function App() {
  return (
    <SessionProvider>
    <AccessibilityProvider>
      <SessionGate>
      <Routes>
        <Route
          path="/*"
          element={
            <AppShell>
              <Routes>
                <Route path="/"                          element={<HomePage />} />
                <Route path="/home"                      element={<HomePage />} />
                <Route path="/safety"                    element={<SafetyPage />} />
                <Route path="/community"                 element={<CommunityPage />} />
                <Route path="/challenges"                element={<ChallengesPage />} />
                <Route path="/me"                        element={<MePage />} />
                <Route path="/request"                   element={<CategoryPage />} />
                <Route path="/request/confirmation"      element={<ConfirmationPage />} />
                <Route path="/request/:category"         element={<DescribePage />} />
                <Route path="/requests"                  element={<RequestsListPage />} />
                <Route path="/requests/:id"              element={<RequestDetailPage />} />
                {/* Fallback: redirect unknown paths to /home */}
                <Route path="*"                          element={<HomePage />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
      </SessionGate>
    </AccessibilityProvider>
    </SessionProvider>
  );
}
