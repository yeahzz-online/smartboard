import { Link, useLocation } from "react-router-dom";
import PortalIcon, { getNavIconName } from "./PortalIcon";
import useAuth from "../hooks/useAuth";

function isActivePath(currentPath, href) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function SidebarNav({ items, role }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isAdmin = role === "ADMIN";
  const isStudent = role === "STUDENT";
  const displayName = user?.name || "Student";
  const roleLabel = String(role || "USER");
  const initials =
    String(displayName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "ST";
  const hasProfilePhoto = Boolean(user?.profilePhoto && String(user.profilePhoto).trim());
  const avatarSrc =
    (user?.profilePhoto && String(user.profilePhoto).trim()) || "/auth-assets/profile-placeholder.svg";
  const onAvatarError = (event) => {
    if (event.currentTarget.src.includes("/auth-assets/profile-placeholder.svg")) return;
    event.currentTarget.src = "/auth-assets/profile-placeholder.svg";
  };
  const isCr = Boolean(user?.isCr);
  const mainItems = isAdmin
    ? items.filter((item) =>
        [
          "/admin/dashboard",
          "/admin/departments",
          "/admin/classes",
          "/admin/subjects",
          "/admin/users",
          "/admin/uploads",
          "/smartboard/view"
        ].includes(item.href)
      )
    : isStudent
    ? items.filter((item) => (item.crOnly ? isCr : true))
    : items;
  const settingsItems = isAdmin
    ? items.filter((item) =>
        ["/admin/analytics", "/admin/feature-matrix", "/admin/settings"].includes(item.href)
      )
    : [];

  if (isStudent) {
    return (
      <aside className="hidden w-60 shrink-0 lg:block h-full select-none">
        <div className="m-4 flex h-[calc(100vh-2rem)] w-52 flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(20,20,20,0.08)]">
          <div className="flex flex-col items-center gap-1 pb-1">
            <img
              src="/auth-assets/logo.jpg"
              alt="CMR logo"
              className="h-14 w-14 rounded-2xl object-cover shadow-md ring-2 ring-slate-200"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">{roleLabel}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
            {hasProfilePhoto ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="mx-auto h-12 w-12 rounded-full object-cover ring-1 ring-slate-300"
                onError={onAvatarError}
              />
            ) : (
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-[#141414]">
                {initials}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500 font-medium">Welcome Back,</p>
            <p className="mt-0.5 text-xs font-bold text-[#141414] truncate px-1">{displayName}</p>
            {isCr && (
              <span className="mt-1.5 inline-block rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                Class Representative (CR)
              </span>
            )}
          </div>

          <div className="no-scrollbar my-3 flex-1 overflow-y-auto pr-0 space-y-1">
            <nav className="space-y-1">
              {mainItems.map((item) => {
                const active = isActivePath(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition ${
                      active
                        ? "bg-slate-200 text-[#141414]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-[#141414]"
                    }`}
                  >
                    {active ? (
                      <span className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-slate-500" />
                    ) : null}
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                        active
                          ? "border-[#141414] bg-[#141414] text-white"
                          : "border-slate-300 bg-white text-slate-500 group-hover:text-[#141414]"
                      }`}
                    >
                      <PortalIcon name={getNavIconName(item.href)} className="h-3.5 w-3.5" />
                    </span>
                    <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
                <PortalIcon name="logout" className="h-3.5 w-3.5" />
              </span>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const renderNavItems = (navItems) =>
    navItems.map((item) => {
      const active = isActivePath(location.pathname, item.href);
      return (
        <Link
          key={item.href}
          to={item.href}
          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
            active
              ? "bg-slate-200 text-[#141414]"
              : "text-slate-600 hover:bg-slate-100 hover:text-[#141414]"
          }`}
        >
          {active ? (
            <span className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-slate-500" />
          ) : null}
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              active
                ? "border-[#141414] bg-[#141414] text-white"
                : "border-slate-300 bg-white text-slate-500 group-hover:text-[#141414]"
            }`}
          >
            <PortalIcon name={getNavIconName(item.href)} className="h-4 w-4" />
          </span>
          <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
        </Link>
      );
    });

  return (
    <aside className="hidden w-72 shrink-0 lg:block h-full select-none">
      <div className="m-4 flex h-[calc(100vh-2rem)] w-64 flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(20,20,20,0.08)]">
        <div className="flex flex-col items-center gap-1 pb-1">
          <img
            src="/auth-assets/logo.jpg"
            alt="CMR logo"
            className="h-16 w-16 rounded-2xl object-cover shadow-md ring-2 ring-slate-200"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">{roleLabel}</p>
        </div>

        <div className="no-scrollbar my-4 flex-1 space-y-6 overflow-y-auto pr-0">
          {isAdmin ? (
            <section>
              <p className="px-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Main Menu</p>
              <nav className="mt-3 space-y-2">{renderNavItems(mainItems)}</nav>
            </section>
          ) : (
            <nav className="space-y-2">{renderNavItems(mainItems)}</nav>
          )}

          {isAdmin ? (
            <section>
              <p className="px-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Settings</p>
              <nav className="mt-3 space-y-2">{renderNavItems(settingsItems)}</nav>
            </section>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl border border-red-600 bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
              <PortalIcon name="logout" className="h-4 w-4" />
            </span>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
