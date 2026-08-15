import { useEffect, useState } from "react";
import GlassCard from "../../components/GlassCard";
import PageLoader from "../../components/PageLoader";
import api from "../../services/api";

function isPdfFile(fileUrl = "", fileType = "", fileName = "") {
  if (String(fileType).toLowerCase().includes("pdf")) return true;
  return /\.pdf(?:[?#]|$)/i.test(`${fileUrl} ${fileName}`);
}

export default function FacultyPresentationReviewPage() {
  const [subjects, setSubjects] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [filters, setFilters] = useState({
    subjectId: "",
    status: "",
    search: ""
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

  useEffect(() => {
    if (!previewModal.isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setPreviewModal({ isOpen: false, title: "", fileUrl: "", officeViewerUrl: "", fileName: "" });
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewModal.isOpen]);

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

  // Use the same signed storage URL flow as the student/CR views. This keeps
  // private Supabase/S3 files accessible without exposing their storage key.
  const getSecureFileUrl = async (item) => {
    const response = await api.get("/storage/file-url", {
      params: { uploadId: item.id }
    });
    return response.data?.url || response.data?.fileUrl || item.fileUrl || "";
  };

  const handleOpenFile = async (item) => {
    setLoadingFileId(item.id);
    setError("");
    try {
      const targetUrl = await getSecureFileUrl(item);
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
      const fileUrl = await getSecureFileUrl(item);
      if (!fileUrl) throw new Error("File URL not available");
      const officeViewerUrl = isPdfFile(fileUrl, item.fileType, item.fileName)
        ? fileUrl
        : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      setPreviewModal({
        isOpen: true,
        title: item.title || item.fileName || "Presentation Preview",
        fileName: item.fileName || "Presentation",
        fileUrl,
        officeViewerUrl
      });
    } catch (_err) {
      const officeViewerUrl = isPdfFile(item.fileUrl, item.fileType, item.fileName)
        ? item.fileUrl
        : item.officeViewerUrl || `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.fileUrl)}`;
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

  if (loading) return <PageLoader label="Loading presentation review..." />;

  return (
    <section className="space-y-5">
      <GlassCard>
        <h3 className="font-display text-lg text-white">Presentation Viewer</h3>
        <p className="mt-1 text-sm text-soft">
          View student presentation files securely.
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
                        className="rounded-lg border border-sky-400/60 bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-500/30 disabled:opacity-50"
                      >
                        Preview
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
        <div className="fixed inset-0 z-[100] flex h-[102dvh] w-screen items-center border-black justify-center bg-white/20">
          <div className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-white">
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
                    className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs text-sky-700 transition hover:bg-sky-500/30"
                  >
                    Open Original ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, title: "", fileUrl: "", officeViewerUrl: "", fileName: "" })}
                  className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/30"
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

      {error ? <p className="text-red-300">{error}</p> : null}
    </section>
  );
}
