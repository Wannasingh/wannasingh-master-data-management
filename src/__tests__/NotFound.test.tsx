import { render, screen, fireEvent } from "@testing-library/react";
import NotFound from "../app/not-found";

const mockBack = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      back: mockBack,
    };
  },
}));

describe("NotFound Custom Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the 404 header and rebranded text", () => {
    render(<NotFound />);

    // Assert rebranded title and headings
    expect(screen.getByText(/Data Point/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Found/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Master Data Management/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Our Master Data Management system could not locate this specific endpoint/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders return dashboard link and go back button", () => {
    render(<NotFound />);

    const dashboardLink = screen.getByRole("link", {
      name: /Return to Dashboard/i,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/");

    const backButton = screen.getByRole("button", { name: /Go Back/i });
    expect(backButton).toBeInTheDocument();
  });

  it("calls router.back when clicking Go Back button", () => {
    render(<NotFound />);

    const backButton = screen.getByRole("button", { name: /Go Back/i });
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
