import { render, screen, fireEvent } from "@testing-library/react";
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
              full_name: "Alex Rivera",
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

describe("Master Data Dashboard (Suite Reorganization)", () => {
  it("renders the page title correctly", async () => {
    render(<Dashboard />);

    // Wait for session check to complete and dashboard to load
    expect(await screen.findByText("Enterprise Connectivity Hub")).toBeInTheDocument();

    // Assert sidebar title
    const titleElement = screen.getByTestId("page-title");
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent("Precision MDM");
  });

  it("renders the ETL Upload section and file input under Master Data Registry", async () => {
    render(<Dashboard />);

    // Wait for session check to complete and dashboard to load
    expect(await screen.findByText("Enterprise Connectivity Hub")).toBeInTheDocument();

    // Switch to Master Data Registry tab
    const registryLink = screen.getAllByText("Master Data Registry")[0];
    fireEvent.click(registryLink);

    // Assert section heading
    expect(screen.getByText("ETL Pipeline Intake")).toBeInTheDocument();

    // Assert upload button
    expect(
      screen.getByRole("button", { name: /upload data/i }),
    ).toBeInTheDocument();
  });

  it("renders the data table with correct headers under Master Data Registry", async () => {
    render(<Dashboard />);

    // Wait for session check to complete
    expect(await screen.findByText("Enterprise Connectivity Hub")).toBeInTheDocument();

    // Switch to Master Data Registry tab
    const registryLink = screen.getAllByText("Master Data Registry")[0];
    fireEvent.click(registryLink);

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

  it("switches to the validation tab and renders pipeline metrics", async () => {
    render(<Dashboard />);

    // Wait for session check to complete
    expect(await screen.findByText("Enterprise Connectivity Hub")).toBeInTheDocument();

    // Click Data Validation menu item
    const validationMenu = screen.getAllByText("Data Validation")[0];
    fireEvent.click(validationMenu);

    // Verify ETL Pipeline Monitor header is shown
    expect(screen.getByTestId("pipelines-title")).toBeInTheDocument();
    expect(screen.getByText("Active Data Flows")).toBeInTheDocument();
    expect(screen.getByText("Live Data Flow Architecture")).toBeInTheDocument();
  });
});
