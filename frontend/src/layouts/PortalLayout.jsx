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
        {/* Desktop top navigation */}
        <div className="shrink-0 hidden lg:block lg:px-6 lg:pt-6 lg:pb-4">
          <TopBar />
        </div>

        {/* Mobile top navigation stays in the scroll layout so it cannot cover page content. */}
        <div className="sticky top-0 z-40 w-full min-w-0 shrink-0 px-1 pb-3 lg:hidden">
          <TopBar />
        </div>

        {/* Scrollable page content — reserve space for the fixed bottom navigation. */}
        <div
          className={`flex-1 min-h-0 touch-pan-y overscroll-contain overflow-y-auto px-4 pt-2 lg:pt-0 lg:px-6 lg:pb-6 ${
            isAdmin ? "pb-[calc(45vh+1rem)]" : "pb-[calc(8rem+env(safe-area-inset-bottom))]"
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
