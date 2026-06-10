"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface MasterDataRecord {
  id?: string | number;
  name: string;
  category: string;
  value: number;
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MasterDataRecord[]>([]);
  const [dashOffset, setDashOffset] = useState(251.2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMasterData = async () => {
    try {
      const res = await fetch("/api/master-data");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
  };

  useEffect(() => {
    fetchMasterData();
    // Trigger gauge animation after mount
    setTimeout(() => {
      setDashOffset(251.2 - (251.2 * 89) / 100);
    }, 100);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-etl", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Upload successful");
        fetchMasterData(); // Refresh data
        setFile(null); // Reset
      } else {
        setMessage(result.detail || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      setMessage("An error occurred during upload.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Sidebar Navigation */}
      <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface flex flex-col py-8 px-4 border-r border-outline-variant z-50 hidden md:flex">
        <div className="mb-12 px-4">
          <h1
            className="text-headline-sm font-headline-sm text-primary"
            data-testid="page-title"
          >
            MediData
          </h1>
          <p className="text-label-md font-label-md text-on-surface-variant">
            Enterprise MDM
          </p>
        </div>
        <nav className="flex-1 space-y-2">
          {/* Dashboard (Active) */}
          <a
            className="flex items-center gap-3 px-4 py-3 bg-primary-fixed text-on-primary-fixed rounded-full font-semibold transition-transform duration-200 active:scale-95"
            href="#"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">group</span>
            <span className="font-body-md text-body-md">Customers</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="font-body-md text-body-md">Products</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="font-body-md text-body-md">Suppliers</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span className="font-body-md text-body-md">Validation</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md text-body-md">Settings</span>
          </a>
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
              <button className="bg-white text-primary px-4 py-2 rounded-full text-label-md font-semibold hover:bg-primary-fixed transition-colors">
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

      {/* Main Content Wrapper */}
      <div className="flex-1 h-screen overflow-y-auto bg-background md:ml-[260px] flex flex-col">
        {/* Top Navigation */}
        <header className="h-20 fixed top-0 right-0 left-0 md:left-[260px] z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center px-gutter border-b border-outline-variant">
          <div className="flex items-center gap-8">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Master Data Management
            </h2>
            <div className="relative group hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-full py-2 pl-10 pr-4 w-80 text-body-md transition-all outline-none"
                placeholder="Search for healthcare data..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors relative">
              <span className="material-symbols-outlined">mail</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
              <div className="text-right">
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  Dr. Sarah Chen
                </p>
                <p className="font-label-md text-[10px] text-on-surface-variant">
                  System Administrator
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

        {/* Main Canvas */}
        <main className="mt-20 p-container-padding flex-1">
          {/* Hero Banner Section */}
          <section className="grid grid-cols-12 gap-gutter mb-8">
            <div className="col-span-12 lg:col-span-8 bg-secondary-container/20 rounded-2xl p-8 flex justify-between items-center relative overflow-hidden border border-secondary-container/30">
              <div className="max-w-xl z-10">
                <h3 className="font-headline-lg text-headline-lg text-on-secondary-container mb-2">
                  Northwestern Memorial Hospital
                </h3>
                <p className="text-on-surface-variant font-body-md mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">
                    location_on
                  </span>
                  251 E Huron St, Chicago, IL 60611, United States
                </p>
                <div className="flex gap-6">
                  <div className="flex items-center gap-3 bg-white/60 backdrop-blur rounded-xl p-3 border border-white/40">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">
                        medical_services
                      </span>
                    </div>
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">
                        Total Doctors
                      </p>
                      <p className="text-headline-sm font-headline-sm text-on-surface">
                        3.8k
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 backdrop-blur rounded-xl p-3 border border-white/40">
                    <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined">domain</span>
                    </div>
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">
                        Facilities
                      </p>
                      <p className="text-headline-sm font-headline-sm text-on-surface">
                        21
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:block w-72 h-48 relative z-10">
                <Image
                  alt="Healthcare Professional Illustration"
                  className="rounded-2xl object-cover w-full h-full custom-shadow"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPdbyc0Y8huVRihYNYdBABCMofTvuKc7uDYb9Ym3C6USZT19h7xLlpaOB-8wVRyIGxrYUGgBQM-BMCpSx_UmtmSLY57XjE1Ba52uURjmu-0I4yzJvu2cQrVnfS4PdlDGbONn76KxP47d9CEcyCRceQwUNwCam471ch_xHXMbWVeBOPh4DtQvKbxdljoCgf09Q185kB-AcZ3SQoxuUw9QLfFdqP2eBJeAKMO9efQpsd8OkBoFdMl9AbLneflQLnSGFC_nCYu6e4_u4"
                  width={288}
                  height={192}
                  unoptimized
                />
              </div>
              {/* Abstract Background Shapes */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute right-40 -bottom-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>
            </div>

            {/* Health Score Circular Gauge */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 custom-shadow border border-outline-variant flex flex-col items-center justify-center text-center">
              <h4 className="font-headline-sm text-headline-sm mb-6 text-on-surface">
                System Health Score
              </h4>
              <div className="gauge-container mb-4">
                <svg className="gauge-svg w-full h-full" viewBox="0 0 100 100">
                  <circle className="gauge-bg" cx="50" cy="50" r="40"></circle>
                  <circle
                    className="gauge-fill"
                    cx="50"
                    cy="50"
                    r="40"
                    style={{ strokeDashoffset: dashOffset }}
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-stat-value font-stat-value text-primary leading-tight">
                    89%
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Optimal
                  </span>
                </div>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant">
                System performance is exceeding target by 4.2% this week.
              </p>
            </div>
          </section>

          {/* Metrics Bento Grid */}
          <section className="grid grid-cols-12 gap-gutter mb-8">
            {/* Metric Card 1: Patients */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 cursor-default group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <span className="flex items-center gap-1 text-tertiary font-bold text-label-md">
                  <span className="material-symbols-outlined text-sm">
                    trending_up
                  </span>
                  +12%
                </span>
              </div>
              <p className="font-stat-value text-stat-value text-on-surface">
                24,500
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Registered Patients
              </p>
              <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
                <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                  <span>Consistency</span>
                  <span>98.2%</span>
                </div>
              </div>
            </div>

            {/* Metric Card 2: Medical Supplies */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 cursor-default group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <span className="flex items-center gap-1 text-error font-bold text-label-md">
                  <span className="material-symbols-outlined text-sm">
                    trending_down
                  </span>
                  -3%
                </span>
              </div>
              <p className="font-stat-value text-stat-value text-on-surface">
                18,200
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Medical Supplies
              </p>
              <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
                <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                  <span>Stock Level</span>
                  <span className="text-tertiary">Warning</span>
                </div>
              </div>
            </div>

            {/* Metric Card 3: Care Providers */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 cursor-default group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-2xl flex items-center justify-center group-hover:bg-tertiary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">emergency</span>
                </div>
                <span className="flex items-center gap-1 text-tertiary font-bold text-label-md">
                  <span className="material-symbols-outlined text-sm">
                    trending_up
                  </span>
                  +5%
                </span>
              </div>
              <p className="font-stat-value text-stat-value text-on-surface">
                3,400
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Care Providers
              </p>
              <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
                <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                  <span>Active Now</span>
                  <span>842</span>
                </div>
              </div>
            </div>

            {/* Metric Card 4: Beds Available */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-on-primary-fixed-variant p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 cursor-default group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined">bed</span>
                </div>
                <span className="material-symbols-outlined text-white/40">
                  north_east
                </span>
              </div>
              <p className="font-stat-value text-stat-value text-white">2.8k</p>
              <p className="font-body-md text-body-md text-white/70">
                Beds Available
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 border-dashed">
                <div className="flex justify-between text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  <span>Capacity</span>
                  <span>88%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Trends and Activity Section */}
          <section className="grid grid-cols-12 gap-gutter mb-8">
            {/* Data Integrity Trend Chart */}
            <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    Data Integrity Trend
                  </h4>
                  <p className="text-body-md text-on-surface-variant">
                    Monthly MDM governance improvement tracking
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold hover:bg-surface-container-high transition-colors">
                    12M
                  </button>
                  <button className="px-3 py-1 bg-primary text-white rounded-full text-label-md font-bold hover:bg-on-primary-fixed-variant transition-colors">
                    6M
                  </button>
                  <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold hover:bg-surface-container-high transition-colors">
                    30D
                  </button>
                </div>
              </div>
              {/* Mock Chart Area */}
              <div className="relative h-[300px] w-full mt-4">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4648d4"
                        stopOpacity={0.15}
                      ></stop>
                      <stop
                        offset="100%"
                        stopColor="#4648d4"
                        stopOpacity={0}
                      ></stop>
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line
                    stroke="#edeef0"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1="0"
                    y2="0"
                  ></line>
                  <line
                    stroke="#edeef0"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1="25%"
                    y2="25%"
                  ></line>
                  <line
                    stroke="#edeef0"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1="50%"
                    y2="50%"
                  ></line>
                  <line
                    stroke="#edeef0"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1="75%"
                    y2="75%"
                  ></line>
                  <line
                    stroke="#edeef0"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1="100%"
                    y2="100%"
                  ></line>
                  {/* Smoothed Path */}
                  <path
                    d="M 0 240 Q 150 200 300 230 T 600 150 T 900 120 T 1200 80"
                    fill="none"
                    stroke="#4648d4"
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 0 240 Q 150 200 300 230 T 600 150 T 900 120 T 1200 80 V 300 H 0 Z"
                    fill="url(#chartGradient)"
                  ></path>
                  {/* Data Points */}
                  <circle
                    cx="0"
                    cy="240"
                    fill="#4648d4"
                    r="5"
                    stroke="white"
                    strokeWidth="2"
                  ></circle>
                  <circle
                    cx="300"
                    cy="230"
                    fill="#4648d4"
                    r="5"
                    stroke="white"
                    strokeWidth="2"
                  ></circle>
                  <circle
                    cx="600"
                    cy="150"
                    fill="#4648d4"
                    r="5"
                    stroke="white"
                    strokeWidth="2"
                  ></circle>
                  <circle
                    cx="900"
                    cy="120"
                    fill="#4648d4"
                    r="5"
                    stroke="white"
                    strokeWidth="2"
                  ></circle>
                  <circle
                    cx="1180"
                    cy="85"
                    fill="#4648d4"
                    r="5"
                    stroke="white"
                    strokeWidth="2"
                  ></circle>
                </svg>
                <div className="flex justify-between mt-6 text-label-md text-on-surface-variant font-medium">
                  <span>January</span>
                  <span>February</span>
                  <span>March</span>
                  <span>April</span>
                  <span>May</span>
                  <span>June</span>
                </div>
              </div>
            </div>

            {/* Recent Governance Activity */}
            <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                Recent Activity
              </h4>
              <div className="flex-1 space-y-6 overflow-y-auto max-h-[300px] pr-2">
                {/* Activity Item 1 */}
                <div className="flex gap-4 relative">
                  <div className="flex-none w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary z-10">
                    <span className="material-symbols-outlined text-lg">
                      check_circle
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-bold">MDM Protocol Updated</span>
                    </p>
                    <p className="text-label-md text-on-surface-variant">
                      Cardiology patient records synchronized across 4 nodes.
                    </p>
                    <p className="text-[10px] text-outline font-bold mt-1 uppercase">
                      2 MINS AGO
                    </p>
                  </div>
                  <div className="absolute left-5 top-10 bottom-[-24px] w-[1px] bg-outline-variant"></div>
                </div>
                {/* Activity Item 2 */}
                <div className="flex gap-4 relative">
                  <div className="flex-none w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary z-10">
                    <span className="material-symbols-outlined text-lg">
                      warning
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-bold">Data Conflict Detected</span>
                    </p>
                    <p className="text-label-md text-on-surface-variant">
                      Duplicate entry for patient &quot;Anderson, Mark&quot; in
                      Lab-7.
                    </p>
                    <p className="text-[10px] text-outline font-bold mt-1 uppercase">
                      45 MINS AGO
                    </p>
                  </div>
                  <div className="absolute left-5 top-10 bottom-[-24px] w-[1px] bg-outline-variant"></div>
                </div>
                {/* Activity Item 3 */}
                <div className="flex gap-4 relative">
                  <div className="flex-none w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary z-10">
                    <span className="material-symbols-outlined text-lg">
                      sync
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-bold">System Backup Completed</span>
                    </p>
                    <p className="text-label-md text-on-surface-variant">
                      Encrypted archive generated for 1.4TB of telemetry data.
                    </p>
                    <p className="text-[10px] text-outline font-bold mt-1 uppercase">
                      2 HOURS AGO
                    </p>
                  </div>
                  <div className="absolute left-5 top-10 bottom-[-24px] w-[1px] bg-outline-variant"></div>
                </div>
                {/* Activity Item 4 */}
                <div className="flex gap-4">
                  <div className="flex-none w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-on-surface-variant z-10">
                    <span className="material-symbols-outlined text-lg">
                      person_add
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-bold">New Auditor Assigned</span>
                    </p>
                    <p className="text-label-md text-on-surface-variant">
                      Sarah Jenkins granted access to &apos;Pediatrics&apos;
                      metadata.
                    </p>
                    <p className="text-[10px] text-outline font-bold mt-1 uppercase">
                      5 HOURS AGO
                    </p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 py-3 border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
                View Audit Log
              </button>
            </div>
          </section>

          {/* ETL Pipeline & Master Data Records */}
          <section className="grid grid-cols-12 gap-gutter">
            {/* ETL Pipeline Intake */}
            <div className="col-span-12 lg:col-span-5 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                ETL Pipeline Intake
              </h4>
              <p className="text-body-md text-on-surface-variant mb-6">
                Upload healthcare master data to trigger standardization and
                ingestion pipeline.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                data-testid="file-upload"
              />

              <div
                onClick={handleUploadClick}
                className="w-full border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low hover:bg-primary-fixed/20 transition-all duration-200 flex flex-col items-center justify-center py-8 px-4 cursor-pointer group mb-6 flex-1 min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center mb-3 transition-colors text-primary">
                  <span className="material-symbols-outlined text-2xl">
                    cloud_upload
                  </span>
                </div>
                <h5 className="font-headline-sm text-sm text-on-surface mb-1 text-center font-semibold">
                  {file ? file.name : "Upload CSV File"}
                </h5>
                <p className="text-[11px] text-on-surface-variant text-center max-w-xs">
                  Drag and drop CSV files here, or{" "}
                  <span className="text-primary font-bold hover:underline">
                    browse
                  </span>
                  . Max 500MB.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 mt-auto">
                <button
                  onClick={handleUpload}
                  disabled={isLoading || !file}
                  className="px-6 py-3 bg-primary text-white rounded-full font-semibold text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-md"
                >
                  {isLoading ? "Processing..." : "Upload Data"}
                </button>
                {message && (
                  <p
                    className={`text-label-md font-semibold truncate ${message.includes("success") || message.includes("successful") ? "text-tertiary" : "text-error"}`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* Harmonized Records Table */}
            <div className="col-span-12 lg:col-span-7 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    Harmonized Records
                  </h4>
                  <p className="text-body-md text-on-surface-variant font-medium">
                    Standardized healthcare master data entities
                  </p>
                </div>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-md font-bold">
                  {data.length} records
                </span>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                        ID
                      </th>
                      <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                        Name
                      </th>
                      <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                        Category
                      </th>
                      <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider text-right">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-body-md text-on-surface divide-y divide-outline-variant/30">
                    {data.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-on-surface-variant"
                          colSpan={4}
                        >
                          No records found. Run the ETL pipeline to ingest data.
                        </td>
                      </tr>
                    ) : (
                      data.map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-primary">
                            {row.id || `REC-${index}`}
                          </td>
                          <td className="py-3 px-4 font-medium">{row.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-[11px] font-bold">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-tertiary">
                            {row.value}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined">add</span>
      </button>
    </>
  );
}
