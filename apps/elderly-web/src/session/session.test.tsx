import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoUsersResponse } from "@sdh/contracts";
import { DEMO_USER_STORAGE_KEY } from "@sdh/api-client";
import { App } from "../App";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER, OTHER_ELDER } from "../test/fixtures";
import { renderRoute } from "../test/renderRoute";

const demoUsers = DemoUsersResponse.parse({
  users: [ELDER, OTHER_ELDER].map(({ id, name, role, area, verification }) => ({
    id,
    name,
    role,
    area,
    verification,
  })),
});

describe("Who is using this phone", () => {
  it("lists elders with their area and asks the API for elders only", async () => {
    const { calls } = installFakeApi({ "GET /api/demo/users": { body: demoUsers } });
    renderRoute(<App />, "/");

    expect(
      await screen.findByRole("heading", { name: "Who is using this phone?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Puan Salmah/ })).toHaveTextContent("Elmina Valley");
    expect(screen.getByRole("button", { name: /Encik Hamid/ })).toHaveTextContent("Elmina West");

    const listCall = calls.find((c) => c.path.startsWith("/api/demo/users"));
    expect(listCall?.path).toBe("/api/demo/users?role=elder");
    expect(listCall?.headers["x-demo-user"]).toBeUndefined();
  });

  it("stores the choice and then shows the home page for that person", async () => {
    const { calls } = installFakeApi({ "GET /api/demo/users": { body: demoUsers } });
    renderRoute(<App />, "/");
    await userEvent.click(await screen.findByRole("button", { name: /Puan Salmah/ }));

    expect(await screen.findByText("Puan Salmah")).toBeInTheDocument();
    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe(ELDER.id);
    const meCall = calls.find((c) => c.path === "/api/me");
    expect(meCall?.headers["x-demo-user"]).toBe(ELDER.id);
  });

  it("shows a friendly error with Try again when the list cannot load", async () => {
    let attempts = 0;
    installFakeApi({
      "GET /api/demo/users": () =>
        ++attempts === 1
          ? { status: 500, body: { error: { code: "INTERNAL", message: "stack trace here" } } }
          : { body: demoUsers },
    });
    renderRoute(<App />, "/");

    expect(await screen.findByText(/could not load the list of names/i)).toBeInTheDocument();
    expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /Puan Salmah/ })).toBeInTheDocument();
  });
});

describe("Me page", () => {
  it("shows the signed-in name and area, and switches person", async () => {
    installFakeApi({ "GET /api/demo/users": { body: demoUsers } });
    signInAs();
    renderRoute(<App />, "/me");

    expect(await screen.findByRole("heading", { name: "Puan Salmah" })).toBeInTheDocument();
    expect(screen.getAllByText("Elmina Valley").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Aminah/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Switch person/ }));
    expect(
      await screen.findByRole("heading", { name: "Who is using this phone?" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull();
  });

  it("goes back to the picker when the stored person no longer exists", async () => {
    installFakeApi({
      "GET /api/me": {
        status: 401,
        body: { error: { code: "UNAUTHENTICATED", message: "No such user" } },
      },
      "GET /api/demo/users": { body: demoUsers },
    });
    signInAs();
    renderRoute(<App />, "/");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who is using this phone?" })).toBeInTheDocument(),
    );
  });
});
