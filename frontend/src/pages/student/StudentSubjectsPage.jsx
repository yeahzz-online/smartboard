import { useEffect, useState } from "react";
import GlassCard from "../../components/GlassCard";
import PageLoader from "../../components/PageLoader";
import api from "../../services/api";

export default function StudentSubjectsPage() {
  const [state, setState] = useState({
    loading: true,
    subjects: [],
    error: ""
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    async function loadSubjects() {
      try {
        const response = await api.get("/student/subjects");
        setState({
          loading: false,
          subjects: response.data.subjects || [],
          error: ""
        });
      } catch (requestError) {
        setState({
          loading: false,
          subjects: [],
          error: requestError?.response?.data?.message || "Failed to load subjects"
        });
      }
    }
    loadSubjects();
  }, []);

  if (state.loading) return <PageLoader label="Loading subjects..." />;

  const buildOfficeViewerUrl = (fileUrl) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  const fetchSignedUrl = async (uploadId) => {
    const response = await api.get("/storage/file-url", { params: { uploadId } });
    const url = response.data?.url;
    if (!url) {
      throw new Error("Failed to get the file URL from the server.");
    }
    return url;
  };

  const handleViewPresentation = async (presentation) => {
    if (!presentation?.id) {
      setState((prev) => ({ ...prev, error: "Unable to view this presentation right now." }));
      return;
    }

    try {
      const url = await fetchSignedUrl(presentation.id);
      setPreviewUrl(url);
      setPreviewTitle(presentation.title || presentation.fileName || "Presentation");
      setState((prev) => ({ ...prev, error: "" }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error?.response?.data?.message || error.message || "Failed to view file"
      }));
    }
  };

  const handlePreviewLatestFile = (subject) => {
    if (!subject?.latestFileUrl) {
      setState((prev) => ({ ...prev, error: "No file available to preview yet." }));
      return;
    }

    setPreviewUrl(subject.latestFileUrl);
    setPreviewTitle(`${subject.name} (${subject.code})`);
    setState((prev) => ({ ...prev, error: "" }));
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "UPLOADED" || s === "APPROVED") return "bg-emerald-100 text-emerald-900";
    if (s === "PENDING" || s === "REJECTED") return "bg-red-100 text-red-900";
    return "bg-black text-white";
  };

  return (
    <section className="space-y-5">
      <GlassCard>
        <h3 className="font-display text-lg text-white">Assigned Subjects</h3>
        <p className="mt-1 text-sm text-soft">
          Subject details, assigned faculty, and linked presentation history.
        </p>
        {state.error ? <p className="mt-3 text-red-300">{state.error}</p> : null}
      </GlassCard>

      {state.subjects.map((item) => (
        <GlassCard key={item.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="text-xs text-soft">{item.code}</p>
              <p className="mt-1 text-xs text-soft">
                Faculty: {item.facultyName || "-"} {item.facultyEmail ? `(${item.facultyEmail})` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClass(item.uploadStatus)}`}
            >
              {item.uploadStatus}
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-soft">
            {item.uploadedAt ? (
              <p>Latest upload: {new Date(item.uploadedAt).toLocaleString()}</p>
            ) : (
              <p>No presentation uploaded yet.</p>
            )}
            {item.latestFileUrl ? (
             <button
               type="button"
               className="mt-2 inline-flex rounded-xl border border-brand-300/40 bg-brand-500/20 px-3 py-2 text-sm font-semibold text-brand-100 transition hover:bg-brand-500/30"
               onClick={() => handlePreviewLatestFile(item)}
             >
               Preview latest file
             </button>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Related Presentations</p>
            {(item.presentations || []).length === 0 ? (
              <p className="mt-2 text-xs text-soft">No presentations linked to this subject yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-soft">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Uploaded</th>
                      <th className="px-3 py-2">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.presentations.map((presentation) => (
                      <tr key={presentation.id} className="border-t border-white/10">
                        <td className="px-3 py-3">{presentation.title || presentation.fileName || "-"}</td>
                        <td className="px-3 py-3">{presentation.status}</td>
                        <td className="px-3 py-3">
                          {presentation.createdAt ? new Date(presentation.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-black/10 bg-green-500/100 px-4 py-3 text-center text-sm text-black hover:bg-black/10"
                            onClick={() => handleViewPresentation(presentation)}
                          >
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>
      ))}

      {!state.error && state.subjects.length === 0 ? (
        <GlassCard>
          <p className="text-soft">No subjects assigned yet.</p>
        </GlassCard>
      ) : null}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => {
            setPreviewUrl("");
            setPreviewTitle("");
          }}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Preview</p>
                <p className="text-xs text-soft">{previewTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl("");
                  setPreviewTitle("");
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="h-[80vh] bg-white">
              <iframe
                title="File Preview"
                src={buildOfficeViewerUrl(previewUrl)}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
