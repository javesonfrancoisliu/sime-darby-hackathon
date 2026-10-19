import { Screen } from "./components/Screen";
import { APP_NAME } from "./lib/constants";
import { APP_PATHS } from "@sdh/auth";

// Shown when the build has no sign-in settings, such as a local demo.
export function Unconfigured() {
  return (
    <Screen title="Sign-in is not set up" heading={APP_NAME} centredHeading>
      <p className="lead lead--centre">Sign-in is not set up in this build.</p>
      <div className="stack">
        <a href={APP_PATHS.elder} className="btn btn--outline">
          Open the Elderly app
        </a>
        <a href={APP_PATHS.volunteer} className="btn btn--outline">
          Open the Youth app
        </a>
      </div>
    </Screen>
  );
}
