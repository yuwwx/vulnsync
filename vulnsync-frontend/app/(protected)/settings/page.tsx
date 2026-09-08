"use client";

import dynamic from "next/dynamic";

const SettingsClient = dynamic(() => import("./SettingsClient"), {
  ssr: false,
  loading: () => <div>Loading…</div>,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
