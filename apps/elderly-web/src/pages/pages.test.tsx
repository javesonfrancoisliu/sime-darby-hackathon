import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ApiRequestError, api } from "../api/client";
import type { HelpRequest } from "../api/client";

const pending: HelpRequest = {
  id: "1",
  category: "groceries",
  description: "Milk and bread",
  status: "pending",
};
const matched: HelpRequest = {
  id: "2",
  category: "transport",
  description: "Lift to clinic",
  status: "matched",
  volunteerName: "Aisha",
};

beforeEach(() => {
  installFakeApi();
  signInAs();
});

afterEach(() => vi.restoreAllMocks());

describe("Home + navigation (Req 4.1, 4.2)", () => {
  it("home shows both primary actions", async () => {
    await renderApp("/");
    expect(screen.getByRole("button", { name: "Request help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View my requests" })).toBeInTheDocument();
  });

  it("non-home screen shows a back control", async () => {
    await renderApp("/request");
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });
});

describe("Category selection (Req 5.1)", () => {
  it("renders exactly three categories and routes on selection", async () => {
    await renderApp("/request");
    const groceries = screen.getByRole("button", { name: "Groceries" });
    expect(groceries).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transport" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learning technology" })).toBeInTheDocument();
    await userEvent.click(groceries);
    expect(screen.getByLabelText("Describe the help you need")).toBeInTheDocument();
  });
});

describe("Describe + submit (Req 5.3, 5.4, 5.5, 5.6)", () => {
  it("blocks an empty description and does not call the API", async () => {
    const spy = vi.spyOn(api, "createHelpRequest");
    await renderApp("/request/groceries");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a description/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("submits a valid request and shows confirmation", async () => {
    vi.spyOn(api, "createHelpRequest").mockResolvedValue(pending);
    await renderApp("/request/groceries");
    await userEvent.type(screen.getByLabelText("Describe the help you need"), "Milk and bread");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(screen.getByText("Request sent")).toBeInTheDocument());
    expect(screen.getByText("Milk and bread")).toBeInTheDocument();
  });

  it("shows the API error message with retry (Req 5.6)", async () => {
    vi.spyOn(api, "createHelpRequest").mockRejectedValue(
      new ApiRequestError({ code: "INTERNAL", message: "Server exploded" }),
    );
    await renderApp("/request/groceries");
    await userEvent.type(screen.getByLabelText("Describe the help you need"), "Milk");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(screen.getByText("Server exploded")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("Requests list (Req 6)", () => {
  it("shows the empty state with a create action (Req 6.4)", async () => {
    vi.spyOn(api, "listHelpRequests").mockResolvedValue([]);
    await renderApp("/requests");
    await waitFor(() => expect(screen.getByText(/no requests yet/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Request help" })).toBeInTheDocument();
  });

  it("shows an error with retry (Req 6.5)", async () => {
    vi.spyOn(api, "listHelpRequests").mockRejectedValue(
      new ApiRequestError({ code: "INTERNAL", message: "List failed" }),
    );
    await renderApp("/requests");
    await waitFor(() => expect(screen.getByText("List failed")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders each request with category, description, and status (Req 6.2, 6.3)", async () => {
    vi.spyOn(api, "listHelpRequests").mockResolvedValue([pending, matched]);
    await renderApp("/requests");
    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
    expect(screen.getByText("Lift to clinic")).toBeInTheDocument();
    expect(screen.getByText("Waiting to be matched")).toBeInTheDocument();
    expect(screen.getByText("Matched")).toBeInTheDocument();
  });
});

describe("Request detail + volunteer (Req 7)", () => {
  it("shows waiting text while pending", async () => {
    vi.spyOn(api, "getHelpRequest").mockResolvedValue(pending);
    await renderApp("/requests/1");
    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
    expect(screen.getAllByText("Waiting to be matched").length).toBeGreaterThan(0);
  });

  it("shows the volunteer name when matched", async () => {
    vi.spyOn(api, "getHelpRequest").mockResolvedValue(matched);
    await renderApp("/requests/2");
    await waitFor(() => expect(screen.getByText("Aisha")).toBeInTheDocument());
  });
});

describe("Cancel flow (Req 8)", () => {
  it("hides cancel for non-pending requests", async () => {
    vi.spyOn(api, "getHelpRequest").mockResolvedValue(matched);
    await renderApp("/requests/2");
    await waitFor(() => expect(screen.getByText("Aisha")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  });

  it("requires confirmation then updates status to cancelled (Req 8.2, 8.3)", async () => {
    vi.spyOn(api, "getHelpRequest").mockResolvedValue(pending);
    const cancelSpy = vi
      .spyOn(api, "cancelHelpRequest")
      .mockResolvedValue({ ...pending, status: "cancelled" });
    await renderApp("/requests/1");
    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    expect(cancelSpy).not.toHaveBeenCalled(); // confirmation gates the call (Req 8.2)

    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(screen.getByText("Cancelled")).toBeInTheDocument());
  });

  it("retains prior status and shows a message on cancel error (Req 8.4)", async () => {
    vi.spyOn(api, "getHelpRequest").mockResolvedValue(pending);
    vi.spyOn(api, "cancelHelpRequest").mockRejectedValue(
      new ApiRequestError({ code: "CONFLICT", message: "Already matched" }),
    );
    await renderApp("/requests/1");
    await waitFor(() => expect(screen.getByText("Groceries")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel request" }));
    await waitFor(() => expect(screen.getByText("Already matched")).toBeInTheDocument());
    expect(screen.getAllByText("Waiting to be matched").length).toBeGreaterThan(0);
  });
});
