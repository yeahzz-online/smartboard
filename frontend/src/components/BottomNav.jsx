import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PortalIcon, { getNavIconName } from "./PortalIcon";
import { ADMIN_UI_PREFS_EVENT, getAdminUiPrefs } from "../services/adminUiPrefs";
import useAuth from "../hooks/useAuth";

const FACULTY_MOBILE_HREFS = [
  "/faculty/dashboard",
  "/faculty/classes",
  "/faculty/review",
  "/faculty/smartboard",
  "/faculty/profile"
];

function isActivePath(currentPath, href) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function BottomNav({ items, role }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [adminUiPrefs, setAdminUiPrefs] = useState(() => getAdminUiPrefs());
  const isAdmin = role === "ADMIN";
  const isStudent = role === "STUDENT";
  const isFaculty = role === "FACULTY";
  const isCr = Boolean(user?.isCr);

  useEffect(() => {
    if (role !== "ADMIN") return undefined;
    const syncPrefs = () => setAdminUiPrefs(getAdminUiPrefs());
    window.addEventListener(ADMIN_UI_PREFS_EVENT, syncPrefs);
    window.addEventListener("storage", syncPrefs);
    return () => {
      window.removeEventListener(ADMIN_UI_PREFS_EVENT, syncPrefs);
      window.removeEventListener("storage", syncPrefs);
    };
  }, [role]);

  const visibleItems = items;
  const facultyMobileItems = useMemo(() => {
    if (!isFaculty) return [];
    return FACULTY_MOBILE_HREFS.map((href) =>
      visibleItems.find((item) => item.href === href)
    ).filter(Boolean);
  }, [isFaculty, visibleItems]);

  const navItems = useMemo(() => {
    if (isStudent) return visibleItems.filter((item) => (item.crOnly ? isCr : true));
    if (isFaculty) return facultyMobileItems;
    return [...visibleItems, { label: "Logout", action: "logout" }];
  }, [facultyMobileItems, isCr, isFaculty, isStudent, visibleItems]);

  const adminGridColumns = useMemo(() => {
    if (!isAdmin) return 4;
    return Math.min(Math.max(Number(adminUiPrefs.mobileNavColumns) || 3, 2), 4);
  }, [adminUiPrefs.mobileNavColumns, isAdmin]);

  /* ── ADMIN ── scrollable grid tile nav ── */
  if (isAdmin) {
    return (
      <nav
        className="bottom-nav-glass fixed bottom-3 left-1/2 z-50 max-h-[45vh] w-[calc(100%-1.25rem)] max-w-lg -translate-x-1/2 touch-pan-y overscroll-contain overflow-y-auto rounded-3xl p-2 lg:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <ul
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${adminGridColumns}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active = isActivePath(location.pathname, item.href);
            return (
              <li key={item.href || item.action}>
                {item.action === "logout" ? (
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-red-600 px-2 py-2 text-center text-[10px] font-bold text-white shadow transition hover:bg-red-700"
                  >
                    <PortalIcon name="logout" className="h-4 w-4" />
                    {item.label}
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[10px] font-semibold transition-all duration-200 ${
                      active ? "nav-item-active" : "nav-item-inactive"
                    }`}
                  >
                    <PortalIcon name={getNavIconName(item.href)} className="h-4 w-4" />
                    <span className="leading-none">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  /* ── STUDENT / FACULTY ── pill nav ── */
  return (
    <nav
      className="bottom-nav-glass fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.25rem)] max-w-lg -translate-x-1/2 touch-pan-x rounded-full p-1.5 lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="grid items-center gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const active = isActivePath(location.pathname, item.href);
          const isUpload = item.href === "/student/upload";
          const key = item.href || item.action;

          return (
            <li key={key}>
              {item.action === "logout" ? (
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full flex-col items-center justify-center gap-1 rounded-full bg-red-600 px-2 py-2 text-center text-[10px] font-bold text-white shadow transition hover:bg-red-700"
                >
                  <PortalIcon name="logout" className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to={item.href}
                  className={`flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2.5 text-center text-[10px] font-semibold transition-all duration-300 ${
                    active
                      ? isUpload
                        ? "nav-item-upload-active scale-105"
                        : "nav-item-active scale-105"
                      : "nav-item-inactive"
                  }`}
                >
                  <PortalIcon name={getNavIconName(item.href)} className="h-[18px] w-[18px]" />
                  <span className="leading-none truncate max-w-[56px] text-[9.5px] font-bold tracking-wide">
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
