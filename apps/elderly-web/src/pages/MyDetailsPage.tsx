import { useNavigate } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { useMedicalId } from "../hooks/useMedicalId";
import { bloodGroupText } from "../medical/bloodGroup";
import { useResident } from "../session/useResident";
import { BackLink } from "../ui/BackLink";
import { Banner } from "../ui/Banner";
import { useCallConfirm } from "../ui/CallConfirm";
import { IconChevronRight, IconHeartPulse, IconPencil, IconPhone, IconPlus } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

// My details: the Medical ID the resident keeps for emergencies, and their township sector.
export function MyDetailsPage() {
  const navigate = useNavigate();
  const { speak } = useAccessibility();
  const { requestCall } = useCallConfirm();
  const resident = useResident();
  const medical = useMedicalId();
  const area = resident?.area ?? "";

  function handleRead() {
    speak(`My details. Township sector ${area}.`);
  }

  return (
    <div className="apple-subpage apple-profile-page">
      <BackLink onBack={() => navigate("/me")} onReadAloud={handleRead} />
      <div className="apple-detail-hero">
        <h1 className="ui-page-title mb-1">My details</h1>
      </div>

      <div className="apple-profile-section">
        <span className="apple-profile-section-title">Emergency &amp; Medical ID</span>
        <div className="apple-inset-group">
          {medical.status === "loading" && !medical.data ? (
            <div className="apple-inset-row">
              <Spinner label="Loading your Medical ID" />
            </div>
          ) : null}

          {medical.status === "error" && medical.error?.code !== "NOT_FOUND" ? (
            <Banner
              message={medical.error?.message ?? "We could not load your Medical ID."}
              onRetry={medical.refetch}
            />
          ) : null}

          {medical.status === "error" && medical.error?.code === "NOT_FOUND" ? (
            <div className="apple-inset-row medical-empty">
              <p className="apple-inset-value m-0">
                Your Medical ID is empty. Add your blood group and a person to call in an emergency.
              </p>
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={() => navigate("/me/medical-id")}
              >
                <IconPlus className="icon-gap" size={18} strokeWidth={2.2} aria-hidden="true" />
                <span>Add your Medical ID</span>
              </button>
            </div>
          ) : null}

          {medical.data ? (
            <>
              <div className="apple-inset-row">
                <div className="medical-row__label">
                  <IconHeartPulse className="text-brand" size={18} strokeWidth={1.8} />
                  <span className="app-detail-label m-0">Blood Group</span>
                </div>
                <span className="apple-inset-value text-strong">
                  {bloodGroupText(medical.data.bloodGroup)}
                </span>
              </div>

              <div className="apple-inset-row">
                <div className="medical-row__label">
                  <IconPhone className="text-brand" size={18} strokeWidth={1.8} />
                  <span className="app-detail-label m-0">Emergency contact</span>
                </div>
                <span className="apple-inset-value">
                  {medical.data.nextOfKinName} ({medical.data.nextOfKinRelation}) ·{" "}
                  <button
                    type="button"
                    className="link-button text-nowrap"
                    onClick={() =>
                      requestCall({
                        tel: medical.data!.nextOfKinPhone.replace(/[^\d+]/g, ""),
                        display: medical.data!.nextOfKinPhone,
                        label: `${medical.data!.nextOfKinName} (${medical.data!.nextOfKinRelation})`,
                      })
                    }
                  >
                    {medical.data.nextOfKinPhone}
                  </button>
                </span>
              </div>

              <button
                type="button"
                className="apple-inset-btn-row"
                onClick={() => navigate("/me/medical-id")}
              >
                <div className="apple-inset-btn-row__left">
                  <span className="apple-inset-btn-row__icon text-brand" aria-hidden="true">
                    <IconPencil size={18} strokeWidth={2} />
                  </span>
                  <span className="apple-inset-btn-row__title">Change your Medical ID</span>
                </div>
                <span className="apple-card-button__arrow" aria-hidden="true">
                  <IconChevronRight size={18} strokeWidth={2} />
                </span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="apple-profile-section mb-8">
        <span className="apple-profile-section-title">Township Community</span>
        <div className="apple-inset-group">
          <div className="apple-inset-row">
            <span className="app-detail-label">Township Sector</span>
            <span className="apple-inset-value">{area}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
