import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { SessionProvider, type SessionAuth } from "@sdh/api-client";
import { SessionGate } from "./session/SessionGate";
import { AppShell } from "./ui/AppShell";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { RequestFlowPage } from "./pages/RequestFlowPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { RequestsListPage } from "./pages/RequestsListPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { SafetyPage } from "./pages/SafetyPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { MePage } from "./pages/MePage";
import { MedicalIdPage } from "./pages/MedicalIdPage";
import { MyDetailsPage } from "./pages/MyDetailsPage";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AccessibilitySync } from "./context/AccessibilitySync";

// auth is set only when Cognito is configured; otherwise the local demo sign-in is used.
export function App({ auth }: { auth?: SessionAuth }) {
  return (
    <SessionProvider auth={auth}>
      <AccessibilityProvider>
        <AccessibilitySync />
        <SessionGate>
          <Routes>
            <Route
              element={
                <AppShell>
                  <Outlet />
                </AppShell>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="home" element={<HomePage />} />
              <Route path="safety" element={<SafetyPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="challenges" element={<ChallengesPage />} />
              <Route path="me" element={<MePage />} />
              <Route path="me/details" element={<MyDetailsPage />} />
              <Route path="me/medical-id" element={<MedicalIdPage />} />
              <Route path="request" element={<CategoryPage />} />
              <Route path="request/confirmation" element={<ConfirmationPage />} />
              <Route path="request/:category" element={<RequestFlowPage />} />
              <Route path="requests" element={<RequestsListPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SessionGate>
      </AccessibilityProvider>
    </SessionProvider>
  );
}
