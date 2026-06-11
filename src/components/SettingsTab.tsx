"use client";

import React from "react";
import { useDashboard, SettingsMessageType } from "../context/DashboardContext";

const getAlertStyle = (type: SettingsMessageType) => {
  switch (type) {
    case "success":
      return {
        classes: "bg-tertiary-container/30 text-tertiary border-tertiary/20",
        icon: "check_circle"
      };
    case "error":
      return {
        classes: "bg-error-container/30 text-error border-error/20",
        icon: "error_outline"
      };
    default:
      return {
        classes: "bg-surface-container text-on-surface-variant border-outline-variant/30",
        icon: "info"
      };
  }
};

export const SettingsTab: React.FC = () => {
  const {
    fuzzyThreshold,
    setFuzzyThreshold,
    qualityThreshold,
    setQualityThreshold,
    autoMerge,
    setAutoMerge,
    redisTtl,
    setRedisTtl,
    activeSettingsSubTab,
    setActiveSettingsSubTab,
    isSavingSettings,
    settingsMessage,
    settingsMessageType,
    handleSaveSettings,
    handleDiscardSettings,
    handlePurgeCache,
    setSettingsMessage,
  } = useDashboard();

  const alertStyle = getAlertStyle(settingsMessageType);

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto space-y-8">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">
            System Settings
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Configure Precision MDM engine, matching rules, and integrations.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDiscardSettings}
            className="px-6 py-2.5 bg-surface-container text-on-surface font-semibold rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Discard Changes
          </button>
          <button 
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="px-6 py-2.5 bg-primary text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {isSavingSettings ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </section>

      {settingsMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-fadeIn ${alertStyle.classes}`}>
          <span className="material-symbols-outlined">
            {alertStyle.icon}
          </span>
          <p className="font-semibold text-body-md">{settingsMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Menu */}
        <div className="col-span-1 space-y-2">
          <button 
            onClick={() => { setActiveSettingsSubTab("matching"); setSettingsMessage(""); }}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors cursor-pointer ${activeSettingsSubTab === "matching" ? "bg-primary-fixed text-on-primary-fixed border border-primary/20" : "hover:bg-surface-container text-on-surface-variant font-medium"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeSettingsSubTab === "matching" ? "'FILL' 1" : "'FILL' 0" }}>tune</span>{" "}
            Matching Engine
          </button>
          <button 
            onClick={() => { setActiveSettingsSubTab("sources"); setSettingsMessage(""); }}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors cursor-pointer ${activeSettingsSubTab === "sources" ? "bg-primary-fixed text-on-primary-fixed border border-primary/20" : "hover:bg-surface-container text-on-surface-variant font-medium"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeSettingsSubTab === "sources" ? "'FILL' 1" : "'FILL' 0" }}>data_object</span>{" "}
            Data Sources &amp; APIs
          </button>
          <button 
            onClick={() => { setActiveSettingsSubTab("security"); setSettingsMessage(""); }}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors cursor-pointer ${activeSettingsSubTab === "security" ? "bg-primary-fixed text-on-primary-fixed border border-primary/20" : "hover:bg-surface-container text-on-surface-variant font-medium"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeSettingsSubTab === "security" ? "'FILL' 1" : "'FILL' 0" }}>security</span>{" "}
            Security &amp; Roles
          </button>
          <button 
            onClick={() => { setActiveSettingsSubTab("alerts"); setSettingsMessage(""); }}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors cursor-pointer ${activeSettingsSubTab === "alerts" ? "bg-primary-fixed text-on-primary-fixed border border-primary/20" : "hover:bg-surface-container text-on-surface-variant font-medium"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeSettingsSubTab === "alerts" ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>{" "}
            Alerts &amp; Webhooks
          </button>
        </div>

        {/* Right Col: Settings Form */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {activeSettingsSubTab === "matching" && (
            <>
              {/* Matching Engine Settings */}
              <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Data Matching &amp; Deduplication</h3>
                  <p className="text-label-md text-on-surface-variant">Configure how the MDM engine identifies duplicate records.</p>
                </div>
                <div className="p-6 space-y-8">
                  {/* Similarity Threshold */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="max-w-[70%]">
                        <label htmlFor="fuzzy-threshold" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                          Fuzzy Match Similarity Threshold
                        </label>
                        <span className="text-label-md text-on-surface-variant">Records with similarity above this % will be flagged as duplicates.</span>
                      </div>
                      <span className="text-primary font-bold text-headline-sm bg-primary-fixed px-3 py-1 rounded-lg">{fuzzyThreshold}%</span>
                    </div>
                    <input 
                      id="fuzzy-threshold"
                      type="range" 
                      min="50" 
                      max="100" 
                      value={fuzzyThreshold} 
                      onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-surface-container rounded-lg appearance-none cursor-pointer" 
                    />
                    <div className="flex justify-between text-xs text-outline mt-2 font-medium">
                      <span>Loose (50%)</span>
                      <span>Strict (100%)</span>
                    </div>
                  </div>

                  {/* Quality Threshold */}
                  <div className="pt-6 border-t border-surface-container">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <label htmlFor="quality-threshold" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                          Golden Record Quality Minimum
                        </label>
                        <span className="text-label-md text-on-surface-variant">Minimum data health score required to promote a record to Golden status.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          id="quality-threshold"
                          type="number" 
                          value={qualityThreshold} 
                          onChange={(e) => setQualityThreshold(Math.max(0, Math.min(100, Number(e.target.value))))}
                          className="w-20 px-3 py-2 border border-outline-variant rounded-xl text-center font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-none" 
                        />
                        <span className="text-on-surface-variant font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Merge Toggle */}
                  <div className="pt-6 border-t border-surface-container flex items-center justify-between">
                    <div>
                      <label htmlFor="auto-merge" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                        Auto-Merge High Confidence Duplicates
                      </label>
                      <span className="text-label-md text-on-surface-variant">Automatically merge records with &gt;95% similarity score without manual review.</span>
                    </div>
                    <span className="relative inline-flex items-center cursor-pointer">
                      <input 
                        id="auto-merge"
                        type="checkbox" 
                        checked={autoMerge} 
                        onChange={(e) => setAutoMerge(e.target.checked)}
                        className="sr-only peer" 
                        aria-label="Toggle Auto-Merge"
                      />
                      <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </span>
                  </div>
                </div>
              </div>

              {/* System Performance Settings */}
              <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Caching &amp; Performance</h3>
                  <p className="text-label-md text-on-surface-variant">Manage Redis cache layers and query performance.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <label htmlFor="redis-ttl" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                        Redis Cache TTL (Seconds)
                      </label>
                      <span className="text-label-md text-on-surface-variant">Time-to-live for master index API responses.</span>
                    </div>
                    <input 
                      id="redis-ttl"
                      type="number" 
                      value={redisTtl} 
                      onChange={(e) => setRedisTtl(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-3 py-2 border border-outline-variant rounded-xl text-center font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-none" 
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-surface-container flex justify-between items-center">
                    <div>
                      <span className="text-body-lg font-semibold text-on-surface block">Clear Application Cache</span>
                      <span className="text-label-md text-on-surface-variant">Force refresh of all materialized views and Redis caches.</span>
                    </div>
                    <button 
                      onClick={handlePurgeCache}
                      className="px-4 py-2 border border-error text-error font-semibold rounded-lg hover:bg-error-container transition-colors cursor-pointer"
                    >
                      Purge Cache
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSettingsSubTab === "sources" && (
            <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-subtle overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Enterprise Data Sources</h3>
                <p className="text-label-md text-on-surface-variant">Monitor and toggle data synchronization pipes across systems.</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { id: "src-crm", name: "CRM API (JSONPlaceholder)", type: "REST API", status: "Active", sync: "Every 5 mins", count: "10 records" },
                    { id: "src-erp", name: "ERP API (DummyJSON)", type: "REST API", status: "Active", sync: "Every 15 mins", count: "10 records" },
                    { id: "src-csv", name: "CSV Ingestion Service", type: "File Store", status: "Active", sync: "Manual/Triggered", count: "Bulk Import" },
                    { id: "src-manual", name: "Manual Ingest Terminal", type: "DB Console", status: "Active", sync: "Real-time", count: "Ad-hoc" }
                  ].map((src) => (
                    <div key={src.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl gap-4 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-lg">database</span>
                        <div>
                          <h4 className="font-semibold text-body-lg text-on-surface">{src.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                            <span>{src.type}</span>
                            <span>•</span>
                            <span>{src.sync}</span>
                            <span>•</span>
                            <span className="font-medium text-primary">{src.count}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-container text-tertiary border border-tertiary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                          {src.status}
                        </span>
                        <span className="relative inline-flex items-center cursor-pointer">
                          <input 
                            id={src.id} 
                            type="checkbox" 
                            className="sr-only peer" 
                            defaultChecked 
                            aria-label={`Toggle Sync for ${src.name}`}
                          />
                          <div className="w-9 h-5 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSettingsSubTab === "security" && (
            <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-subtle overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Security &amp; Steward Roles</h3>
                <p className="text-label-md text-on-surface-variant">Configure data masking, stewardship permissions, and RLS.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="rls-enable" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                      Row-Level Security (RLS)
                    </label>
                    <span className="text-label-md text-on-surface-variant">Enforce tenant isolation and domain-based access controls.</span>
                  </div>
                  <span className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="rls-enable" 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked 
                      aria-label="Toggle Row-Level Security"
                    />
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </span>
                </div>

                <div className="pt-6 border-t border-surface-container flex items-center justify-between">
                  <div>
                    <label htmlFor="pii-masking" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                      PII Data Masking
                    </label>
                    <span className="text-label-md text-on-surface-variant">Automatically mask sensitive fields (e.g. email, values) for non-administrators.</span>
                  </div>
                  <span className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="pii-masking" 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked 
                      aria-label="Toggle PII Data Masking"
                    />
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </span>
                </div>

                <div className="pt-6 border-t border-surface-container">
                  <label htmlFor="token-expiration" className="text-body-lg font-semibold text-on-surface block mb-2 cursor-pointer">
                    API Security Token Expiration
                  </label>
                  <p className="text-label-md text-on-surface-variant mb-4">Duration after which generated master data integration JWT tokens expire.</p>
                  <div className="flex items-center gap-3">
                    <select id="token-expiration" defaultValue="24" className="px-4 py-2 bg-white border border-outline-variant rounded-xl font-semibold text-on-surface focus:ring-2 focus:ring-primary focus:outline-none outline-none">
                      <option value="1">1 Hour</option>
                      <option value="8">8 Hours</option>
                      <option value="24">24 Hours</option>
                      <option value="168">7 Days</option>
                      <option value="0">Never Expire</option>
                    </select>
                    <button className="px-4 py-2 bg-primary-fixed text-on-primary-fixed font-bold rounded-xl border border-primary/20 hover:bg-primary-fixed-dim transition-colors text-label-md flex items-center gap-1.5 cursor-pointer">
                      <span className="material-symbols-outlined text-sm">key</span>{" "}
                      Rotate Master Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSettingsSubTab === "alerts" && (
            <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-subtle overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Alerts, Webhooks &amp; Events</h3>
                <p className="text-label-md text-on-surface-variant">Configure external channels to notify on schema drift or high-confidence duplicates.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label htmlFor="steward-webhook" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                    Outgoing Steward Webhook
                  </label>
                  <p className="text-label-md text-on-surface-variant">Post JSON payloads on data stewardship duplicates scan completion.</p>
                  <div className="flex gap-2">
                    <input id="steward-webhook" type="text" placeholder="https://api.enterprise.com/webhooks/mdm" className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none outline-none" />
                    <button className="px-4 py-2 border border-primary text-primary font-bold rounded-xl hover:bg-primary-fixed transition-colors text-label-md cursor-pointer">Test</button>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-container flex items-center justify-between">
                  <div>
                    <label htmlFor="pipeline-failure-email" className="text-body-lg font-semibold text-on-surface block cursor-pointer">
                      Email Alerts on Pipeline Failure
                    </label>
                    <span className="text-label-md text-on-surface-variant">Notify active data stewards if an ETL batch run fails.</span>
                  </div>
                  <span className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="pipeline-failure-email" 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked 
                      aria-label="Toggle Email Alerts on Pipeline Failure"
                    />
                    <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </span>
                </div>

                <div className="pt-6 border-t border-surface-container flex items-center justify-between">
                  <div>
                    <span className="text-body-lg font-semibold text-on-surface block">Slack Integration</span>
                    <span className="text-label-md text-on-surface-variant">Send daily data quality metrics logs to selected slack channels.</span>
                  </div>
                  <button className="px-4 py-2 bg-surface-container text-on-surface font-semibold rounded-xl hover:bg-surface-container-high transition-colors text-label-md flex items-center gap-1.5 cursor-pointer">
                    Connect Slack
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
