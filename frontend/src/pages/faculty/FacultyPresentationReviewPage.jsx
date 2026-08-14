import { useEffect, useState } from "react";
import GlassCard from "../../components/GlassCard";
import PageLoader from "../../components/PageLoader";
import api from "../../services/api";

export default function FacultyPresentationReviewPage() {
  const [subjects, setSubjects] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [filters, setFilters] = useState({
    subjectId: "",
    status: "",
    search: ""
  });
  const [reviewState, setReviewState] = useState({
    id: "",
    status: "APPROVED",
    feedback: "",
    title: ""
  });
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    title: "",
    fileUrl: "",
    officeViewerUrl: "",
    fileName: ""
  });
  const [loadingFileId, setLoadingFileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadSubjects = async () => {
    try {
      const response = await api.get("/faculty/subjects");
      setSubjects(response.data.subjects || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load subjects");
    }
  };

  const loadPresentations = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/faculty/presentations", {
        params: {
          subjectId: filters.subjectId || undefined,
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });
      setPresentations(response.data.presentations || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load presentations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadPresentations();
  }, [filters.search, filters.status, filters.subjectId]);

  const openReview = (item, status) => {
    setError("");
    setMessage("");
    setReviewState({
      id: item.id,
      status,
      feedback: item.feedback || "",
      title: item.title || item.fileName || "Presentation"
    });
  };

  const handleOpenFile = async (item) => {
    setLoadingFileId(item.id);
    setError("");
    try {
      const res = await api.get(`/faculty/presentations/${item.id}/url`);
      const targetUrl = res.data?.fileUrl || item.fileUrl;
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("File URL not available");
      }
    } catch (err) {
      if (item.fileUrl) {
        window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      } else {
        setError(err?.response?.data?.message || "Failed to get presentation file URL");
      }
    } finally {
      setLoadingFileId(null);
    }
  };

  const handlePreviewFile = async (item) => {
    setLoadingFileId(item.id);
    setError("");
    try {
      const res = await api.get(`/faculty/presentations/${item.id}/url`);
      const fileUrl = res.data?.fileUrl || item.fileUrl;
      const officeViewerUrl = res.data?.officeViewerUrl || item.officeViewerUrl || `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      setPreviewModal({
        isOpen: true,
        title: item.title || item.fileName || "Presentation Preview",
        fileName: item.fileName || "Presentation",
        fileUrl,
        officeViewerUrl
      });
    } catch (_err) {
      const officeViewerUrl = item.officeViewerUrl || `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.fileUrl)}`;
      setPreviewModal({
        isOpen: true,
        title: item.title || item.fileName || "Presentation Preview",
        fileName: item.fileName || "Presentation",
        fileUrl: item.fileUrl,
        officeViewerUrl
      });
    } finally {
      setLoadingFileId(null);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewState.id) return;

    setSubmittingReview(true);
    setError("");
    setMessage("");
    try {
      await api.put(`/faculty/presentations/${reviewState.id}/review`, {
        status: reviewState.status,
        feedback: reviewState.feedback
      });
      setMessage("Presentation review updated.");
      setReviewState({ id: "", status: "APPROVED", feedback: "", title: "" });
      await loadPresentations();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <PageLoader label="Loading presentation review..." />;

  return (
    <section className="space-y-5">
      <GlassCard>
        <h3 className="font-display text-lg text-white">Presentation Review</h3>
        <p className="mt-1 text-sm text-soft">
          Approve or reject student submissions with feedback comments.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <select
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-300"
            value={filters.subjectId}
            onChange={(event) => setFilters((prev) => ({ ...prev, subjectId: event.target.value }))}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-300"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="UPLOADED">UPLOADED</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-brand-300 lg:col-span-2"
            placeholder="Search by title, subject, student, roll number"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </div>
      </GlassCard>

      {reviewState.id ? (
        <GlassCard>
          <form className="space-y-3" onSubmit={submitReview}>
            <p className="text-sm font-semibold text-white">
              Review: {reviewState.title} ({reviewState.status})
            </p>
            <textarea
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-300"
              rows={4}
              placeholder="Feedback comments"
              value={reviewState.feedback}
              onChange={(event) =>
                setReviewState((prev) => ({ ...prev, feedback: event.target.value }))
              }
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submittingReview}
                className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
              >
                {submittingReview ? "Submitting..." : `Confirm ${reviewState.status}`}
              </button>
              <button
                type="button"
                onClick={() => setReviewState({ id: "", status: "APPROVED", feedback: "", title: "" })}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-soft">
              <tr>
                <th className="px-3 py-2">Presentation</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {presentations.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white">{item.title || item.fileName || "-"}</p>
                    <p className="text-xs text-soft">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {item.subjectCode} {item.subjectName ? `- ${item.subjectName}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    {item.uploadedByName || "-"} ({item.rollNumber || "-"})
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={loadingFileId === item.id}
                        onClick={() => handlePreviewFile(item)}
                        className="rounded-lg border border-sky-400/60 bg-sky-400/20 px-2.5 py-1 text-xs font-medium text-sky-200 transition hover:bg-sky-400/30 disabled:opacity-50"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={loadingFileId === item.id}
                        onClick={() => handleOpenFile(item)}
                        className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                      >
                        {loadingFileId === item.id ? "Opening..." : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openReview(item, "APPROVED")}
                        className="rounded-lg border border-emerald-400/60 bg-emerald-400/20 px-2 py-1 text-xs text-emerald-100 hover:bg-emerald-400/30"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openReview(item, "REJECTED")}
                        className="rounded-lg border border-red-400/60 bg-red-400/20 px-2 py-1 text-xs text-red-100 hover:bg-red-400/30"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {presentations.length === 0 ? <p className="mt-4 text-soft">No presentations found.</p> : null}
      </GlassCard>

      {/* Presentation Fullscreen Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6">
          <div className="flex flex-col h-[90vh] w-full max-w-6xl rounded-2xl border border-white/20 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-semibold text-sm md:text-base text-white truncate max-w-md">
                  {previewModal.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {previewModal.fileUrl && (
                  <a
                    href={previewModal.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
                  >
                    Open Original ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, title: "", fileUrl: "", officeViewerUrl: "", fileName: "" })}
                  className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black relative">
              <iframe
                src={previewModal.officeViewerUrl || previewModal.fileUrl}
                title="presentation-preview"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {message ? <p className="text-emerald-300">{message}</p> : null}
      {error ? <p className="text-red-300">{error}</p> : null}
    </section>
  );
}
