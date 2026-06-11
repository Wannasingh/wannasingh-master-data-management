"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Background blobs movement effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Divide by different speeds for subtle depth effect
      const x = (globalThis.innerWidth / 2 - e.clientX) / 30;
      const y = (globalThis.innerHeight / 2 - e.clientY) / 30;
      setMouseOffset({ x, y });
    };
    globalThis.addEventListener("mousemove", handleMouseMove);
    return () => {
      globalThis.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K) and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-on-surface flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto py-12 px-gutter">
      {/* Aesthetic Background Elements */}
      <div
        className="blur-blob top-[-100px] left-[-100px] opacity-60"
        style={{
          transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
          transition: "transform 0.1s ease-out",
        }}
      />
      <div
        className="blur-blob bottom-[-100px] right-[-100px] opacity-60"
        style={{
          transform: `translate(${-mouseOffset.x}px, ${-mouseOffset.y}px)`,
          transition: "transform 0.1s ease-out",
        }}
      />

      <main className="max-w-4xl w-full flex flex-col items-center text-center z-10">
        {/* Hero Section: 404 Illustration & Message */}
        <section className="flex flex-col items-center w-full">
          {/* Illustration Group */}
          <div className="relative mb-12 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
              <span className="text-[180px] sm:text-[240px] font-black tracking-tighter">
                404
              </span>
            </div>
            <div className="relative z-10 floating">
              <div className="bg-surface-container-lowest p-8 rounded-full shadow-sm inline-flex items-center justify-center border border-outline-variant">
                <div className="bg-primary-container/10 p-10 rounded-full">
                  <span
                    className="material-symbols-outlined text-primary text-[72px] sm:text-[96px]"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    database
                  </span>
                </div>
              </div>
              {/* Decorative Data Points */}
              <div className="absolute -top-4 -right-4 bg-white p-3 rounded-xl shadow-md border border-outline-variant animate-pulse">
                <span className="material-symbols-outlined text-error">
                  query_stats
                </span>
              </div>
              <div
                className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-md border border-outline-variant animate-pulse"
                style={{ animationDelay: "1s" }}
              >
                <span className="material-symbols-outlined text-secondary">
                  database_off
                </span>
              </div>
            </div>
          </div>

          {/* Message Group */}
          <div className="space-y-4 max-w-xl mx-auto px-4">
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-surface">
              Data Point <span className="gradient-text">Not Found</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              The record or directory page you are looking for seems to have
              been moved or archived. Our Master Data Management system could
              not locate this specific endpoint.
            </p>
          </div>

          {/* Actions Group */}
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
            <Link
              className="group relative px-8 py-4 bg-primary text-on-primary font-headline-sm text-headline-sm rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
              href="/"
            >
              <span className="material-symbols-outlined">dashboard</span>{" "}
              Return to Dashboard
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <button
              className="px-8 py-4 bg-surface-container-high text-on-surface-variant font-headline-sm text-headline-sm rounded-full transition-all hover:bg-surface-container-highest active:scale-95 flex items-center gap-3 cursor-pointer"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined">arrow_back</span>{" "}
              Go Back
            </button>
          </div>
        </section>

        {/* Support Grid Section */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-card-gap w-full text-left px-4">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant hover:border-primary/30 transition-colors group">
            <div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-sm border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">
                help
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-2 group-hover:text-primary transition-colors">
              Help Center
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Access our documentation to learn about Master Data
              Management&apos;s navigation and data architecture.
            </p>{" "}
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant hover:border-primary/30 transition-colors group">
            <div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-sm border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">
                support_agent
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-2 group-hover:text-primary transition-colors">
              Contact Support
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Experiencing a recurring issue? Our technical team is available
              24/7 for master data assistance.
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant hover:border-primary/30 transition-colors group">
            <div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-sm border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">
                bug_report
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-2 group-hover:text-primary transition-colors">
              Report Issue
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Help us improve the precision of our enterprise platform by
              reporting broken data links.
            </p>
          </div>
        </section>

        {/* Footer Branding */}
        <footer className="mt-20 mb-6 opacity-40">
          <div className="flex items-center gap-2 justify-center">
            <span className="material-symbols-outlined text-primary">
              database
            </span>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight">
              Master Data Management
            </span>
          </div>
        </footer>
      </main>

      {/* Interactive Search Overlay */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
          isSearchOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="absolute inset-0 w-full h-full bg-on-surface/40 backdrop-blur-sm border-0 p-0 outline-none cursor-default"
          onClick={() => setIsSearchOpen(false)}
          aria-label="Close search overlay"
        />
        <div
          className={`relative z-10 bg-surface p-4 w-full max-w-xl rounded-2xl shadow-xl transform transition-transform duration-300 mx-4 ${
            isSearchOpen ? "scale-100" : "scale-95"
          }`}
        >
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              ref={searchInputRef}
              className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 text-body-lg outline-none"
              placeholder="Search for master data, analytics, or records..."
              type="text"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
