"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface MasterDataRecord {
  id?: string | number;
  name: string;
  category: string;
  value: number;
  source_system?: string;
  status?: string;
  data_quality_score?: number;
}

interface DuplicateCandidate {
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

const lineageNodeData = {
  ERP: {
    name: "Oracle Cloud",
    type: "ERP Connector",
    icon: "database",
    score: "94.2%",
    latency: "45ms",
    sync: "12m ago",
    owner: "Michael Chen (Finance)",
    attributes: [
      { name: "Legal Name", value: "G.H. Partners LLC", checked: true },
      { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
      { name: "Global HQ", value: "San Francisco, CA", checked: false },
    ]
  },
  CRM: {
    name: "Salesforce HC",
    type: "CRM Connector",
    icon: "person_book",
    score: "98.2%",
    latency: "14ms",
    sync: "Real-time",
    owner: "Sarah Jenkins (Compliance)",
    attributes: [
      { name: "Legal Name", value: "Global Health Partners", checked: true },
      { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
      { name: "Global HQ", value: "San Francisco, CA", checked: true },
    ]
  },
  Legacy: {
    name: "MedTech V3",
    type: "Legacy Database",
    icon: "archive",
    score: "62.8%",
    latency: "1.2s",
    sync: "24h ago",
    owner: "System Admin (Archival)",
    attributes: [
      { name: "Legal Name", value: "G.H. Partners", checked: false },
      { name: "Tax ID (FEIN)", value: "Unavailable", checked: false },
      { name: "Global HQ", value: "Oakland, CA", checked: false },
    ]
  },
  GoldenRecord: {
    name: "GR-882910",
    type: "Golden Record",
    icon: "verified",
    score: "99.9%",
    latency: "0ms",
    sync: "Published",
    owner: "Global Governance Board",
    attributes: [
      { name: "Legal Name", value: "Global Health Partners Inc.", checked: true },
      { name: "Tax ID (FEIN)", value: "XX-XXX4910", checked: true },
      { name: "Global HQ", value: "San Francisco, CA", checked: true },
    ]
  }
};

export default function Dashboard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MasterDataRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState("Dr. Sarah Chen");
  const [userRole, setUserRole] = useState("System Administrator");
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  // New MDM States
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [mergeMessage, setMergeMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "registry" | "validation" | "integration" | "governance">("overview");
  const [smartFacility, setSmartFacility] = useState("All Facilities");
  const [smartStatus, setSmartStatus] = useState("Status: All");

  // Compliance States
  const [gdprActive, setGdprActive] = useState(true);
  const [ccpaActive, setCcpaActive] = useState(true);
  const [internalQualityActive, setInternalQualityActive] = useState(false);

  // Lineage States
  const [selectedLineageNode, setSelectedLineageNode] = useState<"ERP" | "CRM" | "Legacy" | "GoldenRecord">("CRM");

  const avgQuality = data.length > 0 
    ? Math.round(data.reduce((acc, row) => acc + (row.data_quality_score || 100), 0) / data.length) 
    : 89;

  const duplicateCount = data.filter(r => r.status === 'Duplicate').length;

  // Compute dynamic dashboard statistics
  const uniqueSources = data.length > 0 
    ? new Set(data.map(r => r.source_system).filter(Boolean)).size 
    : 4;
    
  const activeNodes = data.length > 0 
    ? new Set(data.map(r => r.source_system).filter(Boolean)).size 
    : 24;

  const goldenCount = data.length > 0 
    ? data.filter(r => r.status === "Golden" || !r.status).length 
    : 1200000;

  const activeDomains = data.length > 0 
    ? new Set(data.map(r => r.category).filter(Boolean)).size 
    : 18;

  const activeEntities = data.length > 0 
    ? data.length 
    : 245000;

  const syncAvailability = data.length > 0 
    ? (100 - (duplicateCount / data.length) * 10).toFixed(1) 
    : "99.9";

  const currentY = 300 - (300 * avgQuality / 100);

  // Dynamic Activities Generator
  const activities: Array<{title: string, desc: string, time: string, icon: string, color: string}> = [];
  
  // 1. Check for duplicates
  const duplicates = data.filter(r => r.status === "Duplicate");
  duplicates.forEach((dup, idx) => {
    activities.push({
      title: "Data Conflict Detected",
      desc: `Duplicate record candidate detected for "${dup.name}" from ${dup.source_system || "unknown source"}.`,
      time: `${(idx + 1) * 15} MINS AGO`,
      icon: "warning",
      color: "text-tertiary bg-tertiary/10"
    });
  });

  // 2. Check for Golden records
  const goldenRecs = data.filter(r => r.status === "Golden" || !r.status);
  goldenRecs.slice(0, 3).forEach((gold, idx) => {
    activities.push({
      title: "Record Verified",
      desc: `"${gold.name}" validated and indexed as a Golden Record.`,
      time: `${(idx + 1) * 2} HOURS AGO`,
      icon: "check_circle",
      color: "text-primary bg-primary/10"
    });
  });

  // 3. Fallback/Standard activities
  activities.push(
    {
      title: "Schema Validated",
      desc: "Customer master schema synchronized across all global regions.",
      time: "2 MINS AGO",
      icon: "check_circle",
      color: "text-primary bg-primary/10"
    },
    {
      title: "Vault Backup Completed",
      desc: "Encrypted metadata archive generated for 1.4TB of records.",
      time: "2 HOURS AGO",
      icon: "sync",
      color: "text-secondary bg-secondary/10"
    }
  );

  const filteredData = data.filter(row => {
    // 1. Category Filter
    if (selectedCategory !== "All" && row.category !== selectedCategory) return false;
    
    // 2. Source System / Facility Filter
    if (smartFacility !== "All Facilities") {
      if (smartFacility === "Northwestern Memorial" && row.source_system !== "Salesforce CRM" && row.source_system !== "CRM API (JSONPlaceholder)") return false;
      if (smartFacility === "Lurie Children's" && row.source_system !== "ERP System" && row.source_system !== "ERP API (DummyJSON)") return false;
      if (smartFacility === "Rush University" && row.source_system !== "SAP ERP") return false;
      if (smartFacility === "Salesforce CRM" && row.source_system !== "Salesforce CRM" && row.source_system !== "CRM API (JSONPlaceholder)") return false;
      if (smartFacility === "ERP System" && row.source_system !== "ERP System" && row.source_system !== "ERP API (DummyJSON)") return false;
      if (smartFacility === "SAP ERP" && row.source_system !== "SAP ERP") return false;
      if (smartFacility === "CSV Ingestion" && row.source_system !== "CSV Ingestion") return false;
    }
    
    // 3. Status Filter
    if (smartStatus !== "Status: All") {
      if (smartStatus === "Verified" && row.status !== "Golden" && row.status !== "Validated") return false;
      if (smartStatus === "Review" && row.status !== "Duplicate" && row.status !== "Pending Merge" && row.status !== "Review") return false;
      if (smartStatus === "Archived" && row.status !== "Archived") return false;
    }
    
    return true;
  });

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

  const scanDuplicates = async () => {
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
  };

  const handleMerge = async (primaryId: number, duplicateId: number) => {
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
  };

  const handleExternalIngest = async (domain: string) => {
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
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,category,value\nAlice Smith,Customers,75000\nBob Johnson,Customers,80000\nBobb Johnson,Customers,80000\nMacBook Pro M3,Products,1999\nLogitech Mouse,Products,79\nGlobal Logistics,Suppliers,150000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mdm_sample_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  }, [router]);


  const handleLogout = async () => {
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
  };

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
        scanDuplicates(); // Auto scan for duplicates
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

  const getMenuItemClass = (tab: "overview" | "registry" | "validation" | "integration" | "governance") => {
    const isActive = activeTab === tab;
    
    return isActive
      ? "flex items-center gap-3 px-4 py-3 bg-primary-fixed text-on-primary-fixed rounded-full font-semibold transition-transform duration-200 active:scale-95 cursor-pointer"
      : "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200 cursor-pointer";
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
      {/* Mobile Sidebar Navigation Drawer */}
      <div 
        className={`fixed inset-0 bg-black/55 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <aside 
          className={`w-[260px] h-screen bg-surface flex flex-col py-8 px-4 border-r border-outline-variant transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
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
              className="text-on-surface-variant hover:bg-surface-container rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            <a
              className={getMenuItemClass("overview")}
              href="#"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab("overview");
              }}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </a>
            <a
              className={getMenuItemClass("registry")}
              href="#"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab("registry");
              }}
            >
              <span className="material-symbols-outlined">account_tree</span>
              <span className="font-body-md text-body-md">Master Data Registry</span>
            </a>
            <a
              className={getMenuItemClass("validation")}
              href="#"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab("validation");
              }}
            >
              <span className="material-symbols-outlined">policy</span>
              <span className="font-body-md text-body-md">Data Validation</span>
            </a>
            <a
              className={getMenuItemClass("integration")}
              href="#"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab("integration");
              }}
            >
              <span className="material-symbols-outlined">hub</span>
              <span className="font-body-md text-body-md">Data Integration</span>
            </a>
            <a
              className={getMenuItemClass("governance")}
              href="#"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab("governance");
              }}
            >
              <span className="material-symbols-outlined">verified_user</span>
              <span className="font-body-md text-body-md">Governance</span>
            </a>
            <a
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all"
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md text-body-md">Settings</span>
            </a>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-surface-container-high rounded-full transition-all text-left"
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
          {/* Dashboard (Active) */}
          <a
            className={getMenuItemClass("overview")}
            href="#"
            onClick={() => {
              setActiveTab("overview");
            }}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </a>
          <a
            className={getMenuItemClass("registry")}
            href="#"
            onClick={() => {
              setActiveTab("registry");
            }}
          >
            <span className="material-symbols-outlined">account_tree</span>
            <span className="font-body-md text-body-md">Master Data Registry</span>
          </a>
          <a
            className={getMenuItemClass("validation")}
            href="#"
            onClick={() => {
              setActiveTab("validation");
            }}
          >
            <span className="material-symbols-outlined">policy</span>
            <span className="font-body-md text-body-md">Data Validation</span>
          </a>
          <a
            className={getMenuItemClass("integration")}
            href="#"
            onClick={() => {
              setActiveTab("integration");
            }}
          >
            <span className="material-symbols-outlined">hub</span>
            <span className="font-body-md text-body-md">Data Integration</span>
          </a>
          <a
            className={getMenuItemClass("governance")}
            href="#"
            onClick={() => {
              setActiveTab("governance");
            }}
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span className="font-body-md text-body-md">Governance</span>
          </a>
          <a
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md text-body-md">Settings</span>
          </a>
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
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden hover:bg-surface-container rounded-full p-2 text-on-surface-variant transition-colors"
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

        {/* Main Canvas */}
        <main className="mt-20 p-container-padding flex-1">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Hero Banner Section */}
              <section className="grid grid-cols-12 gap-gutter mb-2">
                <div className="col-span-12 lg:col-span-8 bg-secondary-container/20 rounded-2xl p-8 flex justify-between items-center relative overflow-hidden border border-secondary-container/30">
                  <div className="max-w-xl z-10">
                    <h3 className="font-headline-lg text-headline-lg text-on-secondary-container mb-2">Enterprise Connectivity Hub</h3>
                    <p className="text-on-surface-variant font-body-md mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">cloud_done</span>
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
                  <div className="gauge-container mb-4">
                    <svg className="gauge-svg w-full h-full" viewBox="0 0 100 100">
                      <circle className="gauge-bg" cx="50" cy="50" r="40"></circle>
                      <circle className="gauge-fill" cx="50" cy="50" r="40" style={{ strokeDashoffset: `calc(251.2 - (251.2 * ${avgQuality}) / 100)` }}></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-stat-value font-stat-value text-primary leading-tight text-3xl font-bold">{avgQuality}%</span>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {avgQuality >= 90 ? "Excellent" : avgQuality >= 80 ? "Optimal" : avgQuality >= 70 ? "Warning" : "Critical"}
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
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +12%
                    </span>
                  </div>
                  <p className="font-stat-value text-stat-value text-on-surface">
                    {data.length > 0 
                      ? (goldenCount >= 1000 ? `${(goldenCount / 1000).toFixed(1)}k` : goldenCount.toString()) 
                      : "1.2M"}
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
                      <span className="material-symbols-outlined text-sm">check</span>
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
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +5%
                    </span>
                  </div>
                  <p className="font-stat-value text-stat-value text-on-surface">
                    {data.length > 0 
                      ? (activeEntities >= 1000 ? `${(activeEntities / 1000).toFixed(1)}k` : activeEntities.toString()) 
                      : "245k"}
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
                      <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold">12M</button>
                      <button className="px-3 py-1 bg-primary text-white rounded-full text-label-md font-bold font-semibold">6M</button>
                      <button className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-md font-bold">30D</button>
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
                      <div className="flex gap-4 relative" key={idx}>
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
                  <button className="w-full mt-6 py-3 border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold font-bold">
                    View Complete Audit Log
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "registry" && (
            /* Render Overview & Governance (Patient Registry, Smart filters, CSV upload, stewardship duplicates) */
            <>
              {/* Patient Registry Header & Action Buttons */}
              <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1" data-testid="registry-title">
                    Patient Registry
                  </h1>
                  <p className="text-on-surface-variant font-body-md text-body-md">
                    Centralized repository for all verified patient and healthcare provider records.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleUploadClick}
                    className="flex items-center gap-2 px-6 py-2.5 bg-surface-container text-on-surface font-semibold rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">upload</span>
                    Import
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-semibold rounded-full hover:shadow-lg transition-all active:scale-95 duration-200 cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add New Record
                  </button>
                </div>
              </section>

              {/* Filters & Stats Bento Row */}
              <div className="grid grid-cols-12 gap-card-gap mb-8">
                {/* Quick Stats */}
                <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest glass-card rounded-2xl p-6 shadow-subtle flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                      <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Total Patients</span>
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
                      {data.filter(r => r.status === 'Golden' || r.status === 'Validated' || !r.status).length.toLocaleString()}
                    </span>
                    <span className="text-sm text-on-surface-variant font-medium mt-1">
                      {data.length > 0 
                        ? `${((data.filter(r => r.status === 'Golden' || r.status === 'Validated' || !r.status).length / data.length) * 100).toFixed(1)}%` 
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
                    <span className="text-sm text-on-surface-variant font-medium mt-1">Data Health Index</span>
                  </div>
                </div>

                {/* Filters Card */}
                <div className="col-span-12 lg:col-span-4 bg-primary-container/10 border border-primary/10 rounded-2xl p-6 flex flex-col justify-between">
                  <h3 className="text-headline-sm font-semibold text-primary mb-4">Smart Filters</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={smartFacility}
                      onChange={(e) => setSmartFacility(e.target.value)}
                      className="bg-white border-none rounded-xl text-body-md font-medium text-on-surface-variant shadow-sm focus:ring-2 focus:ring-primary/20 p-2"
                    >
                      <option>All Facilities</option>
                      <option>Northwestern Memorial</option>
                      <option>Lurie Children&apos;s</option>
                      <option>Rush University</option>
                    </select>
                    <select 
                      value={smartStatus}
                      onChange={(e) => setSmartStatus(e.target.value)}
                      className="bg-white border-none rounded-xl text-body-md font-medium text-on-surface-variant shadow-sm focus:ring-2 focus:ring-primary/20 p-2"
                    >
                      <option>Status: All</option>
                      <option>Verified</option>
                      <option>Review</option>
                      <option>Archived</option>
                    </select>
                  </div>
                  <button className="mt-4 text-primary text-body-md font-bold flex items-center gap-2 hover:underline text-left cursor-pointer">
                    <span className="material-symbols-outlined">tune</span>
                    Advanced Search Options
                  </button>
                </div>
              </div>

              {/* Bento Grid: Ingest + Harmonized Records */}
              <div className="grid grid-cols-12 gap-gutter mb-8">
                {/* ETL Pipeline Intake & APIs */}
                <div className="col-span-12 lg:col-span-5 bg-white p-8 rounded-2xl border border-outline-variant custom-shadow flex flex-col justify-between">
                  <div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
                      ETL Pipeline Intake
                    </h4>
                    <p className="text-body-md text-on-surface-variant mb-6">
                      Upload healthcare master data to trigger standardization and Ingestion pipeline.
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
                      className="w-full border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low hover:bg-primary-fixed/20 transition-all duration-200 flex flex-col items-center justify-center py-8 px-4 cursor-pointer group mb-6 min-h-[160px]"
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

                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={handleUpload}
                        disabled={isLoading || !file}
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
                        <span className="material-symbols-outlined text-sm">cloud_sync</span>
                        Ingest CRM (Customers)
                      </button>
                      <button
                        onClick={() => handleExternalIngest("products")}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-tertiary text-white rounded-full text-label-md font-bold hover:bg-on-tertiary-container transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">cloud_sync</span>
                        Ingest ERP (Products)
                      </button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-center">
                      <button
                        onClick={downloadSampleCSV}
                        className="flex items-center gap-2 text-primary font-bold text-label-md hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
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
                                <span className={`px-2 py-0.5 rounded text-[11px] ${
                                  (row.data_quality_score || 100) >= 90 
                                    ? 'bg-tertiary/10 text-tertiary' 
                                    : (row.data_quality_score || 100) >= 70 
                                      ? 'bg-secondary/10 text-secondary' 
                                      : 'bg-error/10 text-error'
                                }`}>
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
                          {duplicateCandidates.map((dup, index) => (
                            <tr key={index} className="hover:bg-surface-container-low/50 transition-colors">
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
            </>
          )}
          {activeTab === "validation" && (
            /* Render Pipelines Tab (ETL Pipeline Monitor, Throughput bar chart, Active Data Flows table, Live Data Flow Architecture map) */
            <>
              {/* ETL Pipeline Monitor Header */}
              <section className="mb-10">
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2" data-testid="pipelines-title">
                  ETL Pipeline Monitor
                </h2>
                <p className="text-body-lg text-on-surface-variant">
                  Live oversight of healthcare data integration flows across the ecosystem.
                </p>
              </section>

              {/* Metrics Bento Grid */}
              <div className="grid grid-cols-12 gap-card-gap mb-10">
                {/* Record Throughput Card */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-gutter shadow-[0px_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between border border-outline-variant/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed text-label-md rounded-full font-semibold mb-2">
                          Global Throughput
                        </span>
                        <h3 className="font-headline-md text-headline-md text-on-surface">Record Throughput</h3>
                      </div>
                      <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        speed
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-stat-value text-stat-value text-on-surface">289.2k</span>
                      <span className="text-success text-body-md font-semibold flex items-center text-[#1e8a44]">
                        <span className="material-symbols-outlined text-[18px]">trending_up</span> 12.5%
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-body-md mt-1">Records processed in the last 24 hours</p>
                  </div>
                  {/* Dynamic Throughput Chart (Bar graph) */}
                  <div className="mt-8 h-24 w-full flex items-end gap-1.5">
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[40%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[60%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[50%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[80%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-container rounded-t-sm h-[95%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[70%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[45%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[55%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[90%] transition-all duration-500 hover:bg-primary"></div>
                    <div className="flex-1 bg-primary-fixed/30 rounded-t-sm h-[65%] transition-all duration-500 hover:bg-primary"></div>
                  </div>
                </div>

                {/* Average Sync Latency */}
                <div className="col-span-12 lg:col-span-4 bg-[#ffdf9f]/20 rounded-2xl p-gutter border border-tertiary-fixed/50 flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-tertiary p-2 bg-tertiary-fixed rounded-xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                      timer
                    </span>
                    <h3 className="text-body-md font-semibold text-tertiary-fixed-variant mb-1">Average Sync Latency</h3>
                    <div className="font-stat-value text-stat-value text-on-surface">42ms</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 p-3 bg-white/50 rounded-xl border border-white">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                    <p className="text-label-md text-on-surface-variant">Optimal range maintained for 48h</p>
                  </div>
                </div>
              </div>

              {/* Active Data Flows */}
              <div className="col-span-12 lg:col-span-12 mb-10">
                <div className="bg-white rounded-2xl p-gutter shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/20">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Data Flows</h3>
                    <button className="text-primary font-semibold text-body-md flex items-center gap-1 hover:underline cursor-pointer">
                      View Monitor Logs <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Pipeline Item 1 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">swap_horiz</span>
                        </div>
                        <div>
                          <h4 className="font-body-lg font-bold text-on-surface">Epic EMR → Central Registry</h4>
                          <p className="text-label-md text-on-surface-variant">Clinical Patient Records Sync</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="text-right hidden md:block">
                          <p className="text-label-md text-on-surface-variant">Last Batch</p>
                          <p className="text-body-md font-semibold">1,240 records</p>
                        </div>
                        <div className="flex items-center gap-2 bg-success-container/10 px-3 py-1.5 rounded-full border border-[#1e8a44]/20">
                          <span className="w-2 h-2 bg-[#1e8a44] rounded-full animate-pulse-soft"></span>
                          <span className="text-label-md font-bold text-[#1e8a44]">RUNNING</span>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                      </div>
                    </div>
                    {/* Pipeline Item 2 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined text-secondary">database</span>
                        </div>
                        <div>
                          <h4 className="font-body-lg font-bold text-on-surface">Billing Master → Warehouse</h4>
                          <p className="text-label-md text-on-surface-variant">Daily Financial Reconciliation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="text-right hidden md:block">
                          <p className="text-label-md text-on-surface-variant">Last Batch</p>
                          <p className="text-body-md font-semibold">45,102 records</p>
                        </div>
                        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant">
                          <span className="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                          <span className="text-label-md font-bold text-on-surface-variant">IDLE</span>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                      </div>
                    </div>
                    {/* Pipeline Item 3 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">analytics</span>
                        </div>
                        <div>
                          <h4 className="font-body-lg font-bold text-on-surface">Imaging Pax → ML Engine</h4>
                          <p className="text-label-md text-on-surface-variant">DICOM Metadata Extraction</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="text-right hidden md:block">
                          <p className="text-label-md text-on-surface-variant">Last Batch</p>
                          <p className="text-body-md font-semibold">892 images</p>
                        </div>
                        <div className="flex items-center gap-2 bg-success-container/10 px-3 py-1.5 rounded-full border border-[#1e8a44]/20">
                          <span className="w-2 h-2 bg-[#1e8a44] rounded-full animate-pulse-soft"></span>
                          <span className="text-label-md font-bold text-[#1e8a44]">RUNNING</span>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Data Flow Architecture Map */}
              <div className="col-span-12 lg:col-span-12 bg-white rounded-2xl p-gutter shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/20 overflow-hidden relative mb-10">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Live Data Flow Architecture</h3>
                    <p className="text-label-md text-on-surface-variant">Current Focus: Epic EMR Patient Registry Pipeline</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-surface-container rounded-full text-label-md font-bold text-on-surface-variant">Configuration</button>
                    <button className="px-4 py-2 bg-primary text-white rounded-full text-label-md font-bold">Edit Map</button>
                  </div>
                </div>
                <div className="flex items-center justify-between max-w-4xl mx-auto py-12 relative flex-col sm:flex-row gap-8 sm:gap-2">
                  {/* Progress Line */}
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-highest -translate-y-1/2 overflow-hidden hidden sm:block">
                    <div className="h-full bg-primary animate-pulse-soft w-2/3"></div>
                  </div>
                  {/* Source Node */}
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-primary shadow-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>dns</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-body-md">Source</p>
                      <p className="text-label-md text-on-surface-variant">Epic HL7 Feed</p>
                    </div>
                  </div>
                  {/* Mapping Node */}
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-primary p-1 shadow-2xl">
                      <div className="w-full h-full rounded-full border-4 border-white/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[40px] text-white">transform</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-body-md">Transformation</p>
                      <p className="text-label-md text-on-surface-variant">HL7 to FHIR Schema</p>
                    </div>
                  </div>
                  {/* Destination Node */}
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-primary-fixed shadow-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[32px] text-on-primary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-body-md">Destination</p>
                      <p className="text-label-md text-on-surface-variant">MediData Lake</p>
                    </div>
                  </div>
                </div>
                {/* SVG background styling */}
                <div className="absolute right-0 top-0 w-64 h-full pointer-events-none opacity-50 overflow-hidden hidden lg:block">
                  <svg className="h-full w-full" viewBox="0 0 200 400">
                    <path d="M200 0C150 50 100 0 50 50C0 100 50 150 0 200C-50 250 0 300 50 350C100 400 150 350 200 400" fill="none" opacity="0.3" stroke="#4648d4" strokeWidth="0.5"></path>
                    <circle cx="150" cy="80" fill="#93c5fd" opacity="0.1" r="40"></circle>
                    <circle cx="180" cy="300" fill="#e1e0ff" opacity="0.2" r="60"></circle>
                  </svg>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="material-symbols-outlined text-primary bg-primary-fixed/50 p-2 rounded-lg">health_and_safety</span>
                    <span className="material-symbols-outlined text-on-surface-variant">north_east</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant">Total Records Transferred</p>
                    <h4 className="text-headline-sm font-bold text-on-surface">321.4M</h4>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="material-symbols-outlined text-secondary bg-secondary-fixed/50 p-2 rounded-lg">error</span>
                    <span className="material-symbols-outlined text-on-surface-variant">north_east</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant">Validation Errors (24h)</p>
                    <h4 className="text-headline-sm font-bold text-on-surface">0.03%</h4>
                  </div>
                </div>
                <div className="bg-primary text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="relative z-10">
                    <span className="material-symbols-outlined bg-white/20 p-2 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div className="relative z-10 mt-4">
                    <p className="text-label-md text-white/70">Master Records Resolved</p>
                    <h4 className="text-headline-sm font-bold">98.7k</h4>
                  </div>
                  <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] text-white/10" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors min-h-[140px]">
                  <span className="material-symbols-outlined text-primary text-[32px] mb-2">add_circle</span>
                  <p className="text-body-md font-bold text-on-surface">Add Pipeline</p>
                  <p className="text-label-md text-on-surface-variant">New Data Connector</p>
                </div>
              </div>
            </>
          )}

          {activeTab === "governance" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header Section */}
              <section className="flex justify-between items-end flex-wrap gap-4">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Compliance &amp; Policy</h2>
                  <p className="text-body-lg text-on-surface-variant">Manage clinical data governance and regulatory standard adherence.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-colors font-semibold">
                    <span className="material-symbols-outlined text-[20px]">file_download</span>
                    Export Report
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-label-md text-label-md hover:shadow-lg hover:shadow-primary/20 transition-all font-semibold">
                    <span className="material-symbols-outlined text-[20px]">add</span>
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
                        <p className="text-body-md text-on-surface-variant">Real-time monitoring across 12 medical data domains.</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-label-md border border-green-100 font-semibold">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Optimized
                      </div>
                    </div>
                    <div className="flex items-end gap-10">
                      <div>
                        <span className="font-stat-value text-stat-value text-on-surface">98.4%</span>
                        <div className="flex items-center gap-1 text-green-600 mt-1">
                          <span className="material-symbols-outlined text-[16px]">trending_up</span>
                          <span className="text-label-md font-bold">+1.2% this month</span>
                        </div>
                      </div>
                      <div className="flex-1 h-32 flex items-end gap-2 pb-2">
                        {/* Simple Bar Mock */}
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[60%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[75%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[65%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[85%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[90%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg h-[80%] transition-all hover:bg-primary/30"></div>
                        <div className="flex-1 bg-primary rounded-t-lg h-[98%] transition-all hover:opacity-90"></div>
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
                      <h4 className="font-headline-md text-headline-md text-on-surface">02</h4>
                    </div>
                    <div className="ml-auto text-error flex items-center font-bold text-label-md">
                      Critical
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-[16px] p-6 shadow-subtle border border-surface-container-high flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/30 text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                    </div>
                    <div>
                      <p className="text-label-md font-label-md text-on-surface-variant">Pending Audits</p>
                      <h4 className="font-headline-md text-headline-md text-on-surface">14</h4>
                    </div>
                    <div className="ml-auto text-on-surface-variant text-label-md font-semibold">
                      Due in 4d
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
                      <button className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold">All Types</button>
                      <button className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold">Recent</button>
                    </div>
                  </div>
                  {/* Policy Cards */}
                  <div className="space-y-4">
                    {/* Card 1 */}
                    <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${gdprActive ? 'border-primary/20' : 'border-surface-container-high opacity-70'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">gavel</span>
                          </div>
                          <div>
                            <h4 className="text-body-lg font-semibold text-on-surface">GDPR Patient Data Privacy</h4>
                            <p className="text-body-md text-on-surface-variant">Clinical Record Access Control &amp; Logging</p>
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
                          </label>
                          <button className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Card 2 */}
                    <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${ccpaActive ? 'border-secondary/20' : 'border-surface-container-high opacity-70'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">rule</span>
                          </div>
                          <div>
                            <h4 className="text-body-lg font-semibold text-on-surface">CCPA Compliance Layer</h4>
                            <p className="text-body-md text-on-surface-variant">California Resident Data Deletion &amp; Opt-out</p>
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
                          </label>
                          <button className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Card 3 */}
                    <div className={`bg-white rounded-[16px] p-5 shadow-subtle border transition-all ${internalQualityActive ? 'border-primary/20' : 'border-surface-container-high opacity-70'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined">draw</span>
                          </div>
                          <div>
                            <h4 className="text-body-lg font-semibold text-on-surface">Internal Data Quality V2</h4>
                            <p className="text-body-md text-on-surface-variant">Updated schema for outpatient radiology</p>
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
                          </label>
                          <button className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Recent Alerts */}
                <div className="col-span-12 lg:col-span-4 space-y-gutter">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Governance Alerts</h3>
                  <div className="bg-white rounded-[16px] p-1 border border-surface-container-high shadow-subtle overflow-hidden">
                    {/* Alert 1 */}
                    <div className="p-4 border-b border-surface-container flex gap-4 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-error-container text-error flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                      </div>
                      <div>
                        <div className="flex justify-between items-start">
                          <h5 className="text-label-md font-bold text-on-surface">Unauthorized Access Attempt</h5>
                          <span className="text-[10px] text-on-surface-variant">14:22 PM</span>
                        </div>
                        <p className="text-body-md text-on-surface-variant mt-1 leading-snug">Multiple failed login attempts detected on restricted Patient-PHI-Delta schema.</p>
                        <button className="mt-2 text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">
                          Investigate <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    {/* Alert 2 */}
                    <div className="p-4 border-b border-surface-container flex gap-4 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-tertiary-fixed/20 text-tertiary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">priority_high</span>
                      </div>
                      <div>
                        <div className="flex justify-between items-start">
                          <h5 className="text-label-md font-bold text-on-surface">Data Decay Detected</h5>
                          <span className="text-[10px] text-on-surface-variant">Yesterday</span>
                        </div>
                        <p className="text-body-md text-on-surface-variant mt-1 leading-snug">Customer address validation rates dropped below 85% threshold in Southeast region.</p>
                      </div>
                    </div>
                    {/* Alert 3 */}
                    <div className="p-4 flex gap-4 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                      </div>
                      <div>
                        <div className="flex justify-between items-start">
                          <h5 className="text-label-md font-bold text-on-surface">Audit Log Rotation</h5>
                          <span className="text-[10px] text-on-surface-variant">Oct 24</span>
                        </div>
                        <p className="text-body-md text-on-surface-variant mt-1 leading-snug">System successfully archived Q3 governance logs to secure cold storage.</p>
                      </div>
                    </div>
                    <button className="w-full py-4 text-center text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors border-t border-surface-container font-semibold">
                      View All Activity
                    </button>
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
                      <p className="text-white font-bold text-headline-sm">Trust Architecture</p>
                      <p className="text-white/80 text-body-md">Precision MDM Core leverages zero-trust principles for medical data integrity.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "integration" && (
            <div className="flex flex-col lg:flex-row gap-6 -m-container-padding h-[calc(100vh-80px)] overflow-hidden animate-fadeIn">
              {/* Canvas Area */}
              <div className="flex-1 relative overflow-x-auto overflow-y-auto lineage-grid p-6 min-h-[500px]">
                {/* Header for Canvas */}
                <div className="flex justify-between items-end mb-8 relative z-10 flex-wrap gap-4">
                  <div>
                    <span className="text-primary font-semibold text-label-md bg-primary-fixed px-3 py-1 rounded-full">
                      Record ID: GR-882910
                    </span>
                    <h3 className="font-headline-lg text-headline-lg mt-2 text-on-surface">
                      Golden Record: Global Health Partners Inc.
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-white border border-outline-variant px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-surface-container transition-colors font-semibold text-label-md">
                      <span className="material-symbols-outlined text-[20px]">filter_list</span>
                      Filter View
                    </button>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity font-semibold text-label-md">
                      <span className="material-symbols-outlined text-[20px]">file_download</span>
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
                    <path className="flow-line" d="M 220 520 C 400 520, 400 350, 580 350" fill="none" stroke="url(#lineGradient)" strokeWidth="2"></path>
                    <path d="M 740 350 C 850 350, 850 350, 960 350" fill="none" stroke="#4648d4" strokeWidth="3"></path>
                  </svg>

                  {/* Source Node 1: Oracle Cloud */}
                  <div 
                    onClick={() => setSelectedLineageNode("ERP")}
                    className={`absolute left-[20px] top-[120px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 cursor-pointer ${
                      selectedLineageNode === "ERP" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">database</span>
                      </div>
                      <span className="text-label-md font-bold uppercase tracking-tighter text-outline-variant text-[10px]">ERP System</span>
                    </div>
                    <h4 className="font-semibold text-on-surface text-body-lg">Oracle Cloud</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-secondary font-medium">Sync: 12m ago</span>
                      <span className="text-error font-medium">94% Quality</span>
                    </div>
                  </div>

                  {/* Source Node 2: Salesforce HC */}
                  <div 
                    onClick={() => setSelectedLineageNode("CRM")}
                    className={`absolute left-[20px] top-[290px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 cursor-pointer ${
                      selectedLineageNode === "CRM" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">person_book</span>
                      </div>
                      <span className="text-label-md font-bold uppercase tracking-tighter text-primary text-[10px]">CRM Source</span>
                    </div>
                    <h4 className="font-semibold text-on-surface text-body-lg">Salesforce HC</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-secondary font-medium">Sync: Live</span>
                      <span className="text-tertiary font-medium">98% Quality</span>
                    </div>
                  </div>

                  {/* Source Node 3: MedTech V3 */}
                  <div 
                    onClick={() => setSelectedLineageNode("Legacy")}
                    className={`absolute left-[20px] top-[460px] w-48 bg-white p-4 rounded-xl shadow-subtle border transition-all active:scale-95 cursor-pointer ${
                      selectedLineageNode === "Legacy" ? "border-primary ring-4 ring-primary/5" : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-[20px]">archive</span>
                      </div>
                      <span className="text-label-md font-bold uppercase tracking-tighter text-outline text-[10px]">Legacy App</span>
                    </div>
                    <h4 className="font-semibold text-on-surface text-body-lg">MedTech V3</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-outline font-medium">Sync: 24h ago</span>
                      <span className="text-error font-medium">62% Quality</span>
                    </div>
                  </div>

                  {/* Processing Column: Validation Engine */}
                  <div className="absolute left-[510px] top-[270px] z-10">
                    <div className="bg-primary-container text-on-primary-container p-6 rounded-2xl shadow-xl w-64 border border-primary/20 node-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-body-lg">Validation Engine</h4>
                          <span className="text-[10px] uppercase opacity-75">Rules applied: 24</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Matching Logic</span>
                          <span className="font-mono">Fuzzy 0.85</span>
                        </div>
                        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="w-[85%] h-full bg-white"></div>
                        </div>
                        <div className="flex justify-between text-xs mt-3">
                          <span>De-duplication</span>
                          <span className="text-secondary-fixed">Complete</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination Node: Golden Record */}
                  <div 
                    onClick={() => setSelectedLineageNode("GoldenRecord")}
                    className={`absolute left-[920px] top-[230px] z-10 bg-white p-8 rounded-[32px] shadow-subtle border-4 w-56 flex flex-col items-center text-center transition-transform hover:scale-105 cursor-pointer ${
                      selectedLineageNode === "GoldenRecord" ? "border-primary" : "border-outline-variant"
                    }`}
                  >
                    <div className="w-16 h-16 bg-primary-fixed text-primary rounded-full flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[32px]">verified</span>
                    </div>
                    <span className="text-label-md font-bold text-primary uppercase mb-1">Master Index</span>
                    <h3 className="font-headline-sm text-on-surface leading-tight text-body-lg">Golden Record #882910</h3>
                    <div className="mt-4 px-4 py-1 bg-surface-container rounded-full text-xs font-semibold text-outline">
                      Status: Published
                    </div>
                  </div>

                </div>
              </div>

              {/* Sidebar Panel (Details) */}
              <aside className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-outline-variant flex flex-col h-full overflow-y-auto">
                <div className="p-8 border-b border-outline-variant">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Source Metadata</h3>
                    <button className="text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">
                          {lineageNodeData[selectedLineageNode].icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface text-body-lg">
                          {lineageNodeData[selectedLineageNode].name}
                        </h4>
                        <span className="text-body-md text-outline text-on-surface-variant text-xs">
                          {lineageNodeData[selectedLineageNode].type}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-outline-variant">
                        <span className="block text-[11px] text-outline uppercase font-bold text-on-surface-variant">Quality Score</span>
                        <span className="text-headline-sm text-primary text-headline-sm font-bold">
                          {lineageNodeData[selectedLineageNode].score}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-outline-variant">
                        <span className="block text-[11px] text-outline uppercase font-bold text-on-surface-variant">Latency</span>
                        <span className="text-headline-sm text-secondary text-headline-sm font-bold">
                          {lineageNodeData[selectedLineageNode].latency}
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
                      {lineageNodeData[selectedLineageNode].attributes.map((attr, idx) => (
                        <div className="flex items-start justify-between" key={idx}>
                          <div>
                            <span className="block font-semibold text-on-surface">{attr.name}</span>
                            <span className="text-xs text-outline text-on-surface-variant">{attr.value}</span>
                          </div>
                          <span className={`material-symbols-outlined text-[18px] ${attr.checked ? 'text-primary' : 'text-outline'}`}>
                            {attr.checked ? 'check_circle' : 'radio_button_unchecked'}
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
                            {lineageNodeData[selectedLineageNode].sync}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-tertiary">person</span>
                        <div>
                          <span className="block text-body-md font-medium text-on-surface">Data Steward</span>
                          <span className="text-xs text-outline text-on-surface-variant">
                            {lineageNodeData[selectedLineageNode].owner}
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
                  <button className="w-full py-4 bg-white border border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors text-label-md">
                    <span className="material-symbols-outlined">history</span>
                    View Full Audit Trail
                  </button>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>

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
}
