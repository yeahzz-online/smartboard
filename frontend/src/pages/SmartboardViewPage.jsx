import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PoweredByYeahzz } from "../components/YeahzzBranding";
import api from "../services/api";
import useAuth from "../hooks/useAuth";

const ALL_CLASSES_KEY = "__ALL_CLASSES__";

function extractGoogleDrivePreviewUrl(url = "") {
  if (!url) return null;
  const raw = String(url).trim();

  const fileDMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
  }

  const idParamMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idParamMatch && idParamMatch[1] && (raw.includes("drive.google.com") || raw.includes("docs.google.com"))) {
    return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
  }

  const slidesMatch = raw.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slidesMatch && slidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;
  }

  return null;
}

function buildOfficeViewerUrl(fileUrl) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function resolvePresentationEmbedUrl(fileUrl = "", fileType = "", engine = "auto", fileName = "") {
  if (!fileUrl) return "";
  const rawUrl = String(fileUrl).trim();

  const gdriveUrl = extractGoogleDrivePreviewUrl(rawUrl);
  if (gdriveUrl) return gdriveUrl;

  if (isPdfFile(rawUrl, fileType, fileName)) {
    return rawUrl;
  }

  if (engine === "office") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;
  }
  if (engine === "gview") {
    return `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  }
  if (engine === "direct") {
    return rawUrl;
  }

  const isOffice = isOfficePresentation(rawUrl, fileType, fileName);
  if (isOffice) {
    if (rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  }

  return rawUrl;
}

function isOfficePresentation(url = "", fileType = "", fileName = "") {
  const normalizedType = String(fileType || "").toLowerCase();
  if (
    normalizedType.includes("powerpoint") ||
    normalizedType.includes("presentationml.presentation") ||
    normalizedType.includes("presentation") ||
    normalizedType.includes("opendocument.presentation")
  ) {
    return true;
  }

  const raw = `${String(url || "").trim()} ${String(fileName || "").trim()}`;
  if (!raw) return false;

  const presentationExtensions = /\.(ppt|pptx|pptm|pps|ppsx|ppsm|pot|potx|potm|odp)(?:[?#]|$)/i;

  try {
    const pathname = new URL(raw).pathname.toLowerCase();
    return presentationExtensions.test(pathname);
  } catch (_error) {
    const withoutParams = raw.split("#")[0].split("?")[0].toLowerCase();
    return presentationExtensions.test(withoutParams);
  }
}

function isPdfFile(url = "", fileType = "", fileName = "") {
  const normalizedType = String(fileType || "").toLowerCase();
  if (normalizedType.includes("pdf")) return true;
  const raw = `${String(url || "").trim()} ${String(fileName || "").trim()}`;
  if (!raw) return false;

  try {
    const pathname = new URL(raw).pathname.toLowerCase();
    return pathname.endsWith(".pdf");
  } catch (_error) {
    const withoutParams = raw.split("#")[0].split("?")[0].toLowerCase();
    return withoutParams.endsWith(".pdf");
  }
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function getClassLabel(item) {
  if (!item) return "Class";
  if (item.name) return item.name;
  const dept = item.departmentCode || item.department || "Class";
  const section = item.section || "";
  return `${dept} ${section}`.trim();
}

export default function SmartboardViewPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Smart board ready.");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (typeof logout === "function") {
        await logout();
      }
    } catch (_err) {
      // ignore logout network errors
    }
    navigate("/smartboard/login", { replace: true });
  };

  const [faculty, setFaculty] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedPresentationId, setSelectedPresentationId] = useState("");
  const [previewFileUrl, setPreviewFileUrl] = useState("");
  const [previewFileType, setPreviewFileType] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerEngine, setViewerEngine] = useState("auto");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const switchViewerEngine = (engine) => {
    if (!previewFile) return;
    const rawUrl = previewFile.fileUrl || "";
    const newEmbed = resolvePresentationEmbedUrl(
      rawUrl,
      previewFile.fileType || previewFileType,
      engine,
      previewFile.fileName
    );
    setViewerEngine(engine);
    setPreviewFileUrl(newEmbed);
  };

  const loadLibrary = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/auth/smartboard/library");
      const payload = response.data || {};
      const nextClasses = payload.classes || [];
      const nextSubjects = payload.subjects || [];
      const nextPresentations = payload.presentations || [];
      const nextFacultyList = payload.facultyList || [];

      setFaculty(
        payload.faculty || {
          name: user?.facultyName || user?.name || "Faculty",
          email: user?.email || ""
        }
      );
      setClasses(nextClasses);
      setSubjects(nextSubjects);
      setPresentations(nextPresentations);
      setFacultyList(nextFacultyList);
      setSelectedFacultyId("");

      if (nextClasses.length > 0) {
        if (nextClasses.length === 1) {
          setSelectedClassId(String(nextClasses[0].id));
        } else {
          setSelectedClassId(ALL_CLASSES_KEY);
        }
      } else {
        setSelectedClassId("");
      }
      setStatus("Smartboard library loaded.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load smartboard classes");
      setStatus("Unable to load smartboard library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const subjectsByClass = useMemo(() => {
    const grouped = new Map();
    (subjects || []).forEach((item) => {
      const key = String(item.classId || "");
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    return grouped;
  }, [subjects]);

  const presentationsByClass = useMemo(() => {
    const grouped = new Map();
    (presentations || []).forEach((item) => {
      const key = String(item.classId || "");
      if (!key || !item?.fileUrl) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    grouped.forEach((rows, key) => {
      rows.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
      grouped.set(key, rows);
    });
    return grouped;
  }, [presentations]);

  const filteredPresentationsByClass = useMemo(() => {
    if (!selectedFacultyId) return presentationsByClass;
    const filtered = new Map();
    presentationsByClass.forEach((rows, classId) => {
      const filteredRows = rows.filter((r) => String(r.facultyId || "") === String(selectedFacultyId));
      if (filteredRows.length) filtered.set(classId, filteredRows);
    });
    return filtered;
  }, [presentationsByClass, selectedFacultyId]);

  const selectedClass = useMemo(
    () =>
      String(selectedClassId) === ALL_CLASSES_KEY
        ? null
        : classes.find((item) => String(item.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );

  const allClassPresentations = useMemo(() => {
    return (presentations || [])
      .filter((item) => item?.fileUrl)
      .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  }, [presentations]);

  const selectedSubjectCount = useMemo(() => {
    if (String(selectedClassId) === ALL_CLASSES_KEY) return (subjects || []).length;
    if (!selectedClass) return 0;
    return (subjectsByClass.get(String(selectedClass.id)) || []).length;
  }, [selectedClass, selectedClassId, subjects, subjectsByClass]);

  const selectedClassLabel = useMemo(() => {
    if (String(selectedClassId) === ALL_CLASSES_KEY) return "All Classes";
    if (!selectedClass) return "Select a Class";
    return getClassLabel(selectedClass);
  }, [selectedClass, selectedClassId]);

  const subjectsByFaculty = useMemo(() => {
    const grouped = new Map();
    (subjects || []).forEach((subject) => {
      const facultyId = subject?.facultyId || subject?.faculty?.id;
      if (!facultyId) return;
      if (!grouped.has(String(facultyId))) grouped.set(String(facultyId), []);
      grouped.get(String(facultyId)).push(subject);
    });

    grouped.forEach((rows) => {
      rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
    });

    return grouped;
  }, [subjects]);

  const visibleSubjectsByFaculty = useMemo(() => {
    const grouped = new Map();
    (facultyList || []).forEach((facultyItem) => {
      const facultyId = String(facultyItem?.id || "");
      if (!facultyId) return;

      let rows = subjectsByFaculty.get(facultyId) || [];
      if (String(selectedClassId) !== ALL_CLASSES_KEY && selectedClass?.id) {
        rows = rows.filter((subject) => String(subject.classId || "") === String(selectedClass.id));
      }

      grouped.set(facultyId, rows);
    });

    return grouped;
  }, [facultyList, selectedClass, selectedClassId, subjectsByFaculty]);

  const currentFaculty = useMemo(() => {
    return (facultyList.find((f) => String(f.id) === String(selectedFacultyId)) || faculty) || null;
  }, [facultyList, faculty, selectedFacultyId]);

  const currentFacultySubjects = useMemo(() => {
    if (!currentFaculty) return [];
    return visibleSubjectsByFaculty.get(String(currentFaculty.id)) || [];
  }, [visibleSubjectsByFaculty, currentFaculty]);

  const selectedClassPresentations = useMemo(() => {
    const source = String(selectedClassId) === ALL_CLASSES_KEY
      ? allClassPresentations
      : (filteredPresentationsByClass.get(String(selectedClassId || "")) || []);
    if (String(selectedClassId) === ALL_CLASSES_KEY && selectedFacultyId) {
      return source.filter((p) => String(p.facultyId || "") === String(selectedFacultyId));
    }
    return source;
  }, [allClassPresentations, filteredPresentationsByClass, selectedClassId, selectedFacultyId]);

  const pagedPresentations = useMemo(() => {
    if (!selectedClassPresentations || !selectedClassPresentations.length) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return selectedClassPresentations.slice(start, start + itemsPerPage);
  }, [selectedClassPresentations, currentPage]);

  const totalPages = Math.max(1, Math.ceil((selectedClassPresentations.length || 0) / itemsPerPage));

  const selectedClassSubtitle = useMemo(() => {
    if (String(selectedClassId) === ALL_CLASSES_KEY) return "All classes view";
    if (!selectedClass) return "Select a class to open";
    const parts = [];
    if (selectedClass.departmentCode || selectedClass.department) {
      parts.push(selectedClass.departmentCode || selectedClass.department);
    }
    if (selectedClass.year) parts.push(`Year ${selectedClass.year}`);
    if (selectedClass.section) parts.push(`Section ${selectedClass.section}`);
    return parts.length ? parts.join(" | ") : "Class details";
  }, [selectedClass, selectedClassId]);

  const selectedClassSummaryText = useMemo(() => {
    if (String(selectedClassId) === ALL_CLASSES_KEY) {
      return `${classes.length} class(es) | ${selectedClassPresentations.length} presentation(s)`;
    }
    if (!selectedClass) return "No class selected";
    return `${selectedSubjectCount} subject(s) | ${selectedClassPresentations.length} presentation(s)`;
  }, [classes.length, selectedClass, selectedClassId, selectedClassPresentations.length, selectedSubjectCount]);

  useEffect(() => {
    if (!selectedClassPresentations.length) {
      setSelectedPresentationId("");
      return;
    }
    const exists = selectedClassPresentations.some((item) => String(item.id) === String(selectedPresentationId));
    if (!exists) {
      setSelectedPresentationId(String(selectedClassPresentations[0].id));
    }
  }, [selectedClassPresentations, selectedPresentationId]);

  const chooseClass = (classId) => {
    setSelectedClassId(String(classId));
    setCurrentPage(1);
    setStatus(String(classId) === ALL_CLASSES_KEY ? "All classes view opened." : "Class view opened.");
  };

  const chooseFaculty = (facultyId) => {
    setSelectedFacultyId(facultyId ? String(facultyId) : "");
    setCurrentPage(1);
    setStatus(facultyId ? "Faculty filter applied." : "Faculty filter cleared.");
  };

  const openPresentation = async (presentation) => {
    if (!presentation?.id) return;
    setStatus(`Opening "${presentation.title || presentation.fileName || "presentation"}"...`);
    try {
      let fileUrl = presentation.fileUrl;
      if (!fileUrl) {
        const response = await api.get("/storage/file-url", {
          params: { uploadId: presentation.id }
        });
        fileUrl = response.data?.url;
      }
      if (!fileUrl) {
        throw new Error("Unable to retrieve file URL");
      }

      const launchUrl = resolvePresentationEmbedUrl(
        fileUrl,
        presentation.fileType,
        "auto",
        presentation.fileName
      );

      setSelectedPresentationId(String(presentation.id));
      setPreviewFile({ ...presentation, fileUrl });
      setPreviewFileUrl(launchUrl);
      setPreviewFileType(presentation.fileType || "");
      setViewerEngine("auto");
      setStatus(`Previewing "${presentation.title || presentation.fileName || "presentation"}".`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Failed to open presentation");
      setStatus("Unable to open presentation.");
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-gradient-to-br from-violet-200/50 via-purple-100/40 to-transparent blur-3xl" />
        <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-100/40 via-teal-100/30 to-transparent blur-3xl" />
      </div>

      {/* Header bar */}
      <header className="relative z-20 h-16 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src="/auth-assets/logo.jpg"
            alt="CMR College logo"
            className="h-10 w-10 rounded-xl object-cover shadow-md ring-2 ring-slate-200"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Smartboard Viewer</h1>
            <p className="text-xs text-slate-500 font-medium">{selectedClassSummaryText}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
          {status ? (
            <span className="flex max-w-[46vw] items-center gap-2 rounded-full border border-violet-200/60 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 sm:max-w-[260px] sm:px-3">
              <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-violet-500" />
              <span className="truncate">{status}</span>
            </span>
          ) : null}
          <PoweredByYeahzz showText={false} logoClassName="h-7 w-24" className="shrink-0" />
        </div>
      </header>

      {/* Error alert banner */}
      {error ? (
        <div className="relative z-20 bg-rose-50 border-b border-rose-200 px-6 py-2 flex items-center justify-between text-xs text-rose-700 font-medium">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-800 font-bold">Dismiss</button>
        </div>
      ) : null}

      {/* Main Container: Fixed Left Sidebar + Scrollable Right Content */}
      <div className="relative z-10 flex-1 grid grid-cols-[280px_1fr] gap-6 p-6 overflow-hidden max-w-[1700px] w-full mx-auto">

        {/* LEFT COLUMN: Top Faculty Sidebar Card + Bottom Profile Menu Card */}
        <div className="h-full flex flex-col gap-3 overflow-hidden">
          {/* Top Departments & Faculty Card */}
          <aside className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xs flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Departments & Faculty</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {facultyList.length} Faculty
              </span>
            </div>

            {/* Class selection dropdown if multiple classes */}
            {classes.length > 1 && (
              <div className="space-y-1.5 shrink-0">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Class Filter</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => chooseClass(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-xs"
                >
                  <option value={ALL_CLASSES_KEY}>All Classes ({classes.length})</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{getClassLabel(c)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Faculty List */}
            <div className="space-y-2">
              {facultyList.map((f) => {
                const active = String(f.id) === String(selectedFacultyId);
                const subjects = visibleSubjectsByFaculty.get(String(f.id)) || [];
                const avatar = f.avatarUrl || f.profilePhoto || "/auth-assets/people-svgrepo-com.svg";

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => chooseFaculty(f.id)}
                    className={`w-full flex items-start gap-3 rounded-xl p-3 text-left transition-all ${active
                      ? "bg-violet-50 border-2 border-violet-400 text-violet-950 shadow-xs"
                      : "hover:bg-slate-50 border border-slate-200/60 text-slate-700"
                      }`}
                  >
                    <img
                      src={avatar}
                      alt={f.name}
                      className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5 shadow-xs"
                      onError={(e) => { e.target.src = "/auth-assets/people-svgrepo-com.svg"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{f.name || "Faculty"}</p>
                      {f.department || f.departmentCode ? (
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mt-0.5">
                          {f.departmentCode || f.department}
                        </span>
                      ) : null}

                      {/* Display Subject Names clearly below Faculty */}
                      {subjects.length > 0 ? (
                        <div className="mt-1.5 space-y-1">
                          {subjects.map((s) => (
                            <div key={s.id} className="text-[11px] font-bold text-black px-2 py-0.5 rounded-md border border-violet-100 flex items-center gap-1 min-w-0">
                              <span className="truncate">{s.name || s.title || s.code}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-slate-400 mt-1 italic">
                          General / No subjects
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* BOTTOM STANDALONE PROFILE CARD (COMPLETELY OUTSIDE SIDEBAR CARD) */}
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2.5 rounded-xl p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 transition-all shadow-xs"
              title="Profile & Options"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || user?.facultyName || faculty?.name || "Smartboard"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">Profile & Options</p>
                </div>
              </div>

              {/* 3-line hamburger icon */}
              <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
            </button>

            {/* Profile Dropdown Options Card (Opens Upward) */}
            {menuOpen ? (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />

                <div className="absolute left-0 bottom-16 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.name || user?.facultyName || faculty?.name || "Smartboard Profile"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user?.email || "smartboard@cmrcet.ac.in"}
                      </p>
                    </div>
                  </div>

                  {/* Profile Details: Class Name & Branch */}
                  <div className="py-3 space-y-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-500">Class Name:</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[140px]">
                        {selectedClassLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-500">Branch / Dept:</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[140px]">
                        {selectedClass?.department || selectedClass?.departmentCode || currentFaculty?.department || user?.department || "CSE"}
                      </span>
                    </div>

                    {selectedClassSubtitle ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-500">Details:</span>
                        <span className="font-bold text-slate-700 text-right truncate max-w-[140px]">
                          {selectedClassSubtitle}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Log Out Option */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 border border-rose-200/80 transition shadow-xs"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* RIGHT SIDE MAIN SECTION - SCROLLABLE UP & DOWN */}
        <main className="h-full overflow-y-auto pr-2 space-y-6">


          {/* Loading Indicator */}
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
                <p className="text-sm font-semibold text-slate-600">Loading presentations library...</p>
              </div>
            </div>
          ) : null}

          {/* Presentations Cards Grid */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pagedPresentations.map((ppt) => {
                const isPdf = isPdfFile(ppt.fileUrl, ppt.fileType, ppt.fileName);
                const isPpt = isOfficePresentation(ppt.fileUrl, ppt.fileType, ppt.fileName);
                const studentDp = ppt.uploadedByPhoto || ppt.avatarUrl || "/auth-assets/people-svgrepo-com.svg";
                const studentName = ppt.uploadedByName || "Student";
                const rollNo = ppt.rollNumber || null;

                return (
                  <div
                    key={ppt.id}
                    onClick={() => openPresentation(ppt)}
                    className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-xl hover:border-violet-400 hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden"
                  >
                    {/* Thumbnail Image Area */}
                    <div className="relative h-44 bg-slate-800 overflow-hidden">
                      <img
                        src={ppt.thumbnailUrl || "/auth-assets/images.png"}
                        alt={ppt.title || ppt.fileName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/auth-assets/images.png";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />

                      {/* File Type Badge (PPTX / PDF / Document) */}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-md ${isPdf
                          ? "bg-rose-600 text-white"
                          : isPpt
                            ? "bg-amber-500 text-white"
                            : "bg-indigo-600 text-white"
                          }`}>
                          {isPdf ? "PDF" : isPpt ? "PPTX" : "DOCUMENT"}
                        </span>
                      </div>

                      {/* Slide Title Preview Overlay */}
                      <div className="absolute bottom-3 left-3 right-12 text-white">
                        <p className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-violet-200 transition-colors">
                          {ppt.title || ppt.fileName}
                        </p>
                      </div>

                      {/* Fullscreen Prompt on Hover */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold bg-white/95 text-slate-900 px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-violet-600 transition-colors">
                          {ppt.title || ppt.fileName || "Untitled Presentation"}
                        </h3>
                        {ppt.description || ppt.summary ? (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 font-normal">
                            {ppt.description || ppt.summary}
                          </p>
                        ) : null}
                      </div>

                      {/* Student Profile: Roll Number and DP */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={studentDp}
                            alt={studentName}
                            className="h-9 w-9 rounded-full border-2 border-violet-100 object-cover shrink-0 shadow-xs"
                            onError={(e) => { e.target.src = "/auth-assets/people-svgrepo-com.svg"; }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{studentName}</p>
                            {rollNo ? (
                              <p className="text-[11px] font-bold text-violet-600 truncate mt-0.5">
                                Roll: {rollNo}
                              </p>
                            ) : (
                              <p className="text-[10px] font-medium text-slate-400">Student</p>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {formatDateTime(ppt.uploadedAt).split(",")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && selectedClassPresentations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 mb-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Presentations Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No PowerPoint or PDF presentations match the currently selected faculty or class.
              </p>
            </div>
          ) : null}

          {/* Pagination Controls */}
          {selectedClassPresentations.length > itemsPerPage ? (
            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs"
              >
                ← Previous
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs"
              >
                Next →
              </button>
            </div>
          ) : null}
        </main>
      </div>

      {/* FULL SCREEN FILE PREVIEW MODAL (STUNNING MODERN GLASSMORPHIC UI) */}
      {previewFileUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#07080b] text-white animate-in fade-in duration-200">
          {/* Top Fullscreen Glassmorphic Header */}
          <div className="hidden">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative">
                <img
                  src={previewFile?.uploadedByPhoto || previewFile?.avatarUrl || "/auth-assets/people-svgrepo-com.svg"}
                  alt="Student DP"
                  className="h-10 w-10 rounded-full border-2 border-violet-400/80 object-cover text-white shrink-0 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/30"
                  onError={(e) => { e.target.src = "/auth-assets/people-svgrepo-com.svg"; }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0e1017]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight truncate">
                  {previewFile?.title || previewFile?.fileName || "Presentation Full Screen View"}
                </h2>
                <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {previewFile?.uploadedByName || "Student"}
                  </span>
                  {previewFile?.rollNumber ? (
                    <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-400/30 font-bold text-[11px]">
                      {previewFile.rollNumber}
                    </span>
                  ) : null}
                  {previewFile?.subjectName ? (
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-[11px] font-medium">
                      {previewFile.subjectName}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Engine Switcher Pills */}
              <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => switchViewerEngine("office")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    viewerEngine === "office"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  title="View with Microsoft Office Online Engine"
                >
                  Office Online
                </button>
                <button
                  type="button"
                  onClick={() => switchViewerEngine("gview")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    viewerEngine === "gview"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  title="View with Google Docs Viewer Engine"
                >
                  Google Viewer
                </button>
                <button
                  type="button"
                  onClick={() => switchViewerEngine("direct")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    viewerEngine === "direct"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  title="View Direct File / Native Browser Embed"
                >
                  Direct View
                </button>
              </div>

              {/* Download Direct Action */}
              {previewFile?.fileUrl ? (
                <a
                  href={previewFile.fileUrl}
                  download
                  className="hidden sm:flex text-xs font-bold px-3.5 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all items-center gap-1.5 shadow-lg shadow-indigo-500/10"
                  title="Download presentation file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              ) : null}

              {/* Open Original Action */}
              <a
                href={previewFile?.fileUrl || previewFileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Original
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFileUrl("");
                  setPreviewFileType("");
                  setPreviewFile(null);
                }}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-110 text-white font-bold text-xs px-4 py-2 transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <span>✕</span> Close
              </button>
            </div>
          </div>

          {/* Fullscreen Iframe Canvas */}
          <div className="group relative flex-1 w-full h-full bg-[#07080b] overflow-hidden flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setPreviewFileUrl("");
                setPreviewFileType("");
                setPreviewFile(null);
              }}
              className="absolute right-4 top-4 z-30 rounded-lg bg-black/60 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity hover:bg-rose-600 group-hover:opacity-100 focus:opacity-100"
              aria-label="Close presentation viewer"
            >
              ✕ Close
            </button>
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <iframe
              src={previewFileUrl}
              title="full-screen-presentation-preview"
              className="relative z-10 h-full w-full border-0 bg-white shadow-2xl transition-all"
              allowFullScreen
            />

            {/* Bottom Floating Glass Action Bar */}
            <div className="hidden">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-200">
                  {isPdfFile(previewFile?.fileUrl, previewFile?.fileType, previewFile?.fileName)
                    ? "PDF Document"
                    : "Presentation Viewer"}
                </span>
                <span className="text-slate-500 hidden sm:inline">|</span>
                <span className="text-slate-400 hidden sm:inline">
                  If document embed fails:
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewFile?.fileUrl || previewFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-violet-400 hover:text-violet-300 underline flex items-center gap-1"
                >
                  Open in New Window ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

