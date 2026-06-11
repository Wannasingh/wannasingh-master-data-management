import { render, screen } from "@testing-library/react";
import DashboardLayout from "../app/(dashboard)/layout";
import DashboardOverviewPage from "../app/(dashboard)/page";
import RegistryPage from "../app/(dashboard)/registry/page";
import ValidationPage from "../app/(dashboard)/validation/page";

// Mock next/navigation
const mockPush = jest.fn();
let mockPathname = "/";
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      back: jest.fn(),
    };
  },
  usePathname() {
    return mockPathname;
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
  mockPathname = "/";
  mockPush.mockClear();
  // Mock localStorage for auth session
  Storage.prototype.getItem = jest.fn(() =>
    JSON.stringify({ access_token: "token123" }),
  );
  Storage.prototype.removeItem = jest.fn();
});

describe("Master Data Dashboard (Suite Reorganization)", () => {
  it("renders the page title correctly", async () => {
    mockPathname = "/";
    render(
      <DashboardLayout>
        <DashboardOverviewPage />
      </DashboardLayout>
    );

    // Wait for session check to complete and dashboard to load
    expect(await screen.findByText("Enterprise Connectivity Hub")).toBeInTheDocument();

    // Assert sidebar title
    const titleElement = screen.getByTestId("page-title");
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent("Precision MDM");
  });

  it("renders the ETL Upload section and file input under Master Data Registry", async () => {
    mockPathname = "/registry";
    render(
      <DashboardLayout>
        <RegistryPage />
      </DashboardLayout>
    );

    // Wait for session check to complete and dashboard to load
    expect(await screen.findByText("ETL Pipeline Intake")).toBeInTheDocument();

    // Assert upload button
    expect(
      screen.getByRole("button", { name: /upload data/i }),
    ).toBeInTheDocument();
  });

  it("renders the data table with correct headers under Master Data Registry", async () => {
    mockPathname = "/registry";
    render(
      <DashboardLayout>
        <RegistryPage />
      </DashboardLayout>
    );

    // Wait for session check to complete
    expect(await screen.findByText("ETL Pipeline Intake")).toBeInTheDocument();

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
    mockPathname = "/validation";
    render(
      <DashboardLayout>
        <ValidationPage />
      </DashboardLayout>
    );

    // Wait for session check to complete
    expect(await screen.findByTestId("pipelines-title")).toBeInTheDocument();

    // Verify ETL Pipeline Monitor header is shown
    expect(screen.getByText("Active Data Flows")).toBeInTheDocument();
    expect(screen.getByText("Live Data Flow Architecture")).toBeInTheDocument();
  });
});
