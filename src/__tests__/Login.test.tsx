import { render, screen, fireEvent, act } from "@testing-library/react";
import Login from "../app/login/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));
describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              access_token: "token123",
              refresh_token: "refresh123",
              user: { email: "test@example.com" },
            },
          }),
      }),
    ) as jest.Mock;
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders email and password inputs, submit button, and rebranded headers", () => {
    render(<Login />);

    // Branding checks
    const brandHeaders = screen.getAllByText(/Master Data Management/i);
    expect(brandHeaders.length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Sign in to access your enterprise dashboard/i),
    ).toBeInTheDocument();

    // Fields checks
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign In/i }),
    ).toBeInTheDocument();
  });

  it("toggles password input type on visibility button click", () => {
    render(<Login />);

    const passwordInput = screen.getByLabelText(/Password/i);
    const toggleButton = screen.getByRole("button", { name: /visibility/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    // Toggle to visible
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    // Toggle back to password
    fireEvent.click(screen.getByRole("button", { name: /visibility_off/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("triggers mock authentication sequence on form submission", async () => {
    render(<Login />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "dr.smith@mdm.ai" } });
    fireEvent.change(passwordInput, { target: { value: "password123!" } });

    // Submit form
    fireEvent.click(submitButton);

    // Should display loading state
    expect(screen.getByText(/Authenticating.../i)).toBeInTheDocument();

    // Wait for success state to render
    expect(await screen.findByText(/Success!/i)).toBeInTheDocument();

    // Fast-forward router push timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
