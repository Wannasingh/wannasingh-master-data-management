import { render, screen, fireEvent, act } from "@testing-library/react";
import Register from "../app/register/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));
describe("Register Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user123", email: "test@example.com" },
          }),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders all registration inputs, role select, terms checkbox, and rebranded headings", () => {
    render(<Register />);

    // Rebranded logo / headings
    const headings = screen.getAllByText(/Master Data Management/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThan(0);
    // Field assertions
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Job Role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/I agree to the/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Account/i }),
    ).toBeInTheDocument();
  });

  it("toggles password type on visibility button click", () => {
    render(<Register />);

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

  it("handles dropdown role selection and terms checkbox toggles", () => {
    render(<Register />);

    const selectRole = screen.getByLabelText(/Job Role/i) as HTMLSelectElement;
    fireEvent.change(selectRole, { target: { value: "data_analyst" } });
    expect(selectRole.value).toBe("data_analyst");

    const termsCheckbox = screen.getByLabelText(
      /I agree to the/i,
    ) as HTMLInputElement;
    expect(termsCheckbox.checked).toBe(false);
    fireEvent.click(termsCheckbox);
    expect(termsCheckbox.checked).toBe(true);
  });
  it("triggers mock validation and sends request on form submission", async () => {
    render(<Register />);
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Organization Email/i);
    const roleSelect = screen.getByLabelText(/Job Role/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const termsCheckbox = screen.getByLabelText(/I agree to the/i);
    const submitBtn = screen.getByRole("button", { name: /Create Account/i });

    fireEvent.change(nameInput, { target: { value: "Dr. Sarah Chen" } });
    fireEvent.change(emailInput, { target: { value: "s.chen@mdm.ai" } });
    fireEvent.change(roleSelect, { target: { value: "administrator" } });
    fireEvent.change(passwordInput, {
      target: { value: "securepassword123!" },
    });
    fireEvent.click(termsCheckbox);

    // Submit form
    fireEvent.click(submitBtn);

    // Expect Validating state
    expect(screen.getByText(/Validating.../i)).toBeInTheDocument();

    // Wait for the async API request to resolve and render "Request Sent"
    expect(await screen.findByText(/Request Sent/i)).toBeInTheDocument();

    // Fast-forward router push redirection (1500ms)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
