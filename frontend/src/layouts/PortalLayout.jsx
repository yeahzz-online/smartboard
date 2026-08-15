import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import SidebarNav from "../components/SidebarNav";
import TopBar from "../components/TopBar";
import useAuth from "../hooks/useAuth";
import { navByRole } from "../routes/navConfig";
import { getStudentUiPrefs, STUDENT_UI_PREFS_EVENT } from "../services/studentUiPrefs";

export default function PortalLayout() {
  const { role } = useAuth();
  const navItems = navByRole[role] || [];
  const isAdmin = role === "ADMIN";
  const isStudent = role === "STUDENT";
  const [studentUiPrefs, setStudentUiPrefs] = useState(() => getStudentUiPrefs());

  useEffect(() => {
    document.body.classList.toggle("admin-mode", isAdmin);
    document.body.classList.toggle("student-mode", isStudent);
    return () => {
      document.body.classList.remove("admin-mode");
      document.body.classList.remove("student-mode");
    };
  }, [isAdmin, isStudent]);

  useEffect(() => {
    if (!isStudent) return undefined;

    const syncPrefs = () => {
      setStudentUiPrefs(getStudentUiPrefs());
    };

    window.addEventListener(STUDENT_UI_PREFS_EVENT, syncPrefs);
    window.addEventListener("storage", syncPrefs);
    return () => {
      window.removeEventListener(STUDENT_UI_PREFS_EVENT, syncPrefs);
      window.removeEventListener("storage", syncPrefs);
    };
  }, [isStudent]);

  useEffect(() => {
    const isStudentDarkMode = isStudent && Boolean(studentUiPrefs.darkMode);
    document.body.classList.toggle("student-dark-mode", isStudentDarkMode);
    return () => {
      document.body.classList.remove("student-dark-mode");
    };
  }, [isStudent, studentUiPrefs.darkMode]);

  if (role === "SMARTBOARD") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <main className="h-full w-full">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={`portal-shell h-[100dvh] overflow-hidden flex flex-col lg:flex-row ${isAdmin ? "admin-shell" : ""} ${isStudent ? "student-shell" : ""}`}>
      {/* Sidebar — desktop only */}
      <div className={`shrink-0 ${isAdmin ? "hidden lg:block lg:w-72 admin-sidebar-wrap" : "hidden lg:block lg:w-60"}`}>
        <SidebarNav items={navItems} role={role} />
      </div>

      {/* Main column */}
      <div className={`flex flex-1 flex-col min-h-0 overflow-hidden ${isAdmin ? "admin-content-wrap" : ""} ${isStudent ? "student-content-wrap" : ""}`}>
        {/* TopBar — floating pill on mobile, normal fixed on desktop */}
        <div className="shrink-0 hidden lg:block lg:px-6 lg:pt-6 lg:pb-4">
          <TopBar />
        </div>

        {/* Mobile floating TopBar — fixed pill at top like BottomNav at bottom */}
        <div className="lg:hidden fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.35rem)] max-w-lg">
          <TopBar />
        </div>

        {/* Scrollable page content — extra top padding on mobile to clear floating topbar */}
        <div
          className={`flex-1 min-h-0 touch-pan-y overscroll-contain overflow-y-auto px-4 pt-24 lg:pt-0 lg:px-6 lg:pb-6 ${
            isAdmin ? "pb-[calc(45vh+1rem)]" : "pb-[calc(7rem+env(safe-area-inset-bottom))]"
          }`}
        >
          <main className={`content-fade-in ${isAdmin ? "admin-main" : ""} ${isStudent ? "student-main" : ""}`}>
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav items={navItems} role={role} />
    </div>
  );
}
