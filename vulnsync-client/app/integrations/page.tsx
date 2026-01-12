"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<
    "defectDojoJira" | "dependencyTrack"
  >("defectDojoJira");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === "defectDojoJira"
              ? "border-b-2 border-blue-500 font-bold"
              : ""
          }`}
          onClick={() => setActiveTab("defectDojoJira")}
        >
          DefectDojo → Jira
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "dependencyTrack"
              ? "border-b-2 border-blue-500 font-bold"
              : ""
          }`}
          onClick={() => setActiveTab("dependencyTrack")}
        >
          Dependency-Track → DefectDojo
        </button>
      </div>

      {/* Content */}
      <div className="p-4 border rounded-md">
        {activeTab === "defectDojoJira" ? (
          <DefectDojoJiraTab />
        ) : (
          <DependencyTrackTab />
        )}
      </div>
    </div>
  );
}

function DefectDojoJiraTab() {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">DefectDojo → Jira Mapping</h2>
      <form className="space-y-2">
        <div>
          <label>Product Type</label>
          <input type="text" className="input input-bordered w-full" />
        </div>
        <div>
          <label>Project Key</label>
          <input type="text" className="input input-bordered w-full" />
        </div>
        <div>
          <label>Issue Type</label>
          <input type="text" className="input input-bordered w-full" />
        </div>
        <div>
          <label>Custom Field X</label>
          <input type="text" className="input input-bordered w-full" />
        </div>
        <Button type="submit">Save Mapping</Button>
      </form>
    </div>
  );
}

function DependencyTrackTab() {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Dependency-Track → DefectDojo</h2>
      <div className="space-y-2">
        <div>
          <label>Dependency-Track Project</label>
          <select className="select select-bordered w-full">
            <option>Select project</option>
          </select>
        </div>
        <div>
          <label>DefectDojo Product</label>
          <select className="select select-bordered w-full">
            <option>Select product</option>
          </select>
        </div>
        <Button>Import Vulnerabilities</Button>
      </div>
    </div>
  );
}
