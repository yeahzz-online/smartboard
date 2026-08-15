import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PortalIcon, { getNavIconName } from "./PortalIcon";
import { navByRole } from "../routes/navConfig";
import { resolveAssetUrl } from "../utils/urlUtils";

export default function TopBar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = navByRole[role] || [];
  const isAdmin = role === "ADMIN";
  const isFaculty = role === "FACULTY";
  const isStudent = role === "STUDENT";
  const isCr = Boolean(user?.isCr);
  const showPortalLogo = isFaculty || isStudent;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNav =
    navItems.find(
      (item) =>
        location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
    ) || null;

  const visibleNavItems = isStudent
    ? navItems.filter((item) => (item.crOnly ? isCr : true))
    : navItems;

  const pageTitle = activeNav?.label || "Overview";
  const displayName = user?.name || "User";
  const initials =
    String(displayName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U";
  const hasProfilePhoto = Boolean(user?.profilePhoto && String(user.profilePhoto).trim());
  const avatarSrc =
    resolveAssetUrl(user?.profilePhoto) || "/auth-assets/profile-placeholder.svg";
  const onAvatarError = (event) => {
    if (event.currentTarget.src.includes("/auth-assets/profile-placeholder.svg")) return;
    event.currentTarget.src = "/auth-assets/profile-placeholder.svg";
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header
        className="bottom-nav-glass flex min-h-[60px] min-w-0 items-center justify-between gap-2 rounded-full px-4 py-3 sm:px-5 sm:py-3.5 transition-all"
      >
        {/* Left Side: Logo & Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showPortalLogo ? (
            <img
              src="/auth-assets/logo.jpg"
              alt="CMR logo"
              className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition"
            style={{
              background: "rgba(255,255,255,0.80)",
              border: "1.5px solid rgba(255,255,255,0.90)",
              boxShadow: "0 2px 8px rgba(20,20,25,0.10)"
            }}
          >
            <PortalIcon name={getNavIconName(activeNav?.href)} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Page</p>
            <h2 className="truncate font-display text-base font-bold text-[#141414] sm:text-lg">
              {pageTitle}
            </h2>
          </div>
        </div>

        {/* Right Side: Profile & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Display Name on Tablet/Desktop */}
          <div className="hidden text-right sm:block">
            <p className="text-xs font-bold text-[#141414]">{displayName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{role || "User"}</p>
          </div>

          {/* User Avatar */}
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-[#141414]"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(20,20,25,0.10)"
            }}
            title={displayName}
          >
            {hasProfilePhoto ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
                onError={onAvatarError}
              />
            ) : (
              <span>{initials}</span>
            )}
          </span>

          {/* Desktop Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1.5px solid rgba(254,202,202,0.80)",
              boxShadow: "0 2px 8px rgba(220,38,38,0.10)"
            }}
            title="Log Out"
          >
            <PortalIcon name="logout" className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>


        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER MENU */}

    </>
  );
}
