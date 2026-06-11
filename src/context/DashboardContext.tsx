"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

export type SettingsSubTab = "matching" | "sources" | "security" | "alerts";
export type SettingsMessageType = "success" | "error" | "info";
export type LineageNode = "ERP" | "CRM" | "Legacy" | "GoldenRecord" | "ValidationEngine";

export interface MasterDataRecord {
  id?: string | number;
  name: string;
  category: string;
  value: number;
  source_system?: string;
  status?: string;
  data_quality_score?: number;
}

export interface DuplicateCandidate {
  id1: number;
  name1: string;
  source1: string;
  quality1: number;
  status1: string;
  id2: number;
  name2: string;
  source2: string;
  quality2: number;
  status2: string;
  category: string;
  similarity: number;
}

export interface SystemSettingsData {
  fuzzy_threshold: number;
  golden_quality_threshold: number;
  auto_merge: boolean;
  redis_cache_ttl: number;
}

export interface AuditLogData {
  id: number;
  action: string;
  details: string;
  actor: string;
  created_at: string;
}

export const lineageNodeData = {
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

interface DashboardContextType {
  data: MasterDataRecord[];
  setData: React.Dispatch<React.SetStateAction<MasterDataRecord[]>>;
  duplicateCandidates: DuplicateCandidate[];
  setDuplicateCandidates: React.Dispatch<React.SetStateAction<DuplicateCandidate[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  userRole: string;
  setUserRole: React.Dispatch<React.SetStateAction<string>>;
  isVerifyingSession: boolean;
  setIsVerifyingSession: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isScanning: boolean;
  setIsScanning: React.Dispatch<React.SetStateAction<boolean>>;
  mergeMessage: string;
  setMergeMessage: React.Dispatch<React.SetStateAction<string>>;
  smartFacility: string;
  setSmartFacility: React.Dispatch<React.SetStateAction<string>>;
  smartStatus: string;
  setSmartStatus: React.Dispatch<React.SetStateAction<string>>;

  // Settings tab states
  fuzzyThreshold: number;
  setFuzzyThreshold: React.Dispatch<React.SetStateAction<number>>;
  qualityThreshold: number;
  setQualityThreshold: React.Dispatch<React.SetStateAction<number>>;
  autoMerge: boolean;
  setAutoMerge: React.Dispatch<React.SetStateAction<boolean>>;
  redisTtl: number;
  setRedisTtl: React.Dispatch<React.SetStateAction<number>>;
  activeSettingsSubTab: SettingsSubTab;
  setActiveSettingsSubTab: React.Dispatch<React.SetStateAction<SettingsSubTab>>;
  isSavingSettings: boolean;
  setIsSavingSettings: React.Dispatch<React.SetStateAction<boolean>>;
  dbSettings: SystemSettingsData | null;
  setDbSettings: React.Dispatch<React.SetStateAction<SystemSettingsData | null>>;
  settingsMessage: string;
  setSettingsMessage: React.Dispatch<React.SetStateAction<string>>;
  settingsMessageType: SettingsMessageType;
  setSettingsMessageType: React.Dispatch<React.SetStateAction<SettingsMessageType>>;

  // Compliance states
  gdprActive: boolean;
  setGdprActive: React.Dispatch<React.SetStateAction<boolean>>;
  ccpaActive: boolean;
  setCcpaActive: React.Dispatch<React.SetStateAction<boolean>>;
  internalQualityActive: boolean;
  setInternalQualityActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Lineage states
  selectedLineageNode: LineageNode;
  setSelectedLineageNode: React.Dispatch<React.SetStateAction<LineageNode>>;
  isLineageSidebarOpen: boolean;
  setIsLineageSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lineageFilter: "all" | "high-quality";
  setLineageFilter: React.Dispatch<React.SetStateAction<"all" | "high-quality">>;
  showAuditTrailModal: boolean;
  setShowAuditTrailModal: React.Dispatch<React.SetStateAction<boolean>>;
  auditLogs: AuditLogData[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogData[]>>;

  // Operations
  fetchMasterData: () => Promise<void>;
  scanDuplicates: () => Promise<void>;
  fetchSystemSettings: () => Promise<void>;
  handleSaveSettings: () => Promise<void>;
  handleDiscardSettings: () => void;
  handlePurgeCache: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  handleExportMap: () => void;
  handleMerge: (primaryId: number, duplicateId: number) => Promise<void>;
  handleExternalIngest: (domain: string) => Promise<void>;
  downloadSampleCSV: () => void;
  handleLogout: () => Promise<void>;
  handleUpload: (file: File) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [data, setData] = useState<MasterDataRecord[]>([]);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("Dr. Sarah Chen");
  const [userRole, setUserRole] = useState("System Administrator");
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [mergeMessage, setMergeMessage] = useState("");
  const [smartFacility, setSmartFacility] = useState("All Facilities");
  const [smartStatus, setSmartStatus] = useState("Status: All");

  // System Settings States
  const [fuzzyThreshold, setFuzzyThreshold] = useState<number>(75);
  const [qualityThreshold, setQualityThreshold] = useState<number>(80);
  const [autoMerge, setAutoMerge] = useState<boolean>(true);
  const [redisTtl, setRedisTtl] = useState<number>(60);
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<"matching" | "sources" | "security" | "alerts">("matching");
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [dbSettings, setDbSettings] = useState<SystemSettingsData | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string>("");
  const [settingsMessageType, setSettingsMessageType] = useState<"success" | "error" | "info">("success");

  // Compliance States
  const [gdprActive, setGdprActive] = useState(true);
  const [ccpaActive, setCcpaActive] = useState(true);
  const [internalQualityActive, setInternalQualityActive] = useState(false);

  // Lineage States
  const [selectedLineageNode, setSelectedLineageNode] = useState<"ERP" | "CRM" | "Legacy" | "GoldenRecord" | "ValidationEngine">("CRM");
  const [isLineageSidebarOpen, setIsLineageSidebarOpen] = useState<boolean>(true);
  const [lineageFilter, setLineageFilter] = useState<"all" | "high-quality">("all");
  const [showAuditTrailModal, setShowAuditTrailModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch("/api/master-data");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
  }, []);

  const scanDuplicates = useCallback(async () => {
    setIsScanning(true);
    setMergeMessage("");
    try {
      const res = await fetch("/api/deduplicate");
      if (res.ok) {
        const json = await res.json();
        setDuplicateCandidates(json);
      }
    } catch (err) {
      console.error("Failed to scan duplicates", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const settingsData = await res.json();
        setDbSettings(settingsData);
        setFuzzyThreshold(settingsData.fuzzy_threshold ?? 75);
        setQualityThreshold(settingsData.golden_quality_threshold ?? 80);
        setAutoMerge(settingsData.auto_merge ?? true);
        setRedisTtl(settingsData.redis_cache_ttl ?? 60);
      }
    } catch (err) {
      console.error("Failed to fetch system settings", err);
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fuzzy_threshold: fuzzyThreshold,
          golden_quality_threshold: qualityThreshold,
          auto_merge: autoMerge,
          redis_cache_ttl: redisTtl,
        }),
      });

      if (res.ok) {
        setSettingsMessageType("success");
        setSettingsMessage("Configuration saved successfully.");
        await fetchSystemSettings();
      } else {
        const errorData = await res.json();
        setSettingsMessageType("error");
        setSettingsMessage(`Error saving settings: ${errorData.detail || "unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      setSettingsMessageType("error");
      setSettingsMessage("Failed to save system settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }, [fuzzyThreshold, qualityThreshold, autoMerge, redisTtl, fetchSystemSettings]);

  const handleDiscardSettings = useCallback(() => {
    if (dbSettings) {
      setFuzzyThreshold(dbSettings.fuzzy_threshold ?? 75);
      setQualityThreshold(dbSettings.golden_quality_threshold ?? 80);
      setAutoMerge(dbSettings.auto_merge ?? true);
      setRedisTtl(dbSettings.redis_cache_ttl ?? 60);
      setSettingsMessageType("info");
      setSettingsMessage("Changes discarded. Values reset to saved state.");
    } else {
      setFuzzyThreshold(75);
      setQualityThreshold(80);
      setAutoMerge(true);
      setRedisTtl(60);
      setSettingsMessageType("info");
      setSettingsMessage("Settings reset to system defaults.");
    }
  }, [dbSettings]);

  const handlePurgeCache = useCallback(async () => {
    setSettingsMessage("");
    try {
      const res = await fetch("/api/cache/purge", {
        method: "POST",
      });
      if (res.ok) {
        setSettingsMessageType("success");
        setSettingsMessage("Caching layers purged successfully.");
      } else {
        setSettingsMessageType("error");
        setSettingsMessage("Failed to purge Redis cache.");
      }
    } catch (err) {
      console.error("Failed to purge cache", err);
      setSettingsMessageType("error");
      setSettingsMessage("Failed to connect to cache purge service.");
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    }
  }, []);

  const handleExportMap = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lineageNodeData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "mdm_lineage_metadata.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, []);

  const handleMerge = useCallback(async (primaryId: number, duplicateId: number) => {
    try {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primary_id: primaryId,
          duplicate_id: duplicateId,
        }),
      });
      if (res.ok) {
        setMergeMessage("Merge completed successfully!");
        fetchMasterData(); // Refresh data
        scanDuplicates(); // Re-scan
      } else {
        const err = await res.json();
        setMergeMessage(err.detail || "Merge failed");
      }
    } catch (err) {
      console.error("Failed to merge records", err);
      setMergeMessage("Error during merge");
    }
  }, [fetchMasterData, scanDuplicates]);

  const handleExternalIngest = useCallback(async (domain: string) => {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/ingest-external?domain=${domain}`, {
        method: "POST",
      });
      const result = await res.json();
      if (res.ok) {
        setMessage(result.message || "Ingestion successful");
        fetchMasterData(); // Refresh data
        scanDuplicates(); // Auto scan for duplicates
      } else {
        setMessage(result.detail || "Ingestion failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred during external ingestion.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchMasterData, scanDuplicates]);

  const downloadSampleCSV = useCallback(() => {
    const csvContent = "data:text/csv;charset=utf-8,name,category,value\nAlice Smith,Customers,75000\nBob Johnson,Customers,80000\nBobb Johnson,Customers,80000\nMacBook Pro M3,Products,1999\nLogitech Mouse,Products,79\nGlobal Logistics,Suppliers,150000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mdm_sample_data.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Logout API call failed", err);
    } finally {
      localStorage.removeItem("sb-session");
      router.push("/login");
    }
  }, [router]);

  const handleUpload = useCallback(async (fileToUpload: File) => {
    setIsLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const response = await fetch("/api/upload-etl", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Upload successful");
        fetchMasterData(); // Refresh data
        scanDuplicates(); // Auto scan for duplicates
      } else {
        setMessage(result.detail || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      setMessage("An error occurred during upload.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchMasterData, scanDuplicates]);

  useEffect(() => {
    const checkSession = async () => {
      const sessionStr = localStorage.getItem("sb-session");
      if (!sessionStr) {
        router.push("/login");
        return;
      }

      try {
        const session = JSON.parse(sessionStr);
        const token = session.access_token;
        if (!token) {
          localStorage.removeItem("sb-session");
          router.push("/login");
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          const meta = userData.user?.user_metadata || {};
          setUserName(meta.full_name || userData.user?.email || "User");

          const rawRole = meta.role || "auditor";
          const formattedRole = rawRole
            .split("_")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          setUserRole(formattedRole);

          setIsVerifyingSession(false);
          await fetchMasterData();
          await scanDuplicates(); // Run duplicate scan on load
          await fetchSystemSettings(); // Fetch system settings on load
        } else {
          localStorage.removeItem("sb-session");
          router.push("/login");
        }
      } catch {
        localStorage.removeItem("sb-session");
        router.push("/login");
      }
    };

    checkSession();
  }, [router, fetchMasterData, fetchSystemSettings, scanDuplicates]);

  const contextValue = useMemo(() => ({
    data,
    setData,
    duplicateCandidates,
    setDuplicateCandidates,
    isLoading,
    setIsLoading,
    message,
    setMessage,
    userName,
    setUserName,
    userRole,
    setUserRole,
    isVerifyingSession,
    setIsVerifyingSession,
    selectedCategory,
    setSelectedCategory,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isScanning,
    setIsScanning,
    mergeMessage,
    setMergeMessage,
    smartFacility,
    setSmartFacility,
    smartStatus,
    setSmartStatus,

    // Settings
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
    setIsSavingSettings,
    dbSettings,
    setDbSettings,
    settingsMessage,
    setSettingsMessage,
    settingsMessageType,
    setSettingsMessageType,

    // Compliance
    gdprActive,
    setGdprActive,
    ccpaActive,
    setCcpaActive,
    internalQualityActive,
    setInternalQualityActive,

    // Lineage
    selectedLineageNode,
    setSelectedLineageNode,
    isLineageSidebarOpen,
    setIsLineageSidebarOpen,
    lineageFilter,
    setLineageFilter,
    showAuditTrailModal,
    setShowAuditTrailModal,
    auditLogs,
    setAuditLogs,

    // Operations
    fetchMasterData,
    scanDuplicates,
    fetchSystemSettings,
    handleSaveSettings,
    handleDiscardSettings,
    handlePurgeCache,
    fetchAuditLogs,
    handleExportMap,
    handleMerge,
    handleExternalIngest,
    downloadSampleCSV,
    handleLogout,
    handleUpload
  }), [
    data,
    duplicateCandidates,
    isLoading,
    message,
    userName,
    userRole,
    isVerifyingSession,
    selectedCategory,
    isMobileMenuOpen,
    isScanning,
    mergeMessage,
    smartFacility,
    smartStatus,
    fuzzyThreshold,
    qualityThreshold,
    autoMerge,
    redisTtl,
    activeSettingsSubTab,
    isSavingSettings,
    dbSettings,
    settingsMessage,
    settingsMessageType,
    gdprActive,
    ccpaActive,
    internalQualityActive,
    selectedLineageNode,
    isLineageSidebarOpen,
    lineageFilter,
    showAuditTrailModal,
    auditLogs,
    fetchMasterData,
    scanDuplicates,
    fetchSystemSettings,
    handleSaveSettings,
    handleDiscardSettings,
    handlePurgeCache,
    fetchAuditLogs,
    handleExportMap,
    handleMerge,
    handleExternalIngest,
    downloadSampleCSV,
    handleLogout,
    handleUpload
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
