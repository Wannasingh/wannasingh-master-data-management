"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "success">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          localStorage.setItem("sb-session", JSON.stringify(data.session));
        }
        setAuthStatus("success");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Authentication failed");
        setAuthStatus("idle");
      }
    } catch {
      setErrorMsg("An error occurred. Please try again.");
      setAuthStatus("idle");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6 md:p-12 overflow-y-auto">
      <main className="w-full max-w-[1200px] min-h-[700px] md:h-[800px] bg-white rounded-[2rem] shadow-2xl shadow-primary/5 overflow-hidden flex flex-col md:flex-row border border-outline-variant/30 relative">
        {/* Left Section: Brand & Welcome */}
        <section className="hidden md:flex md:w-1/2 relative bg-primary-container p-container-padding flex-col justify-between overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-pattern opacity-30 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  health_and_safety
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-primary-container tracking-tight">
                Master Data Management
              </h1>
            </div>

            <div className="max-w-md">
              <h2 className="font-display-lg text-display-lg text-on-primary-container mb-6 leading-tight">
                Precision in every patient record.
              </h2>
              <p className="font-body-lg text-body-lg text-primary-fixed/90 mb-8">
                The ultimate Master Data Management suite for modern healthcare
                systems. Orchestrate identity, quality, and governance with
                enterprise-grade clinical intelligence.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-white">
                    verified
                  </span>
                  <div>
                    <p className="font-label-md text-label-md text-white/60 uppercase tracking-widest">
                      Active Governance
                    </p>
                    <p className="font-body-md text-body-md text-white">
                      99.9% Record Accuracy Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 md:mt-0">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                <Image
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  alt="Professional Doctor avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5fhUfMHBWWTIoaKU2LfAFo6l7TmOY5fSL84pyeBqKl0VaYagXOtp5MWR8HRvQzDD3RMWsD9U7CbpwtaKsVGJF4w5fn9SvXiyNCSMLXOcp9nz8Pi9k1VfB4igCW9RSn5ITGFyy2_mQBXbyS7wQxIheT_YFj1cOSoGERKSvuR1TKyv0QKqLYujeFuCaWZN4qafu2wSf6JiNO_sZthy2dOlmQTGg-aFFR3-vrSuxtCspXEUYow_whC9rmCZw0ZdQD3Q9kEChjT46OfY"
                  width={40}
                  height={40}
                  unoptimized
                />
                <Image
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  alt="Medical analyst avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkKT7p4ZPtcLDARkYRzFLg-iWOFielSYhK_i1FHQbDINOl-cet_3THAn0pu3SMRPAuM1LFu1Wg4wFkeaYX8ZsZBLrA5JeORol2UTTZgW_YFSgKbweoIStjOvH0Lfp09vEroGemxoojIL-FlSbPTCBWLoGt58BuHTGHBntZErXxheo-MvzxUc_1hbE4VOxcvQYWy6BDUgaw_noqOjMuCqoMERy9NDmDNXhbG85taQyWlzrkdjNj1bUMpJ8X_r8sPUvK5CJKAR8Dax4"
                  width={40}
                  height={40}
                  unoptimized
                />
                <Image
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  alt="Healthcare meeting avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEiIKYrLAG6dKGT2vrx6ZZThcbdqUzcnaGDwe3ZibFONLiwEQkLnUb7j0qjOnpxSOcSjCws1FNe7dDxmzP-V9R5NnZbvucpd15qjj16ip8DFczF9SSQPp_ph1DyAduE9kaLkNcE9vdZimB78Pet9uw2DZrmDAa8lLeo_pDqI2xAbVuA0wP9854dnZNBJkrFeUgMWRx_L7HwZmEN0v-ze7bej9NuSQwdgQgFsqbizJEcKNlI36u7h7I9Vz-IZuyZf8TCGni6Qc9YaQ"
                  width={40}
                  height={40}
                  unoptimized
                />
              </div>
              <p className="font-label-md text-label-md text-primary-fixed/80 max-w-[200px]">
                Trusted by 2,400+ leading hospital networks worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Right Section: Login Form */}
        <section className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-gutter sm:p-12 lg:p-16">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  health_and_safety
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Master Data Management
              </h1>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                Welcome Back
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Sign in to access your enterprise dashboard.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <fieldset className="space-y-6 border-none p-0 m-0">
                <legend className="sr-only">Login Credentials</legend>

                {/* Email Address */}
                <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant px-1"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      mail
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline"
                      id="email"
                      name="email"
                      placeholder="dr.smith@mdm.ai"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
                  <div className="flex justify-between items-center px-1">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <a
                      className="font-label-md text-label-md text-primary hover:underline transition-all"
                      href="#"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      lock
                    </span>
                    <input
                      className="w-full pl-12 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3 px-1">
                  <input
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label
                    className="font-body-md text-body-md text-on-surface-variant select-none cursor-pointer"
                    htmlFor="remember"
                  >
                    Remember this device
                  </label>
                </div>
                {errorMsg && (
                  <p className="text-error text-body-md text-center mt-4">
                    {errorMsg}
                  </p>
                )}
              </fieldset>

              <button
                className={`w-full py-4 rounded-xl font-headline-sm text-headline-sm transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer text-white shadow-lg ${
                  authStatus === "success"
                    ? "bg-green-600 shadow-green-600/20"
                    : "bg-primary hover:bg-primary-container active:scale-[0.98] shadow-primary/20"
                }`}
                type="submit"
                disabled={authStatus !== "idle"}
              >
                {authStatus === "idle" && (
                  <>
                    Sign In
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
                {authStatus === "loading" && (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Authenticating...
                  </>
                )}
                {authStatus === "success" && (
                  <>
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                    Success!
                  </>
                )}
              </button>
            </form>

            {/* Enterprise Access options */}
            <div className="mt-12">
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-outline-variant" />
                <span className="flex-shrink mx-4 font-label-md text-label-md text-outline uppercase tracking-widest">
                  Enterprise Access
                </span>
                <div className="flex-grow border-t border-outline-variant" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button className="flex items-center justify-center gap-2 p-3 border border-outline-variant rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                  <Image
                    alt="Google SSO Logo"
                    className="w-5 h-5 grayscale opacity-70"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZPQGacZMCE0aTOuGOSx5XHUGluNjDsP6gCx9uzOzdjl7wubYmHRevD625o5M_nbrMMtb8LDq7aj93Chqj4YHvfOn4yputgKV1BoMmhyVywyB0NV2QvcAd0qwQrKQyuXb9reg9LseaE_h7Wpi1zsuparP-9Bylhcn9QSljIevvfYaO0yABl8OeISwDGarhwKN9AhZ6Vx01n_baV65Jh12fJRPQpKI91YuRMezEFHRRDsRoy4vWOnjylt0cx4OuGaH-_ad9o3s2G8w"
                    width={20}
                    height={20}
                    unoptimized
                  />
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    SSO
                  </span>
                </button>
                <button className="flex items-center justify-center gap-2 p-3 border border-outline-variant rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-outline text-[20px]">
                    smart_alarm
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    ID Card
                  </span>
                </button>
              </div>
            </div>

            <p className="mt-12 text-center font-body-md text-body-md text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                className="text-primary font-semibold hover:underline"
                href="/register"
              >
                Register
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
