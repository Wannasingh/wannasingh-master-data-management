"use client";

import React from "react";
import Image from "next/image";
import { useDashboard } from "../context/DashboardContext";

export const Header: React.FC = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen, userName, userRole } = useDashboard();

  return (
    <header className="h-20 fixed top-0 right-0 left-0 md:left-[260px] z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center px-gutter border-b border-outline-variant">
      <div className="flex items-center gap-4 md:gap-8">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="md:hidden hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          Data Management Console
        </h2>
        <div className="relative group hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-full py-2 pl-10 pr-4 w-80 text-body-md transition-all outline-none"
            placeholder="Search master data records..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors relative cursor-pointer" aria-label="Mail inbox">
          <span className="material-symbols-outlined">mail</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors cursor-pointer" aria-label="Notifications">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface font-semibold">
              {userName}
            </p>
            <p className="font-label-md text-[10px] text-on-surface-variant">
              {userRole}
            </p>
          </div>
          <Image
            alt="Administrator Profile"
            className="w-10 h-10 rounded-full object-cover border-2 border-white custom-shadow"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGd2S6Yr3DT9OmZ3OZLPjSDXqQ1E1faNt_D-cSBNXN3YCIPHWqPcDFyI6IdxiAtquseyt-dQFcgQLHneC61T0ciMNBGu3u4DXdOLgESCwtHYQq_R2vRr5ShsbID2D83WURDSRKsZbCyTZiuK2y4ag5KQ9Iu6NCy_puAfWjqdmLGULl5tkvlD5Y1i-RsH9LF3KxqgLFdIkqBTUUuX5lj5SUHgTzwIDoGvHSFLX0WvHv4pxEKgIepFfiLOAirxM5QoPw8yptBpSM7UY"
            width={40}
            height={40}
            unoptimized
          />
        </div>
      </div>
    </header>
  );
};
