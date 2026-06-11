"use client";

import React, { useRef } from "react";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

const DashboardLayoutContent: React.FC<Readonly<{ children: React.ReactNode }>> = ({ children }) => {
  const { isVerifyingSession, handleUpload } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(e.target.files[0]);
    }
  };

  if (isVerifyingSession) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined animate-spin text-[48px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      {/* Main Content Wrapper */}
      <div className="flex-1 h-screen overflow-y-auto bg-background md:ml-[260px] flex flex-col">
        <Header />
        {/* Main Canvas */}
        <main className="mt-20 p-container-padding flex-1">
          {children}
        </main>
      </div>

      {/* Hidden File Input for Floating Upload Button */}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        aria-label="Upload CSV file"
      />

      {/* Floating Action Button - mapped to Upload CSV */}
      <button 
        onClick={handleUploadClick}
        title="Upload New Master Data CSV"
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
      >
        <span className="material-symbols-outlined">cloud_upload</span>
      </button>
    </>
  );
};

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}
