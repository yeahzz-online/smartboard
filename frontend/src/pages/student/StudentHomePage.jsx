import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlassCard from "../../components/GlassCard";
import PageLoader from "../../components/PageLoader";
import useAuth from "../../hooks/useAuth";
import api from "../../services/api";

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function getStatusClass(status) {
  const s = String(status || "").toUpperCase();
  // Uploaded / Approved -> green
  if (s === "UPLOADED" || s === "APPROVED") return "bg-emerald-100 text-emerald-900";
  // Pending / Rejected -> red
  if (s === "PENDING" || s === "REJECTED") return "bg-red-100 text-red-900";
  // Default (subjects or unknown) -> black
  return "bg-black text-white";
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#7F49B4] bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#7F49B4]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#7F49B4]">{value}</p>
    </div>
  );
}

export default function StudentHomePage() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    dashboard: null,
    error: ""
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get("/student/dashboard");
        setState({
          loading: false,
          dashboard: response.data || null,
          error: ""
        });
      } catch (requestError) {
        setState({
          loading: false,
          dashboard: null,
          error: requestError?.response?.data?.message || "Failed to load student dashboard"
        });
      }
    }

    loadDashboard();
  }, []);

  if (state.loading) return <PageLoader label="Loading student dashboard..." />;
  if (state.error) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-4">
        <GlassCard className="w-full max-w-lg border-red-200 bg-red-50 text-center">
          <p className="text-sm font-medium text-red-700">{state.error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Try again
          </button>
        </GlassCard>
      </div>
    );
  }

  const profile = state.dashboard?.profile || {};
  const metrics = state.dashboard?.metrics || {};
  const subjects = state.dashboard?.subjects || [];
  const recentUploads = state.dashboard?.recentUploads || [];
  const notifications = state.dashboard?.notifications || [];
  const activityHistory = state.dashboard?.activityHistory || [];

  // Compute display/full name and first name safely (avoid duplicate declarations)
  const rawName = (user?.name || profile?.name || "Student").toString().trim();
  const fullName = rawName || "Student";
  const firstName = fullName.split(/\s+/)[0] || "Student";

  const isCr = Boolean(user?.isCr || profile?.isCr);

  const quickActions = [
    ...(isCr
      ? [
        {
          label: "Class Overview (CR)",
          hint: "Classmates PPTs & Drive",
          to: "/student/cr"
        }
      ]
      : []),
    {
      label: "Upload Slides",
      hint: "Submit presentation",
      to: "/student/upload"
    },
    {
      label: "My Files",
      hint: "Track approvals",
      to: "/student/presentations"
    },
    {
      label: "Subjects",
      hint: "View assigned classes",
      to: "/student/subjects"
    },
    {
      label: "Activity",
      hint: "Recent history",
      to: "/student/activity"
    }
  ];

  return (
    <section className="mx-auto w-full max-w-[1500px] min-w-0 space-y-4 overflow-x-hidden sm:space-y-5">
      {/* Mobile/Desktop CR Banner */}
      {isCr && (
        <GlassCard className="border border-amber-300 bg-amber-400 p-4 shadow-lg shadow-amber-900/10">
  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    {/* Left Content */}
    <div className="flex min-w-0 items-center gap-3">
      {/* CR Icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-700/20 bg-amber-950/10 text-xl">
        👑
      </div>

      {/* Text */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold leading-tight text-slate-950 md:text-base">
            You are the designated Class Representative (CR)
          </h4>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            CR Active
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-amber-950/70">
          View your entire class submissions overview and manage the class
          Google Drive link.
        </p>
      </div>
    </div>

    {/* Button */}
    <Link
      to="/student/cr"
      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] sm:w-auto"
    >
      Open Class Overview
      <span aria-hidden="true" className="text-sm">
        ↗
      </span>
    </Link>
  </div>
</GlassCard>
      )}

      <div className="space-y-4 lg:hidden">
        <GlassCard className="rounded-3xl border-white/20 bg-gradient-to-br from-[#7F49B433] via-[#7F49B444] to-[#14141455] p-5">
          <p className="text-sm text-blue-100/85">Student Dashboard</p>
          <h3 className="mt-1 font-display text-3xl text-white">Hello, {fullName}!</h3>
          <p className="mt-2 text-xs text-blue-100/80">
            Balance your uploads and stay aligned with class submissions.
          </p>

          <div className="mt-4  grid grid-cols-3 gap-2">
            <MetricTile label="Subjects" value={metrics.subjectsCount || 0} />
            <MetricTile label="Uploads" value={metrics.uploadedCount || 0} />
            <MetricTile label="Pending" value={metrics.pendingCount || 0} />
          </div>
        </GlassCard>

        <GlassCard className="rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-base text-white">Quick Menu</h4>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {quickActions.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="min-w-[145px] rounded-2xl border border-white/20 bg-white/10 p-3"
              >
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-soft">{item.hint}</p>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-base text-white">Assigned Subjects</h4>
            <Link className="text-xs text-brand-300 hover:text-brand-100" to="/student/subjects">
              See all
            </Link>
          </div>
          {subjects.length === 0 ? (
            <p className="text-soft">No subjects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {subjects.slice(0, 4).map((subject) => (
                <div key={subject.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{subject.name}</p>
                      <p className="text-xs text-soft">
                        {subject.code} | {subject.facultyName || "Faculty not assigned"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClass(
                        subject.uploadStatus
                      )}`}
                    >
                      {subject.uploadStatus || "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-base text-white">Recent Uploads</h4>
            <Link className="text-xs text-brand-300 hover:text-brand-100" to="/student/presentations">
              See all
            </Link>
          </div>
          {recentUploads.length === 0 ? (
            <p className="text-soft">No uploads yet.</p>
          ) : (
            <div className="space-y-2">
              {recentUploads.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">
                    {item.title || item.subjectName || "Presentation"}
                  </p>
                  <p className="mt-1 text-xs text-soft">
                    {item.subjectCode || "-"} | {item.status} | {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-base text-white">Recent Activity</h4>
            <Link className="text-xs text-brand-300 hover:text-brand-100" to="/student/activity">
              See all
            </Link>
          </div>
          {activityHistory.length === 0 ? (
            <p className="text-soft">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activityHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-soft">{item.message}</p>
                  <p className="mt-1 text-[11px] text-soft">{formatDateTime(item.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="hidden space-y-5 lg:block">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <GlassCard className="h-full rounded-3xl border-white/20 bg-gradient-to-br from-[#7F49B433] via-[#7F49B444] to-[#14141455] p-5">
            <p className="text-sm text-blue-100/85">Student Dashboard</p>
            <h3 className="mt-1 font-display text-3xl text-white">Welcome back, {fullName}</h3>
            <p className="mt-2 text-sm text-blue-100/80">
              Keep your presentations updated and monitor review status from one place.
            </p>
          </GlassCard>
          <GlassCard className="h-full rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-soft">Quick Stats</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex items-center justify-between text-white">
                <span>Assigned Subjects</span>
                <span className="font-semibold">{metrics.subjectsCount || 0}</span>
              </p>
              <p className="flex items-center justify-between text-white">
                <span>Total Uploads</span>
                <span className="  text-green-500 font-semibold">{metrics.uploadedCount || 0}</span>
              </p>
              <p className="flex items-center justify-between text-white">
                <span>Pending Submissions</span>
                <span className="text-red-500 font-semibold">{metrics.pendingCount || 0}</span>
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
          <GlassCard className="h-full">
            <h3 className="font-display text-lg text-white">Assigned Subjects</h3>
            <div className="mt-4 w-full overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-soft">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Faculty</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-t border-white/10">
                      <td className="px-3 py-3">{subject.code}</td>
                      <td className="px-3 py-3">{subject.name}</td>
                      <td className="px-3 py-3">{subject.facultyName || "-"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] uppercase ${getStatusClass(
                            subject.uploadStatus
                          )}`}
                        >
                          {subject.uploadStatus || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="h-full">
            <h3 className="font-display text-lg text-white">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="mt-3 text-soft">No notifications available.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {notifications.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-soft">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="h-full">
            <h3 className="font-display text-lg text-white">Recent Uploads</h3>
            {recentUploads.length === 0 ? (
              <p className="mt-3 text-soft">No uploads yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {recentUploads.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">
                      {item.title || item.subjectName || "Presentation"}
                    </p>
                    <p className="text-xs text-soft">
                      {item.subjectCode || "-"} | {item.status} | {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="h-full">
            <h3 className="font-display text-lg text-white">Activity History</h3>
            {activityHistory.length === 0 ? (
              <p className="mt-3 text-soft">No activity yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {activityHistory.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-soft">{item.message}</p>
                    <p className="mt-1 text-[11px] text-soft">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
