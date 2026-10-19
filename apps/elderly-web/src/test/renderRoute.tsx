import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";

// Render a component tree inside a router at a given initial path.
export function renderRoute(ui: ReactElement, initialPath = "/") {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

// Render the whole app for a signed-in person and wait until their profile has loaded.
export async function renderApp(initialPath = "/") {
  const view = renderRoute(<App />, initialPath);
  await waitFor(() => expect(screen.queryByText(/Getting things ready/)).not.toBeInTheDocument());
  return view;
}
