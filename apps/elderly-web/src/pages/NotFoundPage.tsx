import { useNavigate } from "react-router-dom";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";

// Shown for an address the app does not have, with a way back to Home.
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="apple-subpage">
      <h1 className="ui-page-title">Page not found</h1>
      <Banner message="We could not find that page." />
      <Button block onClick={() => navigate("/", { replace: true })}>
        Go to Home
      </Button>
    </div>
  );
}
