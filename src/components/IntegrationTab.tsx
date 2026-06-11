"use client";

import React from "react";
import Image from "next/image";
import { useDashboard } from "../context/DashboardContext";

const getAuditLogActionClasses = (action: string) => {
  switch (action) {
    case "SYSTEM_INIT":
      return "bg-secondary-container text-secondary border border-secondary/20";
    case "MERGE_RECORDS":
      return "bg-tertiary-container text-tertiary border border-tertiary/20";
    case "UPDATE_SETTINGS":
      return "bg-primary-fixed text-on-primary-fixed border border-primary/20";
    default:
      return "bg-surface-container text-on-surface-variant";
  }
};

export const IntegrationTab: React.FC = () => {
  const {
    selectedLineageNode,
    setSelectedLineageNode,
    isLineageSidebarOpen,
    setIsLineageSidebarOpen,
    lineageFilter,
    setLineageFilter,
    showAuditTrailModal,
    setShowAuditTrailModal,
    auditLogs,
    fetchAuditLogs,
    handleExportMap,
    fuzzyThreshold,
  } = useDashboard();

  const lineageNodeData = {
    ERP: {
      name: "Oracle ERP Cloud",
      type: "ERP Connector",
      icon: "database",
      score: "94.2%",
      latency: "45ms",
      sync: "12m ago",
      owner: "Michael Chen (Finance Ops)",
      attributes: [
        { name: "Legal Name", value: "Precision Corp LLC", checked: true },
        { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
        { name: "HQ Location", value: "San Francisco, CA", checked: false },
      ]
    },
    CRM: {
      name: "Salesforce CRM",
      type: "CRM Connector",
      icon: "person_book",
      score: "98.2%",
      latency: "14ms",
      sync: "Real-time",
      owner: "Sarah Jenkins (Data Steward)",
      attributes: [
        { name: "Legal Name", value: "Precision Corp Ltd.", checked: true },
        { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
        { name: "HQ Location", value: "San Francisco, CA", checked: true },
      ]
    },
    Legacy: {
      name: "Legacy ERP DB",
      type: "Legacy Database",
      icon: "archive",
      score: "62.8%",
      latency: "1.2s",
      sync: "24h ago",
      owner: "System Admin (Archival)",
      attributes: [
        { name: "Legal Name", value: "Precision Corp", checked: false },
        { name: "Tax ID (FEIN)", value: "Unavailable", checked: false },
        { name: "HQ Location", value: "Oakland, CA", checked: false },
      ]
    },
    GoldenRecord: {
      name: "GR-001",
      type: "Golden Record",
      icon: "verified",
      score: "99.9%",
      latency: "0ms",
      sync: "Published",
      owner: "Enterprise Data Governance Board",
      attributes: [
        { name: "Legal Name", value: "Precision Corp Ltd.", checked: true },
        { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
        { name: "HQ Location", value: "San Francisco, CA", checked: true },
      ]
    },
    ValidationEngine: {
      name: "Validation Engine",
      type: "MDM Processing Engine",
      icon: "auto_fix_high",
      score: "100%",
      latency: "2ms",
      sync: "Active",
      owner: "System Matching Engine",
      attributes: [
        { name: "Matching Logic", value: "Fuzzy Match (0.85 Threshold)", checked: true },
        { name: "Survivorship Rule", value: "Most Recent & Quality Weighted", checked: true },
        { name: "De-duplication Status", value: "Complete", checked: true },
      ]
    }
  };

  const selectedNodeData = lineageNodeData[selectedLineageNode] || lineageNodeData.CRM;

  return (
    <div className="flex flex-col lg:flex-row gap-6 -m-container-padding h-[calc(100vh-80px)] overflow-hidden animate-fadeIn">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-x-auto overflow-y-auto lineage-grid p-6 min-h-[500px]">
        {/* Header for Canvas */}
        <div className="flex justify-between items-end mb-8 relative z-10 flex-wrap gap-4">
          <div>
            <span className="text-primary font-semibold text-label-md bg-primary-fixed px-3 py-1 rounded-full">
              Record ID: GR-001
            </span>
            <h3 className="font-headline-lg text-headline-lg mt-2 text-on-surface">
              Golden Record: Precision Corp Ltd.
            </h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setLineageFilter(lineageFilter === "all" ? "high-quality" : "all")}
              className={`border px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-semibold text-label-md cursor-pointer ${
                lineageFilter === "high-quality" 
                  ? "bg-primary-fixed text-on-primary-fixed border-primary/20" 
                  : "bg-white border-outline-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              {lineageFilter === "high-quality" ? "Showing High Quality (>90%)" : "Filter View"}
            </button>
            <button 
              onClick={handleExportMap}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity font-semibold text-label-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">file_download</span>{" "}
              Export Map
            </button>
          </div>
        </div>

        {/* Interactive Visualization Canvas */}
        <div className="relative min-w-[1100px] h-[550px] mx-auto" id="lineage-canvas">
          {/* SVG Connections Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#93c5fd"></stop>
                <stop offset="100%" stopColor="#4648d4"></stop>
              </linearGradient>
            </defs>
            {/* Connection Lines */}
            <path className="flow-line" d="M 220 180 C 400 180, 400 350, 580 350" fill="none" stroke="url(#lineGradient)" strokeWidth="2"></path>
            <path className="flow-line" d="M 220 350 C 400 350, 400 350, 580 350" fill="none" stroke="url(#lineGradient)" strokeWidth="2"></path>
            <path 
              className="flow-line" 
              d="M 220 520 C 400 520, 400 350, 580 350" 
              fill="none" 
              stroke="url(#lineGradient)" 
              strokeWidth="2"
              strokeDasharray={lineageFilter === "high-quality" ? "5,5" : undefined}
              opacity={lineageFilter === "high-quality" ? "0.15" : "1"}
            ></path>
            <path d="M 740 350 C 850 350, 850 350, 960 350" fill="none" stroke="#4648d4" strokeWidth="3"></path>
          </svg>

          {/* Source Node 1: Oracle Cloud */}
          <button 
            type="button"
            onClick={() => { setSelectedLineageNode("ERP"); setIsLineageSidebarOpen(true); }}
            className={`absolute left-[20px] top-[120px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 text-left block border-0 cursor-pointer ${
              selectedLineageNode === "ERP" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
            }`}
          >
            <span className="flex items-center gap-3 mb-2 block">
              <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">database</span>
              </span>
              <span className="text-label-md font-bold uppercase tracking-tighter text-outline-variant text-[10px]">ERP SOURCE</span>
            </span>
            <span className="font-semibold text-on-surface text-body-lg block">Oracle ERP Cloud</span>
            <span className="mt-2 flex items-center justify-between text-[11px] block">
              <span className="text-secondary font-medium">Sync: 12m ago</span>
              <span className="text-error font-medium">94% Quality</span>
            </span>
          </button>

          {/* Source Node 2: Salesforce CRM */}
          <button 
            type="button"
            onClick={() => { setSelectedLineageNode("CRM"); setIsLineageSidebarOpen(true); }}
            className={`absolute left-[20px] top-[290px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 text-left block border-0 cursor-pointer ${
              selectedLineageNode === "CRM" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
            }`}
          >
            <span className="flex items-center gap-3 mb-2 block">
              <span className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">person_book</span>
              </span>
              <span className="text-label-md font-bold uppercase tracking-tighter text-primary text-[10px]">CRM Source</span>
            </span>
            <span className="font-semibold text-on-surface text-body-lg block">Salesforce CRM</span>
            <span className="mt-2 flex items-center justify-between text-[11px] block">
              <span className="text-secondary font-medium">Sync: Live</span>
              <span className="text-tertiary font-medium">98% Quality</span>
            </span>
          </button>

          {/* Source Node 3: MedTech V3 */}
          <button 
            type="button"
            onClick={() => { setSelectedLineageNode("Legacy"); setIsLineageSidebarOpen(true); }}
            className={`absolute left-[20px] top-[460px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 text-left block border-0 cursor-pointer ${
              selectedLineageNode === "Legacy" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
            } ${
              lineageFilter === "high-quality" ? "opacity-25 scale-95 pointer-events-none" : ""
            }`}
          >
            <span className="flex items-center gap-3 mb-2 block">
              <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[20px]">archive</span>
              </span>
              <span className="text-label-md font-bold uppercase tracking-tighter text-outline text-[10px]">Legacy DB</span>
            </span>
            <span className="font-semibold text-on-surface text-body-lg block">Legacy ERP DB</span>
            <span className="mt-2 flex items-center justify-between text-[11px] block">
              <span className="text-outline font-medium">Sync: 24h ago</span>
              <span className="text-error font-medium">62% Quality</span>
            </span>
          </button>

          {/* Processing Column: Validation Engine */}
          <button 
            type="button"
            onClick={() => { setSelectedLineageNode("ValidationEngine"); setIsLineageSidebarOpen(true); }}
            className={`absolute left-[510px] top-[270px] z-10 cursor-pointer transition-all active:scale-95 text-left block border-0 bg-transparent p-0 ${
              selectedLineageNode === "ValidationEngine" ? "ring-4 ring-primary/30 rounded-2xl" : ""
            }`}
          >
            <span className={`bg-primary-container text-on-primary-container p-6 rounded-2xl shadow-xl w-64 border node-pulse block ${
              selectedLineageNode === "ValidationEngine" ? "border-primary" : "border-primary/20 hover:border-primary"
            }`}>
              <span className="flex items-center gap-3 mb-4 block">
                <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                </span>
                <span>
                  <span className="font-bold text-body-lg block">Validation Engine</span>
                  <span className="text-[10px] uppercase opacity-75 block">Rules: 24</span>
                </span>
              </span>
              <span className="space-y-2 block">
                <span className="flex justify-between text-xs block">
                  <span>Matching Logic</span>
                  <span className="font-mono">Fuzzy {fuzzyThreshold / 100}</span>
                </span>
                <span className="h-1 bg-white/20 rounded-full overflow-hidden block">
                  <span className="h-full bg-white block" style={{ width: `${fuzzyThreshold}%` }}></span>
                </span>
                <span className="flex justify-between text-xs mt-3 block">
                  <span>De-duplication</span>
                  <span className="text-secondary-fixed">Complete</span>
                </span>
              </span>
            </span>
          </button>

          {/* Destination Node: Golden Record */}
          <button 
            type="button"
            onClick={() => { setSelectedLineageNode("GoldenRecord"); setIsLineageSidebarOpen(true); }}
            className={`absolute left-[920px] top-[230px] z-10 bg-white p-8 rounded-[32px] shadow-subtle border-4 w-56 flex flex-col items-center text-center transition-transform hover:scale-105 cursor-pointer ${
              selectedLineageNode === "GoldenRecord" ? "border-primary" : "border-outline-variant"
            }`}
          >
            <span className="w-16 h-16 bg-primary-fixed text-primary rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </span>
            <span className="text-label-md font-bold text-primary uppercase mb-1 block">Master Index</span>
            <span className="font-headline-sm text-on-surface leading-tight text-body-lg block">Golden Record #001</span>
            <span className="mt-4 px-4 py-1 bg-surface-container rounded-full text-xs font-semibold text-outline block">
              Status: Published
            </span>
          </button>

        </div>
      </div>

      {/* Sidebar Panel (Details) */}
      {isLineageSidebarOpen && (
        <aside className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-outline-variant flex flex-col h-full overflow-y-auto">
          <div className="p-8 border-b border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Source Metadata</h3>
              <button 
                onClick={() => setIsLineageSidebarOpen(false)}
                className="text-outline hover:text-primary transition-colors cursor-pointer w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">
                    {selectedNodeData.icon}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-body-lg">
                    {selectedNodeData.name}
                  </h4>
                  <span className="text-body-md text-outline text-on-surface-variant text-xs">
                    {selectedNodeData.type}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-outline-variant">
                  <span className="block text-[11px] text-outline uppercase font-bold text-on-surface-variant">Quality Score</span>
                  <span className="text-headline-sm text-primary text-headline-sm font-bold text-center">
                    {selectedNodeData.score}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-outline-variant">
                  <span className="block text-[11px] text-outline uppercase font-bold text-on-surface-variant">Latency</span>
                  <span className="text-headline-sm text-secondary text-headline-sm font-bold text-center">
                    {selectedNodeData.latency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 space-y-8">
            <section>
              <h4 className="text-label-md font-bold text-outline uppercase mb-4 tracking-widest text-on-surface-variant">
                Selected Attributes
              </h4>
              <div className="space-y-4">
                {selectedNodeData.attributes.map((attr) => (
                  <div className="flex items-start justify-between" key={attr.name}>
                    <div>
                      <span className="block font-semibold text-on-surface">{attr.name}</span>
                      <span className="text-xs text-outline text-on-surface-variant">{attr.value}</span>
                    </div>
                    <span className={`material-symbols-outlined text-[18px] ${attr.checked ? "text-primary" : "text-outline"}`}>
                      {attr.checked ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-label-md font-bold text-outline uppercase mb-4 tracking-widest text-on-surface-variant font-semibold">
                Health &amp; Ownership
              </h4>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">update</span>
                  <div>
                    <span className="block text-body-md font-medium text-on-surface">Last Reconciliation</span>
                    <span className="text-xs text-outline text-on-surface-variant">
                      {selectedNodeData.sync}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary">person</span>
                  <div>
                    <span className="block text-body-md font-medium text-on-surface">Data Steward</span>
                    <span className="text-xs text-outline text-on-surface-variant">
                      {selectedNodeData.owner}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Visual Preview */}
            <div className="rounded-2xl overflow-hidden relative h-32 group border border-outline-variant">
              <Image 
                alt="Data visualization analytics" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtsBYPAVmxaby9mk9PGvtEkjV0AcaxsXho7gbATsiSagGwp9Ekr-LDOCDH78csL6rZEPXMJLLvabfa9GjUCzhQ5YCE1EVHS3SF8obKX5iuaVy7NJ5ImxRJ6XstQ593B4kEi2YkgQ4gZSvhCjZKDCQLb5jcsFy2EHpxHOcx2Rsn8I5oBVsH0WZNpyJEuBTUWGddjMx1yYG7NV-F3ZU8A_c85NSWuJBZOLcIcoxynmj76VXrOoFTGmwsNpa1EXCfOGhM7DCBq-z7YH4"
                width={300}
                height={128}
                unoptimized
              />
              <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors"></div>
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-primary uppercase">
                Trend Report
              </div>
            </div>
          </div>

          <div className="p-8 bg-surface-container-low border-t border-outline-variant">
            <button 
              onClick={() => { fetchAuditLogs(); setShowAuditTrailModal(true); }}
              className="w-full py-4 bg-white border border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors text-label-md cursor-pointer font-semibold"
            >
              <span className="material-symbols-outlined">history</span>{" "}
              View Full Audit Trail
            </button>
          </div>
        </aside>
      )}

      {/* Audit Trail Modal */}
      {showAuditTrailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30">
            <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Data Stewardship Audit Trail</h3>
                <p className="text-label-md text-on-surface-variant">Historical logs of all master data changes, merges, and system events.</p>
              </div>
              <button 
                onClick={() => setShowAuditTrailModal(false)}
                className="text-outline hover:text-primary transition-colors cursor-pointer w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-outline animate-spin">progress_activity</span>
                  <p className="mt-2 text-body-md">Retrieving audit logs...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const actionClass = getAuditLogActionClasses(log.action);
                    return (
                      <div key={log.id} className="p-4 bg-white border border-outline-variant/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/20 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${actionClass}`}>
                              {log.action}
                            </span>
                            <span className="text-[11px] text-outline font-medium text-on-surface-variant">by {log.actor}</span>
                          </div>
                          <p className="text-body-md text-on-surface mt-2 font-medium leading-relaxed">{log.details}</p>
                        </div>
                        <span className="text-xs text-outline whitespace-nowrap self-end sm:self-auto font-medium text-on-surface-variant">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container-lowest flex justify-end">
              <button 
                onClick={() => setShowAuditTrailModal(false)}
                className="px-6 py-2 bg-primary text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
