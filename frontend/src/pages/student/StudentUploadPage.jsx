import { useEffect, useRef, useState } from "react";
import GlassCard from "../../components/GlassCard";
import api from "../../services/api";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf"
]);

function getContentType(file) {
  if (!file) return "application/octet-stream";
  if (ALLOWED_CONTENT_TYPES.has(file.type)) return file.type;

  const lowerName = String(file.name || "").toLowerCase();
  if (lowerName.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lowerName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function getStorageUploadNetworkHint(uploadUrl) {
  const url = String(uploadUrl || "");
  const origin = typeof window !== "undefined" ? String(window.location.origin || "") : "";

  if (/amazonaws\.com/i.test(url)) {
    const originHint = origin ? `Add ${origin} to your storage bucket CORS AllowedOrigins (and allow PUT).` : "";
    return `Storage upload request was blocked by CORS. ${originHint} Or set backend STORAGE_PROVIDER=supabase and SUPABASE_UPLOAD_MODE=proxy to upload via the backend API.`;
  }

  return "Storage upload request failed to reach the server. Check backend URL and network connectivity.";
}

function uploadFileWithProgress(uploadUrl, file, fileType, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", fileType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error(request.responseText || "Failed to upload file to storage"));
    };
    request.onerror = () => reject(new Error(getStorageUploadNetworkHint(uploadUrl)));
    request.send(file);
  });
}

export default function StudentUploadPage() {
  const fileInputRef = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectId: ""
  });
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSubjects() {
      setLoadingSubjects(true);
      setError("");
      try {
        const response = await api.get("/student/subjects");
        setSubjects(response.data.subjects || []);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      selectFile(droppedFile);
    }
  };

  const selectFile = (selectedFile) => {
    const lowerName = String(selectedFile?.name || "").toLowerCase();
    if (lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx") || lowerName.endsWith(".pdf")) {
      setFile(selectedFile);
      setError("");
      setResult(null);
      setUploadStage("File selected. Ready to upload.");
    } else {
      setFile(null);
      setError("Please choose a valid PowerPoint (.ppt, .pptx) or PDF file");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setUploadProgress(0);
    setUploadStage("");

    if (!form.subjectId) {
      setError("Please select a subject");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter presentation title");
      return;
    }

    if (!file) {
      setError("Please choose or drop a PPT, PPTX, or PDF file");
      return;
    }

    if (subjects.length === 0) {
      setError("No subjects assigned. Contact admin.");
      return;
    }

    setSubmitting(true);
    try {
      setUploadStage("Preparing secure upload...");
      const fileType = getContentType(file);
      const title = form.title.trim();
      const description = form.description.trim();
      const subjectName = subjects.find((item) => item.id === form.subjectId)?.name || "-";

      const presignResponse = await api.post("/student/presentations/presign", {
        subjectId: form.subjectId,
        title,
        description,
        fileName: file.name,
        fileType
      });

      const uploadUrl = presignResponse.data.uploadUrl;
      const uploadToken = presignResponse.data.uploadToken;
      if (!uploadUrl || !uploadToken) {
        throw new Error("Upload URL could not be generated. Please try again.");
      }

      setUploadStage("Uploading file...");
      try {
        await uploadFileWithProgress(uploadUrl, file, fileType, setUploadProgress);
      } catch (_fetchError) {
        throw new Error(_fetchError?.message || getStorageUploadNetworkHint(uploadUrl));
      }

      setUploadProgress(100);
      setUploadStage("Finalizing upload...");
      const completeResponse = await api.post("/student/presentations/complete", {
        uploadToken,
        title,
        description
      });

      setResult({
        ...completeResponse.data,
        fileName: file.name,
        title,
        subjectName,
        status: completeResponse.data?.status || "UPLOADED"
      });
      setUploadStage("Upload completed successfully.");
      setForm({
        title: "",
        description: "",
        subjectId: ""
      });
      setFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch (requestError) {
      setUploadStage("Upload failed. Please try again.");
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to upload presentation"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard>
      <h3 className="font-display text-lg text-white">Upload Presentation</h3>
      <p className="mt-1 text-sm text-soft">
        Upload or drag & drop PPT / PPTX / PDF with title, description, and subject mapping.
      </p>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {!loadingSubjects && !error && subjects.length === 0 ? (
        <p className="mt-4 text-sm text-amber-200">
          No subjects assigned to your account yet. Please contact admin.
        </p>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        {/* DRAG & DROP FILE ZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? "border-purple-400 bg-purple-500/20 scale-[1.01]"
              : "border-white/20 bg-white/5 hover:border-white/40"
          }`}
        >
          <svg className="h-10 w-10 text-white/70 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-bold text-white">
            {isDragging ? "Drop your presentation file here!" : "Drag & drop PPT, PPTX, or PDF file here"}
          </p>
          {file && (
            <div className="mt-3 rounded-xl bg-purple-600/40 px-3 py-1.5 text-xs font-semibold text-white border border-purple-400/40">
              Selected: {file.name}
            </div>
          )}
          <p className="mt-2 text-xs text-black">Click here or drop a file</p>
          <input
            ref={fileInputRef}
            key={fileInputKey}
            id="student-presentation-file"
            type="file"
            className="sr-only"
            accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              selectFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
            disabled={loadingSubjects || subjects.length === 0 || submitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-300 md:col-span-2"
            placeholder="Presentation title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <select
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-300"
            value={form.subjectId}
            onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
            disabled={loadingSubjects || subjects.length === 0}
            required
          >
            <option value="">{loadingSubjects ? "Loading subjects..." : "Select Subject"}</option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>


        </div>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          type="submit"
          disabled={submitting || loadingSubjects || subjects.length === 0}
        >
          {submitting ? "Uploading..." : "Upload Presentation"}
        </button>
      </form>

      {submitting ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-sky-400/40 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-transparent" />
              <div>
                <h2 className="font-display text-lg font-bold text-sky-100">Uploading presentation</h2>
                <p className="mt-1 text-xs text-slate-300">Please keep this window open.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">{uploadStage || "Preparing upload..."}</span>
              <span className="font-bold text-sky-200">{uploadProgress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-xl text-emerald-300">✓</span>
              <div>
                <h2 className="font-display text-lg font-bold text-emerald-200">Upload completed</h2>
                <p className="text-xs text-emerald-100">Your presentation was uploaded successfully.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-400">File</span><span className="max-w-[230px] truncate text-right font-semibold">{result.fileName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Title</span><span className="max-w-[230px] truncate text-right font-semibold">{result.title}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Subject</span><span className="text-right font-semibold">{result.subjectName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Status</span><span className="font-bold text-emerald-300">{result.status}</span></div>
              {result.uploadId ? <div className="flex justify-between gap-4"><span className="text-slate-400">Upload ID</span><span className="max-w-[230px] truncate text-right font-mono text-xs">{result.uploadId}</span></div> : null}
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
