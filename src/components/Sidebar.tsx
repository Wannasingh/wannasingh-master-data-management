"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "../context/DashboardContext";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isMobileMenuOpen, setIsMobileMenuOpen, handleLogout } = useDashboard();

  const getMenuItemClass = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? "flex items-center gap-3 px-4 py-3 bg-primary-fixed text-on-primary-fixed rounded-full font-semibold transition-transform duration-200 active:scale-95 cursor-pointer"
      : "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200 cursor-pointer";
  };

  return (
    <>
      {/* Mobile Sidebar Navigation Drawer */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          type="button"
          className="absolute inset-0 w-full h-full bg-black/55 backdrop-blur-sm border-0 p-0 outline-none"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
        <aside 
          className={`relative w-[260px] h-screen bg-surface flex flex-col py-8 px-4 border-r border-outline-variant transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="mb-12 px-4 flex justify-between items-center">
            <div>
              <h1 className="text-headline-sm font-headline-sm text-primary">
                Precision MDM
              </h1>
              <p className="text-label-md font-label-md text-on-surface-variant">
                Global Master Index
              </p>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-on-surface-variant hover:bg-surface-container rounded-full p-1 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            <Link
              className={getMenuItemClass("/")}
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </Link>
            <Link
              className={getMenuItemClass("/registry")}
              href="/registry"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">account_tree</span>
              <span className="font-body-md text-body-md">Master Data Registry</span>
            </Link>
            <Link
              className={getMenuItemClass("/validation")}
              href="/validation"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">policy</span>
              <span className="font-body-md text-body-md">Data Validation</span>
            </Link>
            <Link
              className={getMenuItemClass("/integration")}
              href="/integration"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">hub</span>
              <span className="font-body-md text-body-md">Data Integration</span>
            </Link>
            <Link
              className={getMenuItemClass("/governance")}
              href="/governance"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">verified_user</span>
              <span className="font-body-md text-body-md">Governance</span>
            </Link>
            <Link
              className={getMenuItemClass("/settings")}
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md text-body-md">Settings</span>
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-surface-container-high rounded-full transition-all text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-error">logout</span>
              <span className="font-body-md text-body-md text-error font-semibold">
                Logout
              </span>
            </button>
          </nav>
        </aside>
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface flex flex-col py-8 px-4 border-r border-outline-variant z-50 hidden md:flex">
        <div className="mb-12 px-4">
          <h1
            className="text-headline-sm font-headline-sm text-primary"
            data-testid="page-title"
          >
            Precision MDM
          </h1>
          <p className="text-label-md font-label-md text-on-surface-variant">
            Global Master Index
          </p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link
            className={getMenuItemClass("/")}
            href="/"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </Link>
          <Link
            className={getMenuItemClass("/registry")}
            href="/registry"
          >
            <span className="material-symbols-outlined">account_tree</span>
            <span className="font-body-md text-body-md">Master Data Registry</span>
          </Link>
          <Link
            className={getMenuItemClass("/validation")}
            href="/validation"
          >
            <span className="material-symbols-outlined">policy</span>
            <span className="font-body-md text-body-md">Data Validation</span>
          </Link>
          <Link
            className={getMenuItemClass("/integration")}
            href="/integration"
          >
            <span className="material-symbols-outlined">hub</span>
            <span className="font-body-md text-body-md">Data Integration</span>
          </Link>
          <Link
            className={getMenuItemClass("/governance")}
            href="/governance"
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span className="font-body-md text-body-md">Governance</span>
          </Link>
          <Link
            className={getMenuItemClass("/settings")}
            href="/settings"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md text-body-md">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-surface-container-high rounded-full transition-all duration-200 cursor-pointer text-left"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-body-md text-body-md text-error font-semibold">
              Logout
            </span>
          </button>
        </nav>
        <div className="mt-auto px-4">
          <div className="bg-primary-container p-4 rounded-xl text-on-primary-container relative overflow-hidden group cursor-pointer">
            <div className="relative z-10">
              <p className="font-label-md text-label-md mb-1 opacity-90">
                Enterprise Pro
              </p>
              <p className="font-headline-sm text-headline-sm mb-3">
                Upgrade Plan
              </p>
              <button className="bg-white text-primary px-4 py-2 rounded-full text-label-md font-semibold hover:bg-primary-fixed transition-colors cursor-pointer">
                Learn More
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[80px]">
                auto_awesome
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
