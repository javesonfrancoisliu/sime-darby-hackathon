import type { HelpRequest, RequestsResponse, User } from "@sdh/contracts";
import { describe, expect, it } from "vitest";
import { backdate, call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

const body = () => ({
  category: "groceries",
  title: "Weekly shopping",
  description: "Two bags",
  scheduledAt: new Date(Date.now() + 2 * 864e5).toISOString(),
  durationMinutes: 60,
  location: { lat: 3.0738, lng: 101.5183, area: "Precinct 1" },
});

const rename = (user: User, name: string) =>
  call("PATCH", "/api/me", { as: user.id, body: { name } });

describe("names on requests follow profile renames", () => {
  it("shows an elder's new name on an existing request to the elder and the volunteer", async () => {
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer((await createUser("coordinator")).id);
    const made = await call("POST", "/api/requests", { as: elder.id, body: body() });
    const id = (made.body as HelpRequest).id;
    await call("POST", `/api/requests/${id}/accept`, { as: volunteer.id });

    await rename(elder, "Puan Renamed");

    const own = await call("GET", `/api/requests/${id}`, { as: elder.id });
    expect((own.body as HelpRequest).elderName).toBe("Puan Renamed");
    const theirs = await call("GET", "/api/requests/mine", { as: volunteer.id });
    expect((theirs.body as RequestsResponse).requests[0]?.elderName).toBe("Puan Renamed");
  });

  it("shows a volunteer's new name to the elder, in the detail and in the list", async () => {
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer((await createUser("coordinator")).id);
    const made = await call("POST", "/api/requests", { as: elder.id, body: body() });
    const id = (made.body as HelpRequest).id;
    await call("POST", `/api/requests/${id}/accept`, { as: volunteer.id });

    await rename(volunteer, "Adam Renamed");

    const detail = await call("GET", `/api/requests/${id}`, { as: elder.id });
    expect((detail.body as HelpRequest).volunteerName).toBe("Adam Renamed");
    const list = await call("GET", "/api/requests/mine", { as: elder.id });
    expect((list.body as RequestsResponse).requests[0]?.volunteerName).toBe("Adam Renamed");
  });

  it("returns the current names from accept, complete and confirm too", async () => {
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer((await createUser("coordinator")).id);
    const made = await call("POST", "/api/requests", { as: elder.id, body: body() });
    const id = (made.body as HelpRequest).id;
    await rename(elder, "Elder Two");
    const accepted = await call("POST", `/api/requests/${id}/accept`, { as: volunteer.id });
    expect((accepted.body as HelpRequest).elderName).toBe("Elder Two");
    await backdate(id);
    await rename(volunteer, "Volunteer Two");
    const done = await call("POST", `/api/requests/${id}/complete`, {
      as: volunteer.id,
      body: { minutesSpent: 30 },
    });
    expect((done.body as HelpRequest).volunteerName).toBe("Volunteer Two");
    const confirmed = await call("POST", `/api/requests/${id}/confirm`, { as: elder.id });
    expect((confirmed.body as HelpRequest).elderName).toBe("Elder Two");
    expect((confirmed.body as HelpRequest).volunteerName).toBe("Volunteer Two");
  });
});
