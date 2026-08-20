"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="main-viewport">
        <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="content-container">{children}</main>
      </div>
    </div>
  );
}
