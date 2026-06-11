"use client";

import React from "react";
import Image from "next/image";
import { useDashboard, MasterDataRecord } from "../context/DashboardContext";

interface MetricInfo {
  avgQuality: number;
  duplicateCount: number;
  uniqueSources: number;
  activeNodes: number;
  goldenCount: number;
  activeDomains: number;
  activeEntities: number;
  syncAvailability: string;
  currentY: number;
  governanceStatus: string;
  goldenDisplay: string;
  entitiesDisplay: string;
}

const computeMetrics = (data: MasterDataRecord[]): MetricInfo => {
  if (data.length === 0) {
    return {
      avgQuality: 89,
      duplicateCount: 0,
      uniqueSources: 4,
      activeNodes: 24,
      goldenCount: 1200000,
      activeDomains: 18,
      activeEntities: 245000,
      syncAvailability: "99.9",
      currentY: 33,
      governanceStatus: "Optimal",
      goldenDisplay: "1.2M",
      entitiesDisplay: "245k"
    };
  }

  const avgQuality = Math.round(data.reduce((acc, row) => acc + (row.data_quality_score || 100), 0) / data.length);
  const duplicateCount = data.filter(r => r.status === "Duplicate").length;
  const uniqueSources = new Set(data.map(r => r.source_system).filter(Boolean)).size;
  const activeNodes = new Set(data.map(r => r.source_system).filter(Boolean)).size;
  const goldenCount = data.filter(r => r.status === "Golden" || !r.status).length;
  const activeDomains = new Set(data.map(r => r.category).filter(Boolean)).size;
  const activeEntities = data.length;
  const syncAvailability = (100 - (duplicateCount / data.length) * 10).toFixed(1);
  const currentY = 300 - (300 * avgQuality / 100);

  // Status mapping to avoid nested ternary
  let governanceStatus = "Critical";
  if (avgQuality >= 90) {
    governanceStatus = "Excellent";
  } else if (avgQuality >= 80) {
    governanceStatus = "Optimal";
  } else if (avgQuality >= 70) {
    governanceStatus = "Warning";
  }

  const goldenDisplay = goldenCount >= 1000 ? `${(goldenCount / 1000).toFixed(1)}k` : goldenCount.toString();
  const entitiesDisplay = activeEntities >= 1000 ? `${(activeEntities / 1000).toFixed(1)}k` : activeEntities.toString();

  return {
    avgQuality,
    duplicateCount,
    uniqueSources,
    activeNodes,
    goldenCount,
    activeDomains,
    activeEntities,
    syncAvailability,
    currentY,
    governanceStatus,
    goldenDisplay,
    entitiesDisplay
  };
};

interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
}

const generateActivities = (data: MasterDataRecord[]): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  
  const duplicates = data.filter(r => r.status === "Duplicate");
  duplicates.forEach((dup, idx) => {
    activities.push({
      id: `dup-${dup.id || idx}-${idx}`,
      title: "Data Conflict Detected",
      desc: `Duplicate record candidate detected for "${dup.name}" from ${dup.source_system || "unknown source"}.`,
      time: `${(idx + 1) * 15} MINS AGO`,
      icon: "warning",
      color: "text-tertiary bg-tertiary/10"
    });
  });

  const goldenRecs = data.filter(r => r.status === "Golden" || !r.status);
  goldenRecs.slice(0, 3).forEach((gold, idx) => {
    activities.push({
      id: `gold-${gold.id || idx}-${idx}`,
      title: "Record Verified",
      desc: `"${gold.name}" validated and indexed as a Golden Record.`,
      time: `${(idx + 1) * 2} HOURS AGO`,
      icon: "check_circle",
      color: "text-primary bg-primary/10"
    });
  });

  activities.push(
    {
      id: "schema-validated",
      title: "Schema Validated",
      desc: "Customer master schema synchronized across all global regions.",
      time: "2 MINS AGO",
      icon: "check_circle",
      color: "text-primary bg-primary/10"
    },
    {
      id: "vault-backup",
      title: "Vault Backup Completed",
      desc: "Encrypted metadata archive generated for 1.4TB of records.",
      time: "2 HOURS AGO",
      icon: "sync",
      color: "text-secondary bg-secondary/10"
    }
  );

  return activities;
};

export const OverviewTab: React.FC = () => {
  const { data } = useDashboard();

  const {
    avgQuality,
    uniqueSources,
    activeNodes,
    activeDomains,
    syncAvailability,
    currentY,
    governanceStatus,
    goldenDisplay,
    entitiesDisplay
  } = computeMetrics(data);

  const activities = generateActivities(data);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner Section */}
      <section className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 lg:col-span-8 bg-secondary-container/20 rounded-2xl p-8 flex justify-between items-center relative overflow-hidden border border-secondary-container/30">
          <div className="max-w-xl z-10">
            <h3 className="font-headline-lg text-headline-lg text-on-secondary-container mb-2">Enterprise Connectivity Hub</h3>
            <p className="text-on-surface-variant font-body-md mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">cloud_done</span>{" "}
              Centralized MDM Cluster: US-East-Primary
            </p>
            <div className="flex gap-6">
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur rounded-xl p-3 border border-white/40">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">database</span>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant font-medium">Source Systems</p>
                  <p className="text-headline-sm font-headline-sm text-on-surface">{data.length > 0 ? uniqueSources : 142}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur rounded-xl p-3 border border-white/40">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">hub</span>
                </div>
                <div>
                  <p className="text-label-md text-on-surface-variant font-medium">Active Nodes</p>
                  <p className="text-headline-sm font-headline-sm text-on-surface">{data.length > 0 ? activeNodes : 24}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:block w-72 h-48 relative z-10">
            <Image 
              alt="Abstract Data Visualization" 
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

        {/* Governance Score Circular Gauge */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 custom-shadow border border-outline-variant flex flex-col items-center justify-center text-center">
          <h4 className="font-headline-sm text-headline-sm mb-6 text-on-surface">Governance Score</h4>
          <div className="gauge-container mb-4 relative w-32 h-32">
            <svg className="gauge-svg w-full h-full" viewBox="0 0 100 100">
              <circle className="gauge-bg" cx="50" cy="50" r="40"></circle>
              <circle className="gauge-fill" cx="50" cy="50" r="40" style={{ strokeDashoffset: `calc(251.2 - (251.2 * ${avgQuality}) / 100)` }}></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-stat-value font-stat-value text-primary leading-tight text-3xl font-bold">{avgQuality}%</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {governanceStatus}
              </span>
            </div>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant font-medium">
            {avgQuality >= 85 
              ? `Compliance metrics are exceeding enterprise target by ${(avgQuality - 85).toFixed(1)}%.` 
              : `Compliance metrics are below enterprise target by ${(85 - avgQuality).toFixed(1)}%.`}
          </p>
        </div>
      </section>

      {/* Metrics Bento Grid */}
      <section className="grid grid-cols-12 gap-gutter">
        {/* Metric Card 1: Golden Records */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] transition-transform cursor-default group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">stars</span>
            </div>
            <span className="flex items-center gap-1 text-tertiary font-bold text-label-md">
              <span className="material-symbols-outlined text-sm">trending_up</span>{" "}
              +12%
            </span>
          </div>
          <p className="font-stat-value text-stat-value text-on-surface">
            {goldenDisplay}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">Golden Records</p>
          <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
            <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
              <span>Accuracy</span>
              <span>99.8%</span>
            </div>
          </div>
        </div>
        {/* Metric Card 2: Data Domains */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] transition-transform cursor-default group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">dataset</span>
            </div>
            <span className="flex items-center gap-1 text-tertiary font-bold text-label-md">
              <span className="material-symbols-outlined text-sm">check</span>{" "}
              Stable
            </span>
          </div>
          <p className="font-stat-value text-stat-value text-on-surface">{data.length > 0 ? activeDomains : 18}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">Active Data Domains</p>
          <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
            <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
              <span>Integration Status</span>
              <span className="text-primary font-bold">Active</span>
            </div>
          </div>
        </div>
        {/* Metric Card 3: Active Entities */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] transition-transform cursor-default group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-2xl flex items-center justify-center group-hover:bg-tertiary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <span className="flex items-center gap-1 text-tertiary font-bold text-label-md">
              <span className="material-symbols-outlined text-sm">trending_up</span>{" "}
              +5%
            </span>
          </div>
          <p className="font-stat-value text-stat-value text-on-surface">
            {entitiesDisplay}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">Active Entities</p>
          <div className="mt-4 pt-4 border-t border-surface-container border-dashed">
            <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
              <span>Sync Frequency</span>
              <span>Real-time</span>
            </div>
          </div>
        </div>
        {/* Metric Card 4: Sync Status */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-on-primary-fixed-variant p-6 rounded-2xl border border-outline-variant custom-shadow hover:scale-[1.02] transition-transform cursor-default group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white">sync</span>
            </div>
            <span className="material-symbols-outlined text-white/40">north_east</span>
          </div>
          <p className="font-stat-value text-stat-value text-white">{data.length > 0 ? `${syncAvailability}%` : "99.9%"}</p>
          <p className="font-body-md text-body-md text-white/70">Sync Availability</p>
          <div className="mt-4 pt-4 border-t border-white/10 border-dashed">
            <div className="flex justify-between text-[10px] text-white/50 font-bold uppercase tracking-widest">
              <span>Throughput</span>
              <span>4.8 GB/s</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trends and Activity Section */}
      <section className="grid grid-cols-12 gap-gutter">
        {/* Data Quality Trend Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Data Quality Trend</h4>
              <p className="text-body-md text-on-surface-variant">Monthly MDM governance improvement tracking</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold cursor-pointer">12M</button>
              <button className="px-3 py-1 bg-primary text-white rounded-full text-label-md font-bold font-semibold cursor-pointer">6M</button>
              <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold cursor-pointer">30D</button>
            </div>
          </div>
          {/* Mock Chart Area */}
          <div className="relative h-[300px] w-full mt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1200 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4648d4" stopOpacity="0.15"></stop>
                  <stop offset="100%" stopColor="#4648d4" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line stroke="#edeef0" strokeWidth="1" x1="0" x2="100%" y1="0" y2="0"></line>
              <line stroke="#edeef0" strokeWidth="1" x1="0" x2="100%" y1="25%" y2="25%"></line>
              <line stroke="#edeef0" strokeWidth="1" x1="0" x2="100%" y1="50%" y2="50%"></line>
              <line stroke="#edeef0" strokeWidth="1" x1="0" x2="100%" y1="75%" y2="75%"></line>
              <line stroke="#edeef0" strokeWidth="1" x1="0" x2="100%" y1="100%" y2="100%"></line>
              {/* Smoothed Path */}
              <path d={`M 0 240 Q 150 200 300 230 T 600 150 T 900 120 T 1180 ${currentY}`} fill="none" stroke="#4648d4" strokeLinecap="round" strokeWidth="3"></path>
              <path d={`M 0 240 Q 150 200 300 230 T 600 150 T 900 120 T 1180 ${currentY} V 300 H 0 Z`} fill="url(#chartGradient)"></path>
              {/* Data Points */}
              <circle cx="0" cy="240" fill="#4648d4" r="5" stroke="white" strokeWidth="2"></circle>
              <circle cx="300" cy="230" fill="#4648d4" r="5" stroke="white" strokeWidth="2"></circle>
              <circle cx="600" cy="150" fill="#4648d4" r="5" stroke="white" strokeWidth="2"></circle>
              <circle cx="900" cy="120" fill="#4648d4" r="5" stroke="white" strokeWidth="2"></circle>
              <circle cx="1180" cy={currentY} fill="#4648d4" r="5" stroke="white" strokeWidth="2"></circle>
            </svg>
            <div className="flex justify-between mt-6 text-label-md text-on-surface-variant font-medium">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>

        {/* Recent Governance Activity */}
        <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-6">Governance Activity</h4>
          <div className="flex-1 space-y-6 overflow-y-auto max-h-[300px] pr-2">
            {activities.map((act, idx) => (
              <div className="flex gap-4 relative" key={act.id}>
                <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center z-10 ${act.color}`}>
                  <span className="material-symbols-outlined text-lg">{act.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-body-md text-body-md text-on-surface"><span className="font-bold">{act.title}</span></p>
                  <p className="text-label-md text-on-surface-variant text-xs">{act.desc}</p>
                  <p className="text-[10px] text-outline font-bold mt-1 uppercase text-on-surface-variant">{act.time}</p>
                </div>
                {idx < activities.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-[-24px] w-[1px] bg-outline-variant"></div>
                )}
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors font-bold cursor-pointer">
            View Complete Audit Log
          </button>
        </div>
      </section>
    </div>
  );
};
