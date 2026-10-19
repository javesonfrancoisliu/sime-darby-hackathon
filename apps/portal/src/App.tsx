import { Navigate, Route, Routes } from "react-router-dom";

import { FlowProvider } from "./lib/flow";
import { PATHS } from "./lib/constants";
import { Account } from "./screens/Account";
import { ChangeEmail } from "./screens/ChangeEmail";
import { ChangeEmailVerify } from "./screens/ChangeEmailVerify";
import { ChangeName } from "./screens/ChangeName";
import { ChangePassword } from "./screens/ChangePassword";
import { Finish } from "./screens/Finish";
import { Forgot } from "./screens/Forgot";
import { Reset } from "./screens/Reset";
import { SignIn } from "./screens/SignIn";
import { SignUpDetails } from "./screens/SignUpDetails";
import { SignUpRole } from "./screens/SignUpRole";
import { SignUpVerify } from "./screens/SignUpVerify";

export function App() {
  return (
    <FlowProvider>
      <Routes>
        <Route path={PATHS.signIn} element={<SignIn />} />
        <Route path={PATHS.signUp} element={<SignUpRole />} />
        <Route path={PATHS.signUpDetails} element={<SignUpDetails />} />
        <Route path={PATHS.signUpVerify} element={<SignUpVerify />} />
        <Route path={PATHS.finish} element={<Finish />} />
        <Route path={PATHS.forgot} element={<Forgot />} />
        <Route path={PATHS.reset} element={<Reset />} />
        <Route path={PATHS.account} element={<Account />} />
        <Route path={PATHS.accountName} element={<ChangeName />} />
        <Route path={PATHS.accountEmail} element={<ChangeEmail />} />
        <Route path={PATHS.accountEmailVerify} element={<ChangeEmailVerify />} />
        <Route path={PATHS.accountPassword} element={<ChangePassword />} />
        <Route path="*" element={<Navigate to={PATHS.signIn} replace />} />
      </Routes>
    </FlowProvider>
  );
}
