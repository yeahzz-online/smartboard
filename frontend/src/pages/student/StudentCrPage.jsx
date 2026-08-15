import { useEffect, useState } from "react";
import PageLoader from "../../components/PageLoader";
import useAuth from "../../hooks/useAuth";
import api from "../../services/api";
import { resolveAssetUrl } from "../../utils/urlUtils";

export default function StudentCrPage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    subjects: [],
    selectedSubjectId: null,
    subject: null,
    stats: null,
    students: [],
    classInfo: null,
    isCr: false
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState(null); // null = All Folders View
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, UPLOADED, PENDING
  const [searchQuery, setSearchQuery] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [savingDriveUrl, setSavingDriveUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    title: "",
    fileUrl: "",
    officeViewerUrl: ""
  });
  const [openingUploadId, setOpeningUploadId] = useState(null);

  const loadClassStatus = async (subjectId = selectedSubjectId) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/student/class-status", {
        params: { subjectId: subjectId || undefined }
      });
      const resData = res.data || {};
      setData(resData);
      if (resData?.classInfo?.driveFolderUrl !== undefined) {
        setDriveUrlInput(resData.classInfo.driveFolderUrl || "");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load class status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassStatus(selectedSubjectId);
  }, [selectedSubjectId]);

  const handleOpenFolder = (sId) => {
    setSelectedSubjectId(sId);
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  const handleBackToFolders = () => {
    setSelectedSubjectId(null);
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  const handleSaveDriveUrl = async (e) => {
    e?.preventDefault?.();
    setSavingDriveUrl(true);
    setError("");
    setMessage("");
    try {
      const res = await api.put("/student/class-status/drive-link", {
        driveFolderUrl: driveUrlInput.trim()
      });
      setMessage(res.data?.message || "Drive link updated successfully");
      loadClassStatus(selectedSubjectId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save Google Drive link");
    } finally {
      setSavingDriveUrl(false);
    }
  };

  const handleCopyDriveLink = () => {
    const link = data.classInfo?.driveFolderUrl || driveUrlInput;
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const fetchSignedFileUrl = async (uploadId) => {
    const res = await api.get("/storage/file-url", { params: { uploadId } });
    return res.data?.url;
  };

  const handleOpenFile = async (up) => {
    setOpeningUploadId(up.id);
    setError("");
    try {
      const url = await fetchSignedFileUrl(up.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else if (up.fileUrl) {
        window.open(up.fileUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      if (up.fileUrl) {
        window.open(up.fileUrl, "_blank", "noopener,noreferrer");
      } else {
        setError(err?.response?.data?.message || "Failed to open presentation file");
      }
    } finally {
      setOpeningUploadId(null);
    }
  };

  const handlePreviewFile = async (up) => {
    setOpeningUploadId(up.id);
    setError("");
    try {
      const url = (await fetchSignedFileUrl(up.id)) || up.fileUrl;
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      setPreviewModal({
        isOpen: true,
        title: up.title || "Presentation Preview",
        fileUrl: url,
        officeViewerUrl
      });
    } catch (_err) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(up.fileUrl)}`;
      setPreviewModal({
        isOpen: true,
        title: up.title || "Presentation Preview",
        fileUrl: up.fileUrl,
        officeViewerUrl
      });
    } finally {
      setOpeningUploadId(null);
    }
  };

  if (loading && !data.subject && (data.subjects || []).length === 0) {
    return <PageLoader label="Loading Class Folders..." />;
  }

  const currentSubject = data.subject || (data.subjects || []).find((s) => s.id === selectedSubjectId);
  const allSubjects = data.subjects || [];

  // Total statistics across all class subject folders
  const totalClassUploads = allSubjects.reduce((acc, s) => acc + (s.uploadedCount || 0), 0);
  const totalPossibleUploads = allSubjects.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
  const overallCompletionRate = totalPossibleUploads > 0 ? Math.round((totalClassUploads / totalPossibleUploads) * 100) : 0;

  const filteredFolders = allSubjects.filter((s) => {
    if (!folderSearch.trim()) return true;
    const q = folderSearch.toLowerCase().trim();
    return (s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q) || (s.facultyName || "").toLowerCase().includes(q);
  });

  const filteredStudents = (data.students || []).filter((s) => {
    if (statusFilter === "UPLOADED" && !s.hasUploaded) return false;
    if (statusFilter === "PENDING" && s.hasUploaded) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.rollNumber || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <section className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* PAGE STEP 1: MAIN CLASS SUBJECT FOLDERS VIEW */}
      {!selectedSubjectId ? (
        <>
          {/* Top Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white from-slate-900 via-purple-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-amber-400/90 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow">
                    👑 Class Representative (CR) Overview
                  </span>
                  {data.classInfo && (
                    <span className="text-xs text-slate-300 font-medium">
                      {data.classInfo.departmentCode || data.classInfo.department} • Year {data.classInfo.year} • Section {data.classInfo.section}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  {data.classInfo?.name || "Class Subject Folders"}
                </h1>
                <p className="text-sm text-slate-300">
                  Select a subject folder below to open and view uploaded student presentations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadClassStatus(null)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  🔄 Refresh Status
                </button>
                {data.classInfo?.driveFolderUrl && (
                  <a
                    href={data.classInfo.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-600 flex items-center gap-1.5"
                  >
                    <span>📂 Class Google Drive</span>
                    <span>↗</span>
                  </a>
                )}
              </div>
            </div>

            {/* Overall Class Progress Summary */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-5 border-t border-white/10">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Subject Folders</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{allSubjects.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Class Submissions</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-400">{totalClassUploads}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Completion Rate</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-300">{overallCompletionRate}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Current View</p>
                <p className="mt-1 text-xs font-extrabold text-purple-300">📁 All Subject Folders</p>
              </div>
            </div>
          </div>

          {/* Search Bar for Folders */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <h3 className="text-base font-bold text-[#141414]">Class Folders ({filteredFolders.length})</h3>
            </div>

            <input
              type="text"
              placeholder="Search by subject code or title..."
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#141414] placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 w-full sm:w-80"
            />
          </div>

          {/* CLASS SUBJECT FOLDERS GRID */}
          {filteredFolders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
              <p className="text-base font-semibold">No subject folders found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredFolders.map((sub) => {
                const percent = sub.totalStudents > 0 ? Math.round((sub.uploadedCount / sub.totalStudents) * 100) : 0;
                const pendingCount = Math.max((sub.totalStudents || 0) - (sub.uploadedCount || 0), 0);

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleOpenFolder(sub.id)}
                    className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-purple-400 hover:shadow-xl flex flex-col justify-between"
                  >
                    {/* Folder Tab Shape Header */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 border border-amber-300 text-2xl text-amber-900 shadow-sm group-hover:scale-105 transition">
                            📂
                          </div>
                          <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200">
                            {sub.code}
                          </span>
                        </div>

                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-extrabold text-emerald-800">
                          {sub.uploadedCount} Uploaded
                        </span>
                      </div>

                      <div className="space-y-1 my-2">
                        <h4 className="font-bold text-lg text-[#141414] group-hover:text-purple-700 transition line-clamp-2">
                          {sub.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {sub.facultyName ? `Faculty: ${sub.facultyName}` : "Faculty not assigned"}
                        </p>
                      </div>
                    </div>

                    {/* Submission Progress & Metrics */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">Upload Progress:</span>
                        <span className="font-extrabold text-emerald-700">
                          {sub.uploadedCount} / {sub.totalStudents} ({percent}%)
                        </span>
                      </div>

                      {/* Visual Progress Meter */}
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">
                          ✓ {sub.uploadedCount} Uploaded
                        </span>
                        <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-rose-700">
                          ⏳ {pendingCount} Pending
                        </span>
                      </div>

                      {/* Click Open Folder Indicator Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full rounded-xl bg-slate-900 group-hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow transition flex items-center justify-center gap-1.5"
                        >
                          <span>📂 Open Subject Folder</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* PAGE STEP 2: INSIDE OPENED SUBJECT FOLDER VIEW */
        <div className="space-y-6">
          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToFolders}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-4 py-2 text-xs font-bold text-white transition shadow-md"
              >
                <span>← Back to All Folders</span>
              </button>
              <span className="text-slate-300 font-bold">/</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">📂</span>
                <span className="font-extrabold text-[#141414] text-base sm:text-lg">
                  {currentSubject?.code} - {currentSubject?.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadClassStatus(selectedSubjectId)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              🔄 Refresh Folder
            </button>
          </div>

          {/* Folder Details Banner */}
          {currentSubject && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-200 bg-purple-900/60 px-2.5 py-0.5 rounded-md border border-purple-400/40">
                      {currentSubject.code}
                    </span>
                    {currentSubject.facultyName && (
                      <span className="text-xs text-black  font-medium">
                        Faculty: <span className="text-white-600  bg-white font-bold">{currentSubject.facultyName}</span>
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    📂 {currentSubject.name} Folder
                  </h2>
                  <p className="text-xs text-white">
                    Viewing all student presentation submissions uploaded for this subject folder.
                  </p>
                </div>

                {data.classInfo?.driveFolderUrl && (
                  <a
                    href={data.classInfo.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition flex items-center gap-1.5 shrink-0"
                  >
                    <span>Open Drive Folder ↗</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Folder Submission Stats Cards */}
          {data.stats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Roll Count</p>
                <p className="mt-2 text-3xl font-extrabold text-[#141414]">{data.stats.total || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Total enrolled students</p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Uploaded PPTs</p>
                  <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                    {data.stats.total ? Math.round((data.stats.uploaded / data.stats.total) * 100) : 0}%
                  </span>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">{data.stats.uploaded || 0}</p>
                <p className="mt-1 text-xs text-emerald-800">Completed presentation uploads</p>
              </div>

              <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Pending Uploads</p>
                  <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-extrabold text-rose-900">
                    {data.stats.total ? Math.round((data.stats.notUploaded / data.stats.total) * 100) : 0}%
                  </span>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-rose-700">{data.stats.notUploaded || 0}</p>
                <p className="mt-1 text-xs text-rose-800">Awaiting student submission</p>
              </div>
            </div>
          )}

          {/* Students Submissions Table Container */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-[#141414]">
                  Student Submissions Roster ({currentSubject?.code})
                </h3>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700">
                  {filteredStudents.length} Students
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter Buttons */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${statusFilter === "ALL" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    All ({(data.students || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("UPLOADED")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${statusFilter === "UPLOADED" ? "bg-emerald-600 text-white shadow" : "text-emerald-700 hover:text-emerald-900"
                      }`}
                  >
                    Uploaded ({(data.students || []).filter(s => s.hasUploaded).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("PENDING")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${statusFilter === "PENDING" ? "bg-rose-600 text-white shadow" : "text-rose-700 hover:text-rose-900"
                      }`}
                  >
                    Pending ({(data.students || []).filter(s => !s.hasUploaded).length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search roll no or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#141414] placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 w-48 sm:w-60"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-10 font-semibold">
                No students match your filter criteria in folder {currentSubject?.code}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 rounded-l-xl">Student Name & Email</th>
                      <th className="px-4 py-3">Roll Number</th>
                      <th className="px-4 py-3">Submission Status</th>
                      <th className="px-4 py-3">Uploaded PPT Files ({currentSubject?.code})</th>
                      <th className="px-4 py-3 rounded-r-xl">Latest Upload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => (
                      <tr
                        key={st.id}
                        className={`transition hover:bg-slate-50 ${st.isMe ? "bg-purple-50/50 font-medium" : ""
                          }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {st.profilePhoto ? (
                              <img
                                src={resolveAssetUrl(st.profilePhoto)}
                                alt={st.name}
                                className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src = "/auth-assets/profile-placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm">
                                {(st.name || "S").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#141414] text-sm">{st.name}</span>
                                {st.isMe && (
                                  <span className="rounded-md bg-purple-100 border border-purple-300 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
                                    You
                                  </span>
                                )}
                                {st.isCr && (
                                  <span className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                                    CR
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-normal">{st.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">
                          {st.rollNumber || "-"}
                        </td>

                        <td className="px-4 py-3.5">
                          {st.hasUploaded ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-600" />
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300 px-3 py-1 text-xs font-bold text-rose-800">
                              <span className="h-2 w-2 rounded-full bg-rose-600" />
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {st.uploads && st.uploads.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {st.uploads.map((up) => (
                                <div key={up.id} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 p-1.5 text-xs text-[#141414] shadow-sm">
                                  <span className="max-w-[140px] truncate font-bold px-1" title={up.title}>
                                    📄 {up.title}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={openingUploadId === up.id}
                                    onClick={() => handlePreviewFile(up)}
                                    className="rounded-lg bg-purple-700 hover:bg-purple-800 px-2.5 py-1 text-[11px] font-bold text-white shadow transition"
                                    title="Preview presentation"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    disabled={openingUploadId === up.id}
                                    onClick={() => handleOpenFile(up)}
                                    className="rounded-lg bg-slate-800 hover:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow transition"
                                    title="Open original presentation file"
                                  >
                                    ↗
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">No PPT submitted</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                          {st.latestUploadAt ? new Date(st.latestUploadAt).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Drive Link Manager Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <h3 className="font-bold text-[#141414] text-base">
                Class Google Drive Folder Link
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Add or update the shared Google Drive folder link for your class PPTs and resources.
            </p>
          </div>

          {data.classInfo?.driveFolderUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDriveLink}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                {copiedLink ? "✓ Copied!" : "📋 Copy Link"}
              </button>
              <a
                href={data.classInfo.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Open Folder ↗
              </a>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveDriveUrl} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="url"
            placeholder="https://drive.google.com/drive/folders/..."
            value={driveUrlInput}
            onChange={(e) => setDriveUrlInput(e.target.value)}
            className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#141414] placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          <button
            type="submit"
            disabled={savingDriveUrl}
            className="w-full sm:w-auto rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 shrink-0 shadow-md"
          >
            {savingDriveUrl ? "Saving..." : "Save Drive Link"}
          </button>
        </form>
      </div>

      {/* Presentation Fullscreen Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6">
          <div className="flex flex-col h-[90vh] w-full max-w-6xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-bold text-base text-white truncate max-w-md">
                  {previewModal.title}
                </h4>
              </div>
              <div className="flex items-center gap-3">
                {previewModal.fileUrl && (
                  <a
                    href={previewModal.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                  >
                    Open Original ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, title: "", fileUrl: "", officeViewerUrl: "" })}
                  className="rounded-xl bg-red-600 border border-red-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
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

      {message && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{message}</p>}
      {error && <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
    </section>
  );
}
