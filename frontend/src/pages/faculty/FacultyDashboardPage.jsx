import { useEffect, useState } from "react";
import GlassCard from "../../components/GlassCard";
import PageLoader from "../../components/PageLoader";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth";

function Metric({ label, value }) {
  return (
    <GlassCard className="rounded-2xl p-4 sm:p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-soft">{label}</p>
      <h3 className="mt-2 font-display text-2xl text-white sm:text-3xl">{value}</h3>
    </GlassCard>
  );
}

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: ""
  });

  useEffect(() => {
    async function loadData() {
      try {
        const response = await api.get("/faculty/dashboard");
        setState({ loading: false, data: response.data, error: "" });
      } catch (requestError) {
        setState({
          loading: false,
          data: null,
          error: requestError?.response?.data?.message || "Failed to load dashboard"
        });
      }
    }
    loadData();
  }, []);

  if (state.loading) return <PageLoader label="Loading faculty dashboard..." />;
  if (state.error) return <p className="text-red-300">{state.error}</p>;

  const metrics = state.data?.metrics || {};
  const subjects = state.data?.subjects || [];
  const recentUploads = state.data?.recentUploads || [];
  const notifications = state.data?.notifications || [];
  const facultyName = state.data?.faculty?.name || user?.name || "Faculty";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Faculty portal</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Welcome, {facultyName}</h1>
          <p className="mt-1 text-sm text-soft">Keep track of your classes, subjects, and presentation reviews.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <Metric label="Classes" value={metrics.assignedClasses || 0} />
        <Metric label="Subjects" value={metrics.subjectsCount || 0} />
        <Metric label="Students" value={metrics.studentsCount || 0} />
        <Metric label="Presentations" value={metrics.uploadedCount || 0} />
        <Metric label="Pending Review" value={metrics.pendingCount || 0} />
      </div>

      <GlassCard>
        <h3 className="font-display text-lg text-white">Assigned Subjects</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-soft">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Department</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((item) => (
                <tr key={item.id || `${item.code}-${item.name}`} className="border-t border-white/10">
                  <td className="px-3 py-3">{item.name || "Unnamed subject"}</td>
                  <td className="px-3 py-3">{item.code || "-"}</td>
                  <td className="px-3 py-3">{item.year || "-"}</td>
                  <td className="px-3 py-3">{item.section || "-"}</td>
                  <td className="px-3 py-3">{item.department || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subjects.length === 0 ? <p className="mt-3 text-soft">No assigned subjects.</p> : null}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="font-display text-lg text-white">Recent Student Uploads</h3>
          {recentUploads.length === 0 ? (
            <p className="mt-3 text-soft">No recent uploads available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentUploads.map((item, index) => (
                <div key={item.id || `${item.fileName}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-semibold text-white">{item.title || item.fileName || item.subjectName}</p>
                  <p className="text-xs text-soft">
                    {item.subjectCode || "-"} | {item.uploadedByName || "-"} ({item.rollNumber || "-"}) | {item.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="font-display text-lg text-white">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="mt-3 text-soft">No notifications available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {notifications.map((item, index) => (
                <div key={item.id || `${item.title}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-soft">{item.message}</p>
                  <p className="mt-1 text-[11px] text-soft">
                    {item.createdBy || "System"} | {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
