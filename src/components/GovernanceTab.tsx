"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDashboard } from "../context/DashboardContext";

const getAlertConfig = (level: "error" | "warn" | "info") => {
  switch (level) {
    case "error":
      return {
        classes: "bg-error-container text-error",
        icon: "warning"
      };
    case "warn":
      return {
        classes: "bg-tertiary-fixed/20 text-tertiary",
        icon: "priority_high"
      };
    default:
      return {
        classes: "bg-secondary-container/20 text-secondary",
        icon: "info"
      };
  }
};

export const GovernanceTab: React.FC = () => {
  const router = useRouter();
  const {
    data,
    gdprActive,
    setGdprActive,
    ccpaActive,
    setCcpaActive,
    internalQualityActive,
    setInternalQualityActive,
  } = useDashboard();

  const duplicateCount = data.filter(r => r.status === "Duplicate").length;
  const pendingCount = data.filter(r => r.status === "Pending").length;

  const goldenCount = data.length > 0 
    ? data.filter(r => r.status === "Golden" || !r.status).length 
    : 1200000;

  const complianceScore = data.length > 0
    ? ((goldenCount / data.length) * 100).toFixed(1)
    : "98.4";

  const activeViolations = duplicateCount;
  const pendingAudits = pendingCount;

  const categoryQuality = data.length > 0
    ? [...new Set(data.map(r => r.category).filter(Boolean))].map(cat => ({
        cat,
        avgQ: Math.round(data.filter(r => r.category === cat)
          .reduce((s, r) => s + (r.data_quality_score || 100), 0) / 
          data.filter(r => r.category === cat).length)
      }))
    : [];

  const governanceAlerts = [
    ...data.filter(r => r.status === "Duplicate").slice(0, 2).map((r, idx) => ({
      id: `dup-${r.id || idx}-${idx}`,
      level: "error" as const,
      title: "Duplicate Record Detected",
      desc: `"${r.name}" (${r.category}) sourced from ${r.source_system} conflicts with a Golden Record.`,
      time: `${(idx + 1) * 7} min ago`,
    })),
    ...data.filter(r => r.status === "Pending").slice(0, 1).map((r, idx) => ({
      id: `pending-${r.id || idx}-${idx}`,
      level: "warn" as const,
      title: "Pending Validation",
      desc: `"${r.name}" (${r.category}) from ${r.source_system} is awaiting quality review.`,
      time: "1h ago",
    })),
    {
      id: "system-audit",
      level: "info" as const,
      title: "Audit Log Rotation",
      desc: "System successfully archived governance logs to secure cold storage.",
      time: "Today",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <section className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Compliance &amp; Policy</h2>
          <p className="text-body-lg text-on-surface-variant">Manage enterprise data governance policies and regulatory compliance adherence.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const rows = [["Category", "Avg Quality", "Golden", "Duplicate", "Pending"]];
              [...new Set(data.map(r => r.category))].forEach(cat => {
                const catData = data.filter(r => r.category === cat);
                rows.push([
                  cat,
                  String(Math.round(catData.reduce((s, r) => s + (r.data_quality_score || 100), 0) / catData.length)),
                  String(catData.filter(r => r.status === "Golden").length),
                  String(catData.filter(r => r.status === "Duplicate").length),
                  String(catData.filter(r => r.status === "Pending").length),
                ]);
              });
              const csv = rows.map(r => r.join(",")).join("\n");
              const a = document.createElement("a");
              a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
              a.download = "governance_report.csv";
              a.click();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-colors font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">file_download</span>{" "}
            Export Report
          </button>
          <button
            onClick={() => alert("Policy builder coming soon. Use the CSV upload to ingest new governance rules.")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-label-md text-label-md hover:shadow-lg hover:shadow-primary/20 transition-all font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>{" "}
            New Policy
          </button>
        </div>
      </section>

      {/* Bento Grid: Compliance Health Overview */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Main Health Card */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[16px] p-6 shadow-subtle border border-surface-container-high relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Global Compliance Health</h3>
                <p className="text-body-md text-on-surface-variant font-medium">Real-time monitoring across all enterprise master data domains.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-label-md border border-green-100 font-semibold">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>{" "}
                Optimized
              </div>
            </div>
            <div className="flex items-end gap-10">
              <div>
                <span className="font-stat-value text-stat-value text-on-surface">{complianceScore}%</span>
                <div className="flex items-center gap-1 text-green-600 mt-1">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span className="text-label-md font-bold">{goldenCount} Golden Records</span>
                </div>
              </div>
              <div className="flex-1 h-32 flex items-end gap-2 pb-2">
                {/* Real category quality bars */}
                {(categoryQuality.length > 0 ? categoryQuality : [
                  { cat: "A", avgQ: 60 }, { cat: "B", avgQ: 75 }, { cat: "C", avgQ: 65 },
                  { cat: "D", avgQ: 85 }, { cat: "E", avgQ: 90 }, { cat: "F", avgQ: 80 }, { cat: "G", avgQ: 98 }
                ]).map((cq, i) => (
                  <div
                    key={cq.cat}
                    title={`${cq.cat}: ${cq.avgQ}% avg quality`}
                    className={`flex-1 rounded-t-lg transition-all hover:opacity-80 ${
                      i === categoryQuality.length - 1 ? "bg-primary" : "bg-primary/10 hover:bg-primary/30"
                    }`}
                    style={{ height: `${cq.avgQ}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
          {/* Abstract visual element */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        {/* Side Stat Stack */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <div className="flex-1 bg-white rounded-[16px] p-6 shadow-subtle border border-surface-container-high flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container/20 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant">Active Violations</p>
              <h4 className="font-headline-md text-headline-md text-on-surface">{String(activeViolations).padStart(2, "0")}</h4>
            </div>
            <div className="ml-auto text-error flex items-center font-bold text-label-md">
              {activeViolations > 0 ? "Critical" : "Clean"}
            </div>
          </div>
          <div className="flex-1 bg-white rounded-[16px] p-6 shadow-subtle border border-surface-container-high flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/30 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            </div>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant">Pending Audits</p>
              <h4 className="font-headline-md text-headline-md text-on-surface">{String(pendingAudits).padStart(2, "0")}</h4>
            </div>
            <div className="ml-auto text-on-surface-variant text-label-md font-semibold">
              {pendingAudits > 0 ? `${pendingAudits} items` : "All clear"}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Policies & Alerts */}
      <div className="grid grid-cols-12 gap-gutter items-start">
        {/* Policy List */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Governance Policies</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold cursor-pointer">All Types</button>
              <button className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold cursor-pointer">Recent</button>
            </div>
          </div>
          {/* Policy Cards */}
          <div className="space-y-4">
            {/* Card 1 */}
            <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${gdprActive ? "border-primary/20" : "border-surface-container-high opacity-70"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">gavel</span>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-semibold text-on-surface">GDPR Data Privacy Policy</h4>
                    <p className="text-body-md text-on-surface-variant">Enterprise Data Access Control &amp; Audit Logging</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-label-md font-bold text-on-surface">{gdprActive ? "Active" : "Inactive"}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Last audit: 2h ago</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked={gdprActive} onChange={() => setGdprActive(!gdprActive)} className="sr-only peer" type="checkbox"/>
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="sr-only">Toggle GDPR Data Privacy Policy</span>
                  </label>
                  <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-label="GDPR Options">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${ccpaActive ? "border-secondary/20" : "border-surface-container-high opacity-70"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">rule</span>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-semibold text-on-surface">CCPA Compliance Framework</h4>
                    <p className="text-body-md text-on-surface-variant font-medium">Consumer Data Deletion &amp; Opt-out Management</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-label-md font-bold text-on-surface">{ccpaActive ? "Auditing" : "Inactive"}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">{ccpaActive ? "Reviewing Logs..." : "Suspended"}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked={ccpaActive} onChange={() => setCcpaActive(!ccpaActive)} className="sr-only peer" type="checkbox"/>
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                    <span className="sr-only">Toggle CCPA Framework</span>
                  </label>
                  <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-label="CCPA Options">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${internalQualityActive ? "border-primary/20" : "border-surface-container-high opacity-70"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined">draw</span>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-semibold text-on-surface">Internal Data Quality Standard V2</h4>
                    <p className="text-body-md text-on-surface-variant font-medium">Updated schema for multi-domain entity validation</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-label-md font-bold text-on-surface">{internalQualityActive ? "Active" : "Draft"}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">{internalQualityActive ? "Last edit: 1h ago" : "Created 3d ago"}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input checked={internalQualityActive} onChange={() => setInternalQualityActive(!internalQualityActive)} className="sr-only peer" type="checkbox"/>
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="sr-only">Toggle Internal Data Quality Standard</span>
                  </label>
                  <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" aria-label="Internal Quality Options">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Recent Alerts — driven from real duplicate/pending data */}
        <div className="col-span-12 lg:col-span-4 space-y-gutter">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Governance Alerts</h3>
          <div className="bg-white rounded-[16px] p-1 border border-surface-container-high shadow-subtle overflow-hidden">
            {governanceAlerts.slice(0, 4).map((alertItem, i) => {
              const alertConfig = getAlertConfig(alertItem.level);
              return (
                <button
                  type="button"
                  key={alertItem.id}
                  className={`w-full text-left p-4 flex gap-4 hover:bg-surface-container-low transition-colors cursor-pointer border-0 bg-transparent ${
                    i < Math.min(governanceAlerts.length, 4) - 1 ? "border-b border-surface-container" : ""
                  }`}
                  onClick={() => alertItem.level === "error" ? router.push("/registry") : undefined}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${alertConfig.classes}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {alertConfig.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-label-md font-bold text-on-surface block truncate">{alertItem.title}</span>
                      <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{alertItem.time}</span>
                    </div>
                    <span className="text-body-md text-on-surface-variant mt-1 leading-snug line-clamp-2 block">{alertItem.desc}</span>
                    {alertItem.level === "error" && (
                      <span className="mt-2 text-primary font-label-md text-label-md flex items-center gap-1 hover:underline cursor-pointer font-bold block">
                        Investigate <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {governanceAlerts.length === 0 && (
              <div className="p-6 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] text-primary mb-2">check_circle</span>
                <p className="text-body-md">No active alerts. All systems compliant.</p>
              </div>
            )}
            <Link
              href="/registry"
              className="w-full py-4 text-center text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors border-t border-surface-container font-semibold block"
            >
              View All Records
            </Link>
          </div>
          {/* Atmospheric Visual Section */}
          <div className="relative h-48 rounded-[16px] overflow-hidden group">
            <Image 
              alt="Clinical Governance Abstract" 
              className="w-full h-full object-cover grayscale opacity-80 group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQ4_WXwNprtmqOvSIP1O-kppMIor1eZ-qNIoQOrRPfVmLOx4GMU2FDpdUAEoyipSK9yaesROLukMCt6EPujNcy4rOHOf8YRslEG_NTWbomdI3m-pS4QhwEqOArf5CRaQ7_VZzIcwZHnT-LNLjfKwmLuV5E2zBJNoCax-dwdivMrtYSjXql3wldxuaC9cESAjwozIxbchOvacY3y35CLfVmpfn6EFWINWX7UmVOFDXL3YVzq19RaoyRGeRoFaNmaYcTqKw__rpDLN8"
              width={400}
              height={192}
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-6">
              <p className="text-white font-bold text-headline-sm">Data Trust Architecture</p>
              <p className="text-white/80 text-body-md">Precision MDM Core enforces zero-trust data integrity across all enterprise domains.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
