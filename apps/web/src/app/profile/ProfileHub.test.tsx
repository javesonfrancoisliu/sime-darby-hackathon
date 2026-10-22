import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { User } from "@sdh/contracts";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import { makePoints, makeReward, TOWNSHIP, VOLUNTEER } from "../../test/fixtures";
import { App } from "../../App";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const signedIn = (overrides: Record<string, unknown> = {}) => signedInRoutes(VOLUNTEER, overrides);

const row = (name: RegExp) => screen.findByRole("button", { name });
const gone = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

const REWARD_ROUTES = {
  "GET /api/me/points": { body: makePoints(120) },
  "GET /api/rewards": {
    body: {
      rewards: [
        makeReward({
          title: "Coffee voucher",
          status: "redeemed",
          redeemedAt: "2026-10-18T02:00:00Z",
        }),
        makeReward({
          id: "0a1b2c3d-9999-4a99-8a99-000000000009",
          title: "Tote bag",
          status: "redeemed",
          redeemedAt: "2026-10-17T02:00:00Z",
          usedAt: "2026-10-19T02:00:00Z",
        }),
      ],
    },
  },
};

describe("profile hub header", () => {
  it("shows the name, area, level bar and a visibly labelled Edit button", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");

    const header = await screen.findByLabelText("Your profile");
    expect(within(header).getByText(VOLUNTEER.name)).toBeInTheDocument();
    expect(within(header).getByText(VOLUNTEER.area)).toBeInTheDocument();
    expect(
      await within(header).findByRole("progressbar", { name: "Volunteer level progress" }),
    ).toBeInTheDocument();
    const edit = within(header).getByRole("button", { name: "Edit personal information" });
    expect(edit).toHaveTextContent("Edit");
  });

  it("edits the name through the existing dialog and shows it in the header", async () => {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const dialog = await screen.findByRole("dialog", { name: /Edit/ });
    const name = within(dialog).getByLabelText("Display name");
    await user.clear(name);
    await user.type(name, "Aisha R");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await gone();
    expect(within(screen.getByLabelText("Your profile")).getByText("Aisha R")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

describe("profile hub rows", () => {
  it("groups a large points balance and keeps one point singular", async () => {
    installFakeApi(
      signedIn({ ...REWARD_ROUTES, "GET /api/me/points": { body: makePoints(100000000133) } }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const menu = await screen.findByLabelText("Profile menu");
    await waitFor(() =>
      expect(within(menu).getByRole("button", { name: /^My rewards/ })).toHaveTextContent(
        "100,000,000,133 points · 1 voucher to use",
      ),
    );
    await userEvent.click(within(menu).getByRole("button", { name: /^My rewards/ }));
    const dialog = await screen.findByRole("dialog", { name: "My rewards" });
    expect(within(dialog).getByText(/You have/)).toHaveTextContent(
      "You have 100,000,000,133 points.",
    );
  });

  it("lists the five rows in order with live one-line summaries and no old drawers", async () => {
    const volunteer = User.parse({
      ...VOLUNTEER,
      skills: ["groceries", "transport"],
      languages: ["en"],
    });
    installFakeApi(signedIn({ ...REWARD_ROUTES, "GET /api/me": { body: volunteer } }));
    signInAs(volunteer.id);
    renderApp("/profile");

    const menu = await screen.findByLabelText("Profile menu");
    await waitFor(() =>
      expect(within(menu).getByRole("button", { name: /^My rewards/ })).toHaveTextContent(
        "120 points · 1 voucher to use",
      ),
    );
    const rows = within(menu).getAllByRole("button");
    expect(rows.map((r) => r.querySelector(".ui-hub-row__title")?.textContent)).toEqual([
      "My rewards",
      "My details",
      "Settings",
      "Help and safety",
      "Account",
    ]);
    expect(rows[1]).toHaveTextContent("2 skills · 1 language");
    expect(rows[2]).toHaveTextContent("Larger text off · Rankings off");
    expect(rows[3]).toHaveTextContent("Township security and 999");
    expect(rows[4]).toHaveTextContent(`Signed in as ${volunteer.name}`);
    for (const r of rows) expect(r.querySelector(".ui-hub-row__chevron")).not.toBeNull();
    expect(document.querySelector(".drawer")).toBeNull();
  });

  it("asks for volunteering preferences in the My details summary when none are set", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    expect(await row(/^My details/)).toHaveTextContent("Set your volunteering preferences");
  });
});

describe("my rewards sheet", () => {
  it("shows points, vouchers and the link to available rewards, then returns focus to the row", async () => {
    installFakeApi(signedIn(REWARD_ROUTES));
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    const myRewards = await row(/^My rewards/);
    await user.click(myRewards);
    const dialog = await screen.findByRole("dialog", { name: "My rewards" });
    expect(await within(dialog).findByText("Coffee voucher")).toBeInTheDocument();
    expect(within(dialog).getByText("Tote bag")).toBeInTheDocument();
    expect(within(dialog).getByText(/You have/)).toHaveTextContent("You have 120 points.");
    expect(
      within(dialog).getByRole("button", { name: "Use now: Coffee voucher" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "See available rewards" })).toHaveAttribute(
      "href",
      "/community/challenges?tab=rewards",
    );

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    await gone();
    // The sheet hands focus back after it unmounts, so wait for it rather than read it once.
    await waitFor(() => expect(myRewards).toHaveFocus());
  });

  it("gives each Use now button the name of its voucher", async () => {
    installFakeApi(
      signedIn({
        ...REWARD_ROUTES,
        "GET /api/rewards": {
          body: {
            rewards: [
              makeReward({
                title: "Coffee voucher",
                status: "redeemed",
                redeemedAt: "2026-10-18T02:00:00Z",
              }),
              makeReward({
                id: "0a1b2c3d-9999-4a99-8a99-000000000010",
                title: "Tote bag",
                status: "redeemed",
                redeemedAt: "2026-10-17T02:00:00Z",
              }),
            ],
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.click(await row(/^My rewards/));
    const dialog = await screen.findByRole("dialog", { name: "My rewards" });
    expect(
      await within(dialog).findByRole("button", { name: "Use now: Coffee voucher" }),
    ).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Use now: Tote bag" })).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Use now" })).not.toBeInTheDocument();
  });

  it("closes the voucher confirmation before the sheet beneath it", async () => {
    installFakeApi(signedIn(REWARD_ROUTES));
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await row(/^My rewards/));
    await user.click(await screen.findByRole("button", { name: "Use now: Coffee voucher" }));
    expect(
      await screen.findByRole("dialog", { name: "Use this voucher now?" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Use this voucher now?" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "My rewards" })).toBeInTheDocument();
  });

  it("says there are no vouchers yet", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.setup().click(await row(/^My rewards/));
    expect(await screen.findByText("No vouchers yet")).toBeInTheDocument();
  });
});

describe("my details drawer", () => {
  it("opens as a bottom drawer from the row with the preferences summary", async () => {
    const volunteer = User.parse({ ...VOLUNTEER, skills: ["groceries"] });
    installFakeApi(signedIn({ "GET /api/me": { body: volunteer } }));
    signInAs(volunteer.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await row(/^My details/));
    const dialog = await screen.findByRole("dialog", { name: "My details" });
    const prefs = within(dialog).getByLabelText("Volunteering preferences");
    expect(within(prefs).getByText("Groceries")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    await gone();
    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("closes the drawer, then opens the preferences editor as the only dialog", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    await user.click(await row(/^My details/));
    const drawer = await screen.findByRole("dialog", { name: "My details" });
    await user.click(within(drawer).getByRole("button", { name: "Edit preferences" }));

    const editor = await screen.findByRole("dialog", { name: "Edit volunteer preferences" });
    expect(within(editor).getByRole("group", { name: "Skills" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByRole("dialog", { name: "My details" })).not.toBeInTheDocument();

    await user.click(within(editor).getByRole("button", { name: "Cancel" }));
    const back = await screen.findByRole("dialog", { name: "My details" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await user.click(within(back).getByRole("button", { name: "Done" }));
    await gone();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("[inert]")).toBeNull();
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    await waitFor(() => expect(window.history.state?.sdhModal).toBeUndefined());
  });

  it("keeps /profile/details working by opening My details on Profile", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile/details");
    expect(await screen.findByRole("dialog", { name: "My details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("consumes the redirect state once so a reload or later Back cannot reopen My details", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    let seen: unknown = "unset";
    function Probe() {
      seen = useLocation().state;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/profile/details"]}>
        <Probe />
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("dialog", { name: "My details" })).toBeInTheDocument();
    await waitFor(() => expect(seen).toBeNull());
  });

  it("keeps the sheet's history entry when the redirect state is cleared", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    window.history.pushState(null, "", "/before");
    window.history.pushState(null, "", "/profile/details");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    const sheet = await screen.findByRole("dialog", { name: "My details" });
    // The sheet's marker is on the top entry and the redirect request is gone from it.
    expect(window.history.state?.sdhSheet).toEqual(expect.any(String));
    expect(window.history.state?.usr).toBeFalsy();
    await userEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    await gone();
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    expect(window.location.pathname).toBe("/profile");
    // One Back leaves Profile: no dead entry is left behind by the sheet.
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe("/before"));
  });

  it("returns focus to the My details row after a redirect-opened sheet closes", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile/details");
    const sheet = await screen.findByRole("dialog", { name: "My details" });
    await userEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    await gone();
    const detailsRow = await row(/^My details/);
    await waitFor(() => expect(detailsRow).toHaveFocus());
  });

  it("opens My details when the redirect arrives while Profile is already mounted", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    function Jump() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/profile/details")}>
          jump
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Jump />
        <App />
      </MemoryRouter>,
    );
    await row(/^My details/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "jump" }));
    expect(await screen.findByRole("dialog", { name: "My details" })).toBeInTheDocument();
  });

  it("keeps the redirect request while signed out", async () => {
    installFakeApi(signedIn());
    let seen: unknown = "unset";
    function Probe() {
      seen = useLocation().state;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/profile/details"]}>
        <Probe />
        <App />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Profile" });
    expect(seen).toEqual({ openSheet: "details" });
  });

  it("returns to My details after the preferences editor saves", async () => {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    await user.click(await row(/^My details/));
    const drawer = await screen.findByRole("dialog", { name: "My details" });
    await user.click(within(drawer).getByRole("button", { name: "Edit preferences" }));
    const editor = await screen.findByRole("dialog", { name: "Edit volunteer preferences" });
    const skills = within(editor).getByRole("group", { name: "Skills" });
    await user.click(within(skills).getByRole("button", { name: "Groceries" }));
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    const back = await screen.findByRole("dialog", { name: "My details" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await user.click(within(back).getByRole("button", { name: "Done" }));
    await gone();
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    await waitFor(() => expect(window.history.state?.sdhModal).toBeUndefined());
  });
});

describe("edit personal drawer", () => {
  async function openEdit() {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit personal information" }));
    const drawer = await screen.findByRole("dialog", { name: "Edit personal information" });
    return { user, drawer };
  }

  it("closes straight away on Escape when nothing was typed", async () => {
    const { user } = await openEdit();
    await user.keyboard("{Escape}");
    await gone();
  });

  it("asks before discarding typed text on Escape, and keeps the text on Keep editing", async () => {
    const { user, drawer } = await openEdit();
    const name = within(drawer).getByLabelText("Display name");
    await user.type(name, " Zed");
    await user.keyboard("{Escape}");

    const ask = await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(within(ask).getByRole("button", { name: "Keep editing" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Edit personal information" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue(`${VOLUNTEER.name} Zed`);
  });

  it("asks on a scrim tap and discards on Discard", async () => {
    const { user, drawer } = await openEdit();
    await user.type(within(drawer).getByLabelText("Display name"), "x");
    await user.click(screen.getByTestId("sheet-scrim"));

    const ask = await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(within(ask).getByRole("button", { name: "Discard" }));
    await gone();
    expect(screen.getByText(VOLUNTEER.name)).toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    await waitFor(() => expect(window.history.state?.sdhModal).toBeUndefined());
  });

  it("asks before discarding typed text on phone Back, and keeps the drawer on Keep editing", async () => {
    const { user, drawer } = await openEdit();
    await user.type(within(drawer).getByLabelText("Display name"), " Zed");
    window.history.back();

    const ask = await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(within(ask).getByRole("button", { name: "Keep editing" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Edit personal information" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue(`${VOLUNTEER.name} Zed`);

    window.history.back();
    const again = await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(within(again).getByRole("button", { name: "Discard" }));
    await gone();
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
    await waitFor(() => expect(window.history.state?.sdhModal).toBeUndefined());
  });

  it("saves from the drawer with the Saved toast and no discard warning", async () => {
    const { user, drawer } = await openEdit();
    const name = within(drawer).getByLabelText("Display name");
    await user.clear(name);
    await user.type(name, "Aisha R");
    await user.click(within(drawer).getByRole("button", { name: "Save" }));
    await gone();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("keeps the required-name validation", async () => {
    const { user, drawer } = await openEdit();
    await user.clear(within(drawer).getByLabelText("Display name"));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));
    expect(await within(drawer).findByText("Please enter a display name.")).toBeInTheDocument();
  });
});

describe("settings sheet", () => {
  it("offers the five choices in order", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.setup().click(await row(/^Settings/));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    const switches = await within(dialog).findAllByRole("switch");
    expect(
      switches.map(
        (s) => s.closest(".settings-row")?.querySelector(".settings-row-label")?.textContent,
      ),
    ).toEqual([
      "Larger text",
      "Event reminders",
      "Volunteering updates",
      "Show me in Rankings",
      "Share approximate area",
    ]);
  });

  it("updates the Settings row summary after Rankings is switched on", async () => {
    installFakeApi({
      ...signedIn(),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();

    const settings = await row(/^Settings/);
    expect(settings).toHaveTextContent("Rankings off");
    await user.click(settings);
    await user.click(await screen.findByRole("switch", { name: /Show me in Rankings/ }));
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /Show me in Rankings/ })).toBeChecked(),
    );
    await user.keyboard("{Escape}");
    await gone();
    expect(await row(/^Settings/)).toHaveTextContent("Rankings on");
  });
});

describe("help and safety sheet", () => {
  it("links the township security line and 999 and says who to call", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.setup().click(await row(/^Help and safety/));
    const dialog = await screen.findByRole("dialog", { name: "Help and safety" });
    expect(await within(dialog).findByRole("link", { name: /Township security/ })).toHaveAttribute(
      "href",
      `tel:${TOWNSHIP.securityLine.tel}`,
    );
    expect(within(dialog).getByRole("link", { name: /Emergency 999/ })).toHaveAttribute(
      "href",
      "tel:999",
    );
    expect(within(dialog).getByText(/Need help\?/)).toBeInTheDocument();
  });

  it("links to the live safety conditions page", async () => {
    installFakeApi(signedIn());
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.setup().click(await row(/^Help and safety/));
    const dialog = await screen.findByRole("dialog", { name: "Help and safety" });
    expect(within(dialog).getByRole("link", { name: "Live safety conditions" })).toHaveAttribute(
      "href",
      "/safety",
    );
  });
});

describe("account sheet", () => {
  it("keeps the local sign-in card in a demo build", async () => {
    installFakeApi({ ...signedIn(), "GET /api/demo/users": { body: { users: [] } } });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    await userEvent.setup().click(await row(/^Account/));
    const dialog = await screen.findByRole("dialog", { name: "Account" });
    expect(within(dialog).getByLabelText("Local sign-in")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Account settings" }),
    ).not.toBeInTheDocument();
  });

  it("signs out of a demo build and leaves the page unlocked with no sheet history behind", async () => {
    installFakeApi({ ...signedIn(), "GET /api/demo/users": { body: { users: [] } } });
    signInAs(VOLUNTEER.id);
    renderApp("/profile");
    const user = userEvent.setup();
    await user.click(await row(/^Account/));
    const dialog = await screen.findByRole("dialog", { name: "Account" });
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));
    await gone();
    expect(await screen.findByLabelText("Local sign-in")).toBeInTheDocument();
    expect(window.localStorage.getItem("tc.demoUserId")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("[inert]")).toBeNull();
    await waitFor(() => expect(window.history.state?.sdhSheet).toBeUndefined());
  });
});
