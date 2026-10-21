import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { App } from "../App";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { MEDICAL, MEDICAL_ROUTE, NOT_FOUND } from "../test/fixtures";

beforeEach(() => signInAs());

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe("Medical ID edit screen", () => {
  it("saves a new Medical ID with PUT and returns to Profile", async () => {
    let saved: unknown = null;
    const { calls } = installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: () => (saved ? { body: saved } : NOT_FOUND),
      [`PUT ${MEDICAL_ROUTE}`]: (call) => {
        saved = { ...(call.body as object), updatedAt: MEDICAL.updatedAt };
        return { body: saved };
      },
    });
    // Two Profile entries: the sheet's own entry is replaced by the Medical ID page.
    render(
      <MemoryRouter initialEntries={["/me", "/me"]} initialIndex={1}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: /^My details/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Add your Medical ID/ }));
    expect(await screen.findByRole("heading", { name: "Add your Medical ID" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "O+" }));
    await userEvent.type(screen.getByLabelText(/Name of the person/), "Zainal");
    await userEvent.type(screen.getByLabelText(/related to you/), "Son");
    await userEvent.type(screen.getByLabelText(/phone number/), "012-345 6789");
    await userEvent.click(screen.getByRole("button", { name: "Save my Medical ID" }));

    expect(await screen.findByRole("button", { name: /^My details/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your Medical ID" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^My details/ }));
    expect(await screen.findByText("Zainal (Son)", { exact: false })).toBeInTheDocument();
    const put = calls.find((c) => c.method === "PUT" && c.path === MEDICAL_ROUTE);
    expect(put?.body).toEqual({
      bloodGroup: "O+",
      nextOfKinName: "Zainal",
      nextOfKinRelation: "Son",
      nextOfKinPhone: "012-345 6789",
    });
  });

  it("returns by going back so the submitted form is not left in the history", async () => {
    installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL },
      [`DELETE ${MEDICAL_ROUTE}`]: { status: 204 },
    });
    const steps: number[] = [];
    function Probe() {
      const location = useLocation();
      const type = useNavigationType();
      steps.push(type === "POP" ? -1 : type === "PUSH" ? 1 : 0);
      return <p data-testid="where">{`${location.pathname}|${type}`}</p>;
    }
    render(
      <MemoryRouter initialEntries={["/me", "/me/medical-id"]} initialIndex={1}>
        <App />
        <Probe />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/me|POP"));
    expect(steps.reduce((a, b) => a + b, 0)).toBeLessThan(1);
  });

  it("explains what is missing and sends nothing", async () => {
    const { calls } = installFakeApi({ [`GET ${MEDICAL_ROUTE}`]: NOT_FOUND });
    await renderApp("/me/medical-id");
    await userEvent.click(await screen.findByRole("button", { name: "Save my Medical ID" }));
    expect(screen.getByText(/choose your blood group/i)).toBeInTheDocument();
    expect(screen.getByText(/Malaysian phone number/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("moves focus to the first invalid field after a failed save", async () => {
    installFakeApi({ [`GET ${MEDICAL_ROUTE}`]: NOT_FOUND });
    await renderApp("/me/medical-id");
    await userEvent.click(await screen.findByRole("button", { name: "Save my Medical ID" }));
    expect(screen.getByRole("button", { name: "A+" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "O+" }));
    await userEvent.click(screen.getByRole("button", { name: "Save my Medical ID" }));
    expect(screen.getByLabelText(/Name of the person/)).toHaveFocus();
    await userEvent.type(screen.getByLabelText(/Name of the person/), "Zainal");
    await userEvent.type(screen.getByLabelText(/related to you/), "Son");
    await userEvent.click(screen.getByRole("button", { name: "Save my Medical ID" }));
    expect(screen.getByLabelText(/phone number/)).toHaveFocus();
  });

  it("removes the Medical ID only after a confirmation", async () => {
    let removed = false;
    const { calls } = installFakeApi({
      [`GET ${MEDICAL_ROUTE}`]: () => (removed ? NOT_FOUND : { body: MEDICAL }),
      [`DELETE ${MEDICAL_ROUTE}`]: () => {
        removed = true;
        return { status: 204 };
      },
    });
    await renderApp("/me/medical-id");
    expect(await screen.findByDisplayValue("Zainal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(await screen.findByRole("button", { name: /^My details/ })).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
  });

  it("keeps the old My details address working by landing on Profile", async () => {
    installFakeApi({ [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL } });
    render(
      <MemoryRouter initialEntries={["/me/details"]}>
        <App />
        <Where />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: /^My details/ })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/me");
    expect(screen.getByTestId("where")).not.toHaveTextContent("/me/details");
  });

  it("keeps it when the resident chooses Keep it", async () => {
    const { calls } = installFakeApi({ [`GET ${MEDICAL_ROUTE}`]: { body: MEDICAL } });
    await renderApp("/me/medical-id");
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });
});
