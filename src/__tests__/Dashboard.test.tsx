import { render, screen } from "@testing-library/react";
import Dashboard from "../app/page";

// Mock next/navigation useRouter
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      back: jest.fn(),
    };
  },
}));

// Mock fetch for the API calls in useEffect
global.fetch = jest.fn((url) => {
  if (typeof url === "string" && url.includes("/api/auth/me")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          user: {
            email: "test@example.com",
            user_metadata: {
              full_name: "Dr. Sarah Chen",
              role: "administrator",
            },
          },
        }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });
}) as jest.Mock;

beforeEach(() => {
  // Mock localStorage for auth session
  Storage.prototype.getItem = jest.fn(() =>
    JSON.stringify({ access_token: "token123" }),
  );
  Storage.prototype.removeItem = jest.fn();
});

describe("Master Data Dashboard (Stitch Redesign)", () => {
  it("renders the page title correctly", async () => {
    render(<Dashboard />);

    // Wait for the async fetch state update to complete
    expect(await screen.findByText(/No records found/i)).toBeInTheDocument();

    // Assert page title
    const titleElement = screen.getByTestId("page-title");
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent("Master Data Management");
  });

  it("renders the ETL Upload section and file input", async () => {
    render(<Dashboard />);

    // Wait for the async fetch state update to complete
    expect(await screen.findByText(/No records found/i)).toBeInTheDocument();

    // Assert section heading
    expect(screen.getByText("ETL Pipeline Intake")).toBeInTheDocument();

    // Assert upload button
    expect(
      screen.getByRole("button", { name: /upload data/i }),
    ).toBeInTheDocument();
  });

  it("renders the data table with correct headers", async () => {
    render(<Dashboard />);

    // Wait for the async fetch state update to complete
    expect(await screen.findByText(/No records found/i)).toBeInTheDocument();

    // Assert headers
    expect(
      screen.getByRole("columnheader", { name: /id/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /value/i }),
    ).toBeInTheDocument();
  });
});
