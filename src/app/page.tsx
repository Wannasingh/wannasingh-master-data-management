"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/master-data');
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
      setMessage('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-etl', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(result.message || 'Upload successful');
        fetchMasterData(); // Refresh data
        setFile(null); // Reset
      } else {
        setMessage(result.detail || 'Upload failed');
      }
    } catch (error) {
      setMessage('An error occurred during upload.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#0F172A] border-r border-outline-variant flex flex-col py-md z-50 hidden md:flex">
        {/* Header */}
        <div className="px-md mb-xl flex items-center gap-md">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white">database</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-white leading-tight" data-testid="page-title">MasterData Pro</h1>
            <p className="font-body-sm text-body-sm text-outline-variant">Enterprise Orchestrator</p>
          </div>
        </div>
        {/* CTA */}
        <div className="px-md mb-lg">
          <button className="w-full bg-primary hover:bg-on-primary-fixed-variant transition-colors text-white font-label-md text-label-md rounded-lg py-sm px-md flex items-center justify-center gap-sm">
            <span className="material-symbols-outlined">add</span>
            New Request
          </button>
        </div>
        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="flex flex-col space-y-1">
            <li>
              <a className="flex items-center gap-md px-md py-sm border-l-4 border-primary bg-secondary-fixed-dim/10 text-primary font-bold font-body-md text-body-md transition-all duration-200 ease-in-out" href="#">
                <span className="material-symbols-outlined fill">dashboard</span>
                Dashboard
              </a>
            </li>
            <li>
              <a className="flex items-center gap-md px-md py-sm border-l-4 border-transparent text-on-secondary-fixed-variant hover:bg-on-secondary-fixed-variant/20 hover:text-white transition-colors duration-200 ease-in-out font-body-md text-body-md pl-[20px]" href="#">
                <span className="material-symbols-outlined">database</span>
                Data Explorer
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-[280px] flex flex-col h-full bg-surface-bright">
        {/* TopNavBar */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-280px)] h-16 bg-surface-container-lowest border-b border-outline-variant z-40">
          <div className="flex justify-between items-center px-xl w-full max-w-[1440px] mx-auto h-full">
            <div className="flex items-center gap-xl flex-1">
              <span className="font-headline-sm text-headline-sm font-black text-on-surface tracking-tight hidden lg:block">MDM Console</span>
            </div>
            <div className="flex items-center gap-md ml-lg">
              <button className="flex items-center gap-sm cursor-pointer active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center">
                  <span className="font-label-md text-label-md text-on-surface">JD</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto mt-16 p-md lg:p-xl">
          <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-lg">
            
            <div className="flex flex-col gap-xs mb-sm">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Master Data Orchestration</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">Manage and harmonize core enterprise data assets across domains. Upload new batch sets or review standardized records below.</p>
            </div>

            {/* ETL Upload Zone */}
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">ETL Pipeline Intake</h3>
              
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
                className="w-full border-2 border-dashed border-outline-variant rounded-lg bg-surface-bright hover:bg-[#eaf0ff] transition-colors duration-200 flex flex-col items-center justify-center py-xl cursor-pointer group mb-4"
              >
                <div className="w-16 h-16 rounded-full bg-surface-container-highest group-hover:bg-primary-fixed flex items-center justify-center mb-md transition-colors">
                  <span className="material-symbols-outlined text-3xl text-tertiary group-hover:text-primary">cloud_upload</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-xs">
                  {file ? file.name : "Upload Master Data"}
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-md">
                  Drag and drop CSV files here, or <span className="text-primary font-medium hover:underline">browse files</span>. Maximum file size 500MB.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={handleUpload}
                  disabled={isLoading || !file}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Upload Data'}
                </button>
                {message && (
                  <p className={`text-sm ${message.includes('success') ? 'text-[#1E8E3E]' : 'text-error'}`}>
                    {message}
                  </p>
                )}
              </div>
            </section>

            {/* Data Table */}
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden flex flex-col">
              <div className="px-md py-sm border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest">
                <h3 className="font-label-md text-label-md text-on-surface uppercase">Harmonized Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-surface-variant">
                      <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">ID</th>
                      <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Name</th>
                      <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Category</th>
                      <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Value</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-variant">
                    {data.length === 0 ? (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500" colSpan={4}>
                          No master data records found. Please upload a CSV.
                        </td>
                      </tr>
                    ) : (
                      data.map((row, index) => (
                        <tr key={index} className="hover:bg-surface-container-lowest/50 transition-colors group">
                          <td className="py-sm px-md font-medium text-tertiary">{row.id || `REC-${index}`}</td>
                          <td className="py-sm px-md">{row.name}</td>
                          <td className="py-sm px-md">{row.category}</td>
                          <td className="py-sm px-md">{row.value}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
