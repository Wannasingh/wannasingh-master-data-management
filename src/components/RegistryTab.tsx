"use client";

import React, { useRef, useState } from "react";
import { useDashboard, MasterDataRecord } from "../context/DashboardContext";

const filterByCategory = (row: MasterDataRecord, category: string): boolean => {
  return category === "All" || row.category === category;
};

const filterByFacility = (row: MasterDataRecord, facility: string): boolean => {
  if (facility === "All Facilities") return true;
  
  const isSalesforce = row.source_system === "Salesforce CRM" || row.source_system === "CRM API (JSONPlaceholder)";
  const isErp = row.source_system === "ERP System" || row.source_system === "ERP API (DummyJSON)";
  const isSap = row.source_system === "SAP ERP";
  const isCsv = row.source_system === "CSV Ingestion";

  switch (facility) {
    case "Northwestern Memorial":
    case "Salesforce CRM":
      return isSalesforce;
    case "Lurie Children's":
    case "ERP System":
      return isErp;
    case "Rush University":
    case "SAP ERP":
      return isSap;
    case "CSV Ingestion":
      return isCsv;
    default:
      return true;
  }
};

const filterByStatus = (row: MasterDataRecord, status: string): boolean => {
  if (status === "Status: All") return true;
  if (status === "Verified") {
    return row.status === "Golden" || row.status === "Validated" || !row.status;
  }
  if (status === "Review") {
    return row.status === "Duplicate" || row.status === "Pending Merge" || row.status === "Review";
  }
  if (status === "Archived") {
    return row.status === "Archived";
  }
  return true;
};

const getQualityScoreClasses = (score: number) => {
  if (score >= 90) return "bg-tertiary/10 text-tertiary";
  if (score >= 70) return "bg-secondary/10 text-secondary";
  return "bg-error/10 text-error";
};

export const RegistryTab: React.FC = () => {
  const {
    data,
    isLoading,
    message,
    isScanning,
    mergeMessage,
    duplicateCandidates,
    smartFacility,
    setSmartFacility,
    smartStatus,
    setSmartStatus,
    selectedCategory,
    setSelectedCategory,
    scanDuplicates,
    handleMerge,
    handleExternalIngest,
    downloadSampleCSV,
    handleUpload,
  } = useDashboard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Computations
  const avgQuality = data.length > 0 
    ? Math.round(data.reduce((acc, row) => acc + (row.data_quality_score || 100), 0) / data.length) 
    : 89;

  const duplicateCount = data.filter(r => r.status === "Duplicate").length;

  const filteredData = data.filter(row => 
    filterByCategory(row, selectedCategory) &&
    filterByFacility(row, smartFacility) &&
    filterByStatus(row, smartStatus)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLocalFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLocalUpload = async () => {
    if (localFile) {
      await handleUpload(localFile);
      setLocalFile(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Master Data Registry Header & Action Buttons */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1" data-testid="registry-title">
            Master Data Registry
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Centralized repository for all verified enterprise master data records across domains.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-surface-container text-on-surface font-semibold rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">upload</span>{" "}
            Import
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-semibold rounded-full hover:shadow-lg transition-all active:scale-95 duration-200 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">add</span>{" "}
            Add New Record
          </button>
        </div>
      </section>

      {/* Filters & Stats Bento Row */}
      <div className="grid grid-cols-12 gap-card-gap">
        {/* Quick Stats */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest glass-card rounded-2xl p-6 shadow-subtle flex items-center justify-between flex-wrap gap-4 border border-outline-variant/30">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
              <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Total Records</span>
            </div>
            <span className="font-stat-value text-stat-value text-on-surface">{data.length.toLocaleString()}</span>
            <span className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> +3.2%
            </span>
          </div>
          <div className="h-12 w-px bg-outline-variant hidden sm:block"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Verified Records</span>
            </div>
            <span className="font-stat-value text-stat-value text-on-surface">
              {data.filter(r => r.status === "Golden" || r.status === "Validated" || !r.status).length.toLocaleString()}
            </span>
            <span className="text-sm text-on-surface-variant font-medium mt-1">
              {data.length > 0 
                ? `${((data.filter(r => r.status === "Golden" || r.status === "Validated" || !r.status).length / data.length) * 100).toFixed(1)}%` 
                : "88.8%"} Coverage
            </span>
          </div>
          <div className="h-12 w-px bg-outline-variant hidden sm:block"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
              <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Pending Review</span>
            </div>
            <span className="font-stat-value text-stat-value text-on-surface">{duplicateCount.toLocaleString()}</span>
            <span className="text-sm text-error font-medium flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm">warning</span> {duplicateCount > 0 ? "Action Required" : "System Clear"}
            </span>
          </div>
          <div className="h-12 w-px bg-outline-variant hidden sm:block"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
              <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Avg Quality</span>
            </div>
            <span className="font-stat-value text-stat-value text-on-surface">{avgQuality}%</span>
            <span className="text-sm text-on-surface-variant font-medium mt-1">Quality Index</span>
          </div>
        </div>

        {/* Filters Card */}
        <div className="col-span-12 lg:col-span-4 bg-primary-container/10 border border-primary/10 rounded-2xl p-6 flex flex-col justify-between">
          <h3 className="text-headline-sm font-semibold text-primary mb-4">Smart Filters</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="facility-filter" className="sr-only">Filter by Domain/Facility</label>
              <select 
                id="facility-filter"
                value={smartFacility}
                onChange={(e) => setSmartFacility(e.target.value)}
                className="bg-white border-none rounded-xl text-body-md font-medium text-on-surface-variant shadow-sm focus:ring-2 focus:ring-primary/20 p-2 outline-none w-full"
              >
                <option>All Facilities</option>
                <option>Northwestern Memorial</option>
                <option>Lurie Children&apos;s</option>
                <option>Rush University</option>
                <option>Salesforce CRM</option>
                <option>ERP System</option>
                <option>SAP ERP</option>
                <option>CSV Ingestion</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="status-filter" className="sr-only">Filter by Status</label>
              <select 
                id="status-filter"
                value={smartStatus}
                onChange={(e) => setSmartStatus(e.target.value)}
                className="bg-white border-none rounded-xl text-body-md font-medium text-on-surface-variant shadow-sm focus:ring-2 focus:ring-primary/20 p-2 outline-none w-full"
              >
                <option>Status: All</option>
                <option>Verified</option>
                <option>Review</option>
                <option>Archived</option>
              </select>
            </div>
          </div>
          <button className="mt-4 text-primary text-body-md font-bold flex items-center gap-2 hover:underline text-left cursor-pointer">
            <span className="material-symbols-outlined">tune</span>{" "}
            Advanced Search Options
          </button>
        </div>
      </div>

      {/* Bento Grid: Ingest + Harmonized Records */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* ETL Pipeline Intake & APIs */}
        <div className="col-span-12 lg:col-span-5 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col justify-between">
          <div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
              ETL Pipeline Intake
            </h4>
            <p className="text-body-md text-on-surface-variant mb-6">
              Upload enterprise data to trigger standardization and ingestion pipeline.
            </p>

            <label htmlFor="csv-file-upload" className="sr-only">Choose CSV file</label>
            <input
              id="csv-file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              data-testid="file-upload"
            />

            <button
              type="button"
              onClick={handleUploadClick}
              className="w-full border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low hover:bg-primary-fixed/20 transition-all duration-200 flex flex-col items-center justify-center py-8 px-4 cursor-pointer group mb-6 min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center mb-3 transition-colors text-primary">
                <span className="material-symbols-outlined text-2xl">
                  cloud_upload
                </span>
              </div>
              <h5 className="font-headline-sm text-sm text-on-surface mb-1 text-center font-semibold">
                {localFile ? localFile.name : "Upload CSV File"}
              </h5>
              <p className="text-[11px] text-on-surface-variant text-center max-w-xs">
                Drag and drop CSV files here, or{" "}
                <span className="text-primary font-bold hover:underline">browse</span>. Max 500MB.
              </p>
            </button>

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleLocalUpload}
                disabled={isLoading || !localFile}
                className="px-6 py-3 bg-primary text-white rounded-full font-semibold text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-md cursor-pointer"
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

          {/* External Ingestion APIs */}
          <div className="border-t border-outline-variant/30 mt-6 pt-6">
            <h5 className="font-headline-sm text-sm text-on-surface mb-2 font-semibold">
              External API Ingestion
            </h5>
            <p className="text-body-md text-on-surface-variant mb-4">
              Ingest master data directly from active cloud service APIs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleExternalIngest("customers")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-full text-label-md font-bold hover:bg-on-secondary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">cloud_sync</span>{" "}
                Ingest CRM (Customers)
              </button>
              <button
                onClick={() => handleExternalIngest("products")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-tertiary text-white rounded-full text-label-md font-bold hover:bg-on-tertiary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">cloud_sync</span>{" "}
                Ingest ERP (Products)
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-center">
              <button
                onClick={downloadSampleCSV}
                className="flex items-center gap-2 text-primary font-bold text-label-md hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>{" "}
                Download Sample CSV Template
              </button>
            </div>
          </div>
        </div>

        {/* Harmonized Records Table */}
        <div className="col-span-12 lg:col-span-7 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">
                Harmonized Records
              </h4>
              <p className="text-body-md text-on-surface-variant font-medium">
                Standardized enterprise master data entities
              </p>
            </div>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-md font-bold">
              {filteredData.length} records
            </span>
          </div>

          {/* Category Filter Switcher */}
          <div className="flex gap-2 mb-4 flex-wrap border-b border-outline-variant/30 pb-3">
            {["All", "Customers", "Products", "Suppliers"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-label-md font-bold transition-all duration-200 cursor-pointer ${selectedCategory === cat ? 'bg-primary text-white shadow-sm' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
              >
                {cat} ({cat === "All" ? data.length : data.filter(r => r.category === cat).length})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto flex-1 max-h-[400px]">
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
                  <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                    Source
                  </th>
                  <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface divide-y divide-outline-variant/30">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-on-surface-variant"
                      colSpan={6}
                    >
                      No records found. Ingest external APIs or upload CSV.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-primary">
                        {row.id ? `REC-${row.id}` : `REC-${index}`}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {row.name}
                        {row.status === "Duplicate" && (
                          <span className="ml-2 px-1.5 py-0.2 bg-error-container text-on-error-container rounded font-bold uppercase text-[8px]">
                            Duplicate
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-[11px] font-bold">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-medium">
                        {row.source_system || "Manual Entry"}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${getQualityScoreClasses(row.data_quality_score || 100)}`}>
                          {row.data_quality_score || 100}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-tertiary">
                        {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MDM Data Stewardship & Deduplication */}
      <section className="grid grid-cols-12 gap-gutter mt-8">
        <div className="col-span-12 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">
                Data Stewardship & Deduplication
              </h4>
              <p className="text-body-md text-on-surface-variant font-medium">
                Identify near-duplicate entities and merge them into Golden Records
              </p>
            </div>
            <button
              onClick={scanDuplicates}
              disabled={isScanning}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-label-md font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm animate-spin" style={{ display: isScanning ? 'inline-block' : 'none' }}>sync</span>
              <span className="material-symbols-outlined text-sm" style={{ display: isScanning ? 'none' : 'inline-block' }}>troubleshoot</span>
              {isScanning ? "Scanning..." : "Scan for Duplicates"}
            </button>
          </div>

          {mergeMessage && (
            <div className={`p-4 mb-4 rounded-xl text-body-md font-semibold ${mergeMessage.includes("successfully") ? "bg-tertiary/10 text-tertiary" : "bg-error/10 text-error"}`}>
              {mergeMessage}
            </div>
          )}

          <div className="overflow-x-auto">
            {duplicateCandidates.length === 0 ? (
              <div className="text-center py-8 bg-surface-container-low/30 rounded-xl border border-outline-variant/30 text-on-surface-variant text-body-md">
                No duplicates found. Click &quot;Scan for Duplicates&quot; to check again.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Primary Record</th>
                    <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Duplicate Candidate</th>
                    <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider text-center">Match Strength</th>
                    <th className="py-3 px-4 text-label-md text-on-surface-variant font-bold uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-body-md text-on-surface divide-y divide-outline-variant/30">
                  {duplicateCandidates.map((dup) => (
                    <tr key={`${dup.id1}-${dup.id2}`} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-[11px] font-bold">
                          {dup.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <span className="font-semibold text-primary">REC-{dup.id1}</span>: {dup.name1}
                        <div className="text-[10px] text-on-surface-variant">{dup.source1} • Quality: {dup.quality1}%</div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <span className="font-semibold text-error">REC-{dup.id2}</span>: {dup.name2}
                        <div className="text-[10px] text-on-surface-variant">{dup.source2} • Quality: {dup.quality2}%</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`px-3 py-1 rounded-full text-label-md ${dup.similarity > 90 ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
                          {dup.similarity}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleMerge(dup.id1, dup.id2)}
                          className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full text-label-md font-bold transition-all cursor-pointer"
                        >
                          Consolidate & Merge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
