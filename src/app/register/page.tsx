"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [regStatus, setRegStatus] = useState<"idle" | "validating" | "sent">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !role || !password || !terms) return;

    setRegStatus("validating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
        }),
      });

      if (res.ok) {
        setRegStatus("sent");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Registration failed");
        setRegStatus("idle");
      }
    } catch {
      setErrorMsg("An error occurred. Please try again.");
      setRegStatus("idle");
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface overflow-x-hidden min-h-screen w-full flex items-center justify-center py-12 px-4 md:px-gutter precision-bg">
      <main className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-card-gap items-center z-10">
        {/* Left Column: Branding & Value Prop */}
        <section className="lg:col-span-5 flex flex-col justify-center space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-3xl">
                clinical_notes
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Master Data Management
            </h1>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-surface leading-tight">
            Empowering <span className="text-primary-container">Precision</span>{" "}
            Master Data Ingestion.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto lg:mx-0">
            Join the enterprise master data ecosystem designed for hospital
            administrators and clinical data analysts. Centralize patient
            registries and ensure total data governance.
          </p>

          {/* Decorative Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <article className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <div className="text-primary font-bold text-lg">99.9%</div>
              <div className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
                Data Accuracy
              </div>
            </article>
            <article className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <div className="text-primary font-bold text-lg">500+</div>
              <div className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
                Institutions
              </div>
            </article>
          </div>
        </section>

        {/* Right Column: Registration Card */}
        <section className="lg:col-span-7 flex justify-center lg:justify-end">
          <div className="glass-card w-full max-w-[520px] rounded-[24px] p-8 md:p-10 relative overflow-hidden">
            {/* Atmospheric background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <header className="mb-8">
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                  Create Account
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Access the enterprise data governance suite.
                </p>
              </header>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Full Name */}
                <fieldset className="space-y-2 border-none p-0 m-0 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <label
                    className="block font-label-md text-label-md text-on-surface-variant ml-1"
                    htmlFor="fullName"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      person
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline text-body-md"
                      id="fullName"
                      placeholder="Dr. Sarah Johnson"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </fieldset>

                {/* Org Email */}
                <fieldset className="space-y-2 border-none p-0 m-0 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <label
                    className="block font-label-md text-label-md text-on-surface-variant ml-1"
                    htmlFor="email"
                  >
                    Organization Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      mail
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline text-body-md"
                      id="email"
                      placeholder="s.johnson@healthcare.org"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </fieldset>

                {/* Job Role Dropdown */}
                <fieldset className="space-y-2 border-none p-0 m-0 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <label
                    className="block font-label-md text-label-md text-on-surface-variant ml-1"
                    htmlFor="role"
                  >
                    Job Role
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      work
                    </span>
                    <select
                      className="w-full pl-12 pr-10 py-3 bg-surface-container-low border border-outline-variant rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer text-body-md text-on-surface"
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select your role
                      </option>
                      <option value="administrator">
                        Hospital Administrator
                      </option>
                      <option value="data_analyst">Data Quality Analyst</option>
                      <option value="clinical_director">
                        Clinical Director
                      </option>
                      <option value="it_manager">IT Systems Manager</option>
                      <option value="registry_manager">
                        Patient Registry Manager
                      </option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </fieldset>

                {/* Password */}
                <fieldset className="space-y-2 border-none p-0 m-0 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <label
                    className="block font-label-md text-label-md text-on-surface-variant ml-1"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      lock
                    </span>
                    <input
                      className="w-full pl-12 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline text-body-md"
                      id="password"
                      placeholder="••••••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1 px-1">
                    Must be at least 12 characters with one special symbol.
                  </p>
                </fieldset>

                {/* Terms */}
                <div className="flex items-start gap-3 py-2">
                  <input
                    className="mt-1 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                    id="terms"
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    required
                  />
                  <label
                    className="font-body-md text-body-md text-on-surface-variant select-none cursor-pointer"
                    htmlFor="terms"
                  >
                    I agree to the{" "}
                    <a className="text-primary hover:underline" href="#">
                      Enterprise Terms of Service
                    </a>{" "}
                    and{" "}
                    <a className="text-primary hover:underline" href="#">
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>
                {errorMsg && (
                  <p className="text-error text-body-md text-center mt-4">
                    {errorMsg}
                  </p>
                )}

                {/* Primary Action */}
                <button
                  className={`w-full py-4 font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer text-white ${
                    regStatus === "sent"
                      ? "bg-emerald-600 shadow-emerald-600/20"
                      : "bg-primary hover:bg-primary-container active:scale-[0.98] shadow-primary/20"
                  }`}
                  type="submit"
                  disabled={regStatus !== "idle"}
                >
                  {regStatus === "idle" && (
                    <>
                      Create Account
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                  {regStatus === "validating" && (
                    <>
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      Validating...
                    </>
                  )}
                  {regStatus === "sent" && (
                    <>
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                      Request Sent
                    </>
                  )}
                </button>
              </form>

              <footer className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Already have a Master Data Management account?{" "}
                  <Link
                    className="text-primary font-semibold hover:underline"
                    href="/login"
                  >
                    Sign In
                  </Link>
                </p>
              </footer>
            </div>
          </div>
        </section>
      </main>

      {/* Background Bottom Banner Decoration */}
      <div className="fixed bottom-0 left-0 w-full p-gutter opacity-40 pointer-events-none hidden lg:block">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="w-32 h-1 bg-outline-variant/30 rounded-full" />
            <div className="w-16 h-1 bg-outline-variant/30 rounded-full" />
          </div>
          <div className="text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">
            Security Protocol: 256-bit AES Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
