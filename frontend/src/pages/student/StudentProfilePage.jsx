import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PoweredByYeahzz } from "../../components/YeahzzBranding";
import api from "../../services/api";
import { resolveAssetUrl } from "../../utils/urlUtils";
import useAuth from "../../hooks/useAuth";
import { getStudentUiPrefs, setStudentUiPrefs } from "../../services/studentUiPrefs";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function getInitials(name) {
  const clean = String(name || "").trim();
  if (!clean) return "ST";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatDateTime(value) {
  if (!value) return "First login session";
  try {
    return new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return String(value);
  }
}

// Icon helper for profile UI
function Icon({ name, className = "w-5 h-5" }) {
  if (name === "user") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    );
  }
  if (name === "hash") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    );
  }
  if (name === "academic") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  }
  if (name === "eye") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );
  }
  if (name === "eye-off") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.97 8.97 0 013.122-.563c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-3.18-3.18a3 3 0 01-4.242-4.242M3 3l18 18" />
      </svg>
    );
  }
  if (name === "camera") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (name === "cloud-upload") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (name === "crown") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 16l-1-8 5 3 3-6 3 6 5-3-1 8H5z" />
      </svg>
    );
  }
  if (name === "moon") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (name === "upload") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    );
  }
  if (name === "external") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
  }
  if (name === "chevron") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  return null;
}

export default function StudentProfilePage() {
  const { user, updateUserSession, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    subjectsCount: 0,
    uploadedCount: 0,
    pendingCount: 0
  });

  const [activeTab, setActiveTab] = useState("personal");

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    profilePhoto: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [darkMode, setDarkMode] = useState(() => getStudentUiPrefs().darkMode);
  const [openFaq, setOpenFaq] = useState(null);

  // Compute combined user profile info
  const fullName = String(form.name || profileData?.name || user?.name || "Student").trim();
  const rollNumber = profileData?.rollNumber || user?.rollNumber || "Not assigned";
  const branch = profileData?.branch || user?.branch || "CSE";
  const year = profileData?.year || user?.year || "-";
  const section = profileData?.section || user?.section || "-";
  const email = profileData?.email || user?.email || "";
  const isCr = Boolean(profileData?.isCr ?? user?.isCr);
  const lastLoginAt = profileData?.lastLoginAt || user?.lastLoginAt;

  const profilePhoto = useMemo(
    () => resolveAssetUrl(form.profilePhoto || profileData?.profilePhoto || user?.profilePhoto || ""),
    [form.profilePhoto, profileData?.profilePhoto, user?.profilePhoto]
  );

  // Profile Completeness Score Calculation
  const profileCompleteness = useMemo(() => {
    let score = 30;
    if (fullName) score += 20;
    if (form.mobile) score += 20;
    if (profilePhoto) score += 20;
    if (rollNumber && rollNumber !== "Not assigned") score += 10;
    return Math.min(score, 100);
  }, [fullName, form.mobile, profilePhoto, rollNumber]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = passwordForm.newPassword;
    if (!pwd) return { label: "", score: 0, color: "bg-slate-200" };
    if (pwd.length < 8) return { label: "Weak (Min 8 characters required)", score: 33, color: "bg-red-500" };
    const hasNumOrSymbol = /[0-9!@#$%^&*()]/.test(pwd);
    if (pwd.length >= 10 && hasNumOrSymbol) return { label: "Strong & Secure", score: 100, color: "bg-emerald-500" };
    return { label: "Medium", score: 66, color: "bg-amber-500" };
  }, [passwordForm.newPassword]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [profileRes, dashRes] = await Promise.allSettled([
          api.get("/student/profile"),
          api.get("/student/dashboard")
        ]);

        if (profileRes.status === "fulfilled") {
          const prof = profileRes.value.data?.profile || {};
          setProfileData(prof);
          setForm({
            name: prof.name || "",
            mobile: prof.mobile || "",
            profilePhoto: prof.profilePhoto || ""
          });
        } else {
          setError(profileRes.reason?.response?.data?.message || "Failed to load student profile");
        }

        if (dashRes.status === "fulfilled") {
          const metrics = dashRes.value.data?.metrics || {};
          setDashboardMetrics({
            subjectsCount: metrics.subjectsCount || 0,
            uploadedCount: metrics.uploadedCount || 0,
            pendingCount: metrics.pendingCount || 0
          });
        }
      } catch (err) {
        setError("Failed to fetch profile details");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDarkToggle = () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    setStudentUiPrefs({ darkMode: nextVal });
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      const response = await api.put("/student/profile", {
        name: form.name,
        mobile: form.mobile,
        profilePhoto: form.profilePhoto
      });
      const nextProfile = response.data.profile || {};
      setProfileData((prev) => ({ ...prev, ...nextProfile }));
      updateUserSession({ ...user, ...nextProfile });
      setMessage("Profile details updated successfully.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation password do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await api.put("/student/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setMessage("Password updated successfully.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  // Drag and drop photo handlers
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          const dataUrl = await fileToDataUrl(file);
          setForm((prev) => ({ ...prev, profilePhoto: dataUrl }));
          setMessage("Photo dropped successfully! Click 'Save Profile' to keep changes.");
          setError("");
        } catch (err) {
          setError("Failed to process dropped image file");
        }
      } else {
        setError("Please drop a valid image file (JPG, PNG, WebP)");
      }
    }
  };

  const onSelectPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, profilePhoto: dataUrl }));
      setMessage("New profile photo selected. Click 'Save Profile' to keep changes.");
      setError("");
    } catch (fileError) {
      setError(fileError?.message || "Failed to read image file");
    }
  };

  const logoutFromProfile = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl py-12">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-lg">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-purple-600" />
          <p className="mt-4 text-base font-semibold text-[#141414]">Loading student profile...</p>
        </div>
      </section>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal Details", icon: "user" },
    { id: "security", label: "Security & Password", icon: "lock" },
    { id: "academic", label: "Academic & Stats", icon: "chart" },
    { id: "support", label: "Preferences & Support", icon: "settings" }
  ];

  const faqs = [
    {
      q: "How do I upload presentation files for my subjects?",
      a: "Go to the Upload PPT section from your dashboard or quick menu, select your subject, choose your PowerPoint/PDF file, and click upload."
    },
    {
      q: "How can I check if my presentation has been reviewed?",
      a: "Navigate to 'My Presentations' or check your Notifications. Your subject faculty will grade or provide feedback on your submission."
    },
    {
      q: "How do I update my profile photo?",
      a: "You can drag and drop an image onto the profile card or click the camera button to upload an image from your device, then click 'Save Profile'."
    },
    {
      q: "Who should I contact if my Roll Number or Section is incorrect?",
      a: "Your academic branch and section are set by your college department administrator. Please contact your faculty coordinator or department admin."
    }
  ];

  return (
    <section className="student-profile-page mx-auto w-full max-w-6xl space-y-6 pb-8">
      {/* Toast Alerts */}
      {message ? (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm transition">
          <div className="flex items-center gap-2.5">
            <Icon name="check" className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
          <button type="button" onClick={() => setMessage("")} className="text-emerald-700 hover:text-emerald-900 font-bold text-base px-2">
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm transition">
          <div className="flex items-center gap-2.5">
            <Icon name="alert" className="h-5 w-5 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-red-700 hover:text-red-900 font-bold text-base px-2">
            ×
          </button>
        </div>
      ) : null}

      {/* HERO HEADER CARD */}
      <div className="student-profile-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-all">
        {/* Cover Banner — light glass */}
        <div
          className="relative h-32 w-full p-4 sm:h-36"
          style={{
            background: "linear-gradient(135deg, rgba(237,233,254,0.9) 0%, rgba(224,231,255,0.85) 50%, rgba(255,255,255,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(200,190,255,0.30)"
          }}
        >
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-white/90 backdrop-blur-md">
              Student Portal
            </span>
            {isCr && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-slate-950 shadow">
                <Icon name="crown" className="h-3.5 w-3.5" /> CR Active
              </span>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative group rounded-3xl p-1 transition-all ${
                  isDragging ? "ring-4 ring-purple-500 scale-105 bg-purple-50" : "hover:scale-[1.02]"
                }`}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={fullName}
                    className="h-28 w-28 rounded-3xl border-4 border-white bg-slate-100 object-cover shadow-md transition group-hover:brightness-95"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/auth-assets/profile-placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white text-3xl font-bold shadow-md" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)", color: "#5b21b6" }}>
                    {getInitials(fullName)}
                  </div>
                )}
                <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/80 shadow-lg transition hover:scale-105" style={{ background: "rgba(255,255,255,0.80)", backdropFilter: "blur(10px)", color: "#5b21b6" }}>
                  <Icon name="camera" className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={onSelectPhoto} />
                </label>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold text-[#141414] sm:text-3xl">{fullName}</h1>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-700">
                    STUDENT
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600">{email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Icon name="hash" className="h-3.5 w-3.5 text-purple-600" /> {rollNumber}
                  </span>
                  <span>•</span>
                  <span>{branch} Department</span>
                  <span>•</span>
                  <span>Year {year} ({section})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
              <div className="text-center sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Profile Strength</p>
                <p className="text-lg font-bold text-purple-700">{profileCompleteness}%</p>
              </div>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-100">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subjects</p>
              <p className="mt-1 text-xl font-bold text-[#141414]">{dashboardMetrics.subjectsCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Uploads</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{dashboardMetrics.uploadedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending</p>
              <p className="mt-1 text-xl font-bold text-amber-600">{dashboardMetrics.pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last Session</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-700">{formatDateTime(lastLoginAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TAB BAR — glass theme */}
      <div
        className="flex overflow-x-auto gap-2 rounded-2xl p-1.5 no-scrollbar"
        style={{
          background: "rgba(255,255,255,0.60)",
          border: "1.5px solid rgba(255,255,255,0.75)",
          boxShadow: "0 4px 24px rgba(20,20,25,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)"
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#141414] shadow-md scale-[1.02] border border-white/90"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              <Icon name={tab.icon} className={`h-4 w-4 ${isActive ? "text-purple-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}

      </div>

      {/* TAB CONTENT SECTIONS */}
      {/* TAB 1: PERSONAL DETAILS */}
      {activeTab === "personal" && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#141414]">Personal Information</h2>
              <p className="text-xs text-slate-500 mt-1">Update your display name, contact mobile number, and profile picture.</p>
            </div>

            {/* Drag and drop dropzone banner */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
                isDragging
                  ? "border-purple-600 bg-purple-50"
                  : "border-slate-300 hover:border-purple-400 bg-slate-50/50"
              }`}
            >
              <Icon name="cloud-upload" className="h-8 w-8 text-purple-600 mb-1" />
              <p className="text-xs font-bold text-[#141414]">
                {isDragging ? "Drop your photo file here!" : "Drag & drop profile picture here"}
              </p>
              <p className="text-[11px] text-slate-400">Supports JPG, PNG, WebP image formats</p>
            </div>

            <form onSubmit={updateProfile} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Icon name="user" className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Icon name="phone" className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Must be a valid 10-digit mobile number (e.g. 9876543210)</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Profile Photo URL (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Icon name="camera" className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    value={form.profilePhoto.startsWith("data:image/") ? "" : form.profilePhoto}
                    onChange={(e) => setForm((prev) => ({ ...prev, profilePhoto: e.target.value }))}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    border: "1.5px solid rgba(255,255,255,0.85)",
                    color: "#141414",
                    boxShadow: "0 4px 18px rgba(20,20,25,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
                    backdropFilter: "blur(16px) saturate(160%)",
                    WebkitBackdropFilter: "blur(16px) saturate(160%)"
                  }}
                >
                  {savingProfile ? "Saving Profile..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#141414]">Academic Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verified enrollment & department details.</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-500">Roll Number</span>
                <span className="text-sm font-bold text-purple-700">{rollNumber}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-500">Department / Branch</span>
                <span className="text-sm font-bold text-[#141414]">{branch}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-500">Academic Year</span>
                <span className="text-sm font-bold text-[#141414]">Year {year}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-500">Section</span>
                <span className="text-sm font-bold text-[#141414]">Section {section}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-purple-950">
                <Icon name="academic" className="h-4 w-4 text-purple-700" /> Academic Verification
              </p>
              <p className="text-slate-600">
                Your branch, roll number, and assigned class are managed by college administration. Contact support if changes are needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#141414]">Change Password</h2>
              <p className="text-xs text-slate-500 mt-1">Ensure your account remains safe by updating your password periodically.</p>
            </div>

            <form onSubmit={changePassword} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <Icon name={showCurrentPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password (min 8 chars)"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <Icon name={showNewPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                  </button>
                </div>
                {passwordForm.newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">Strength</span>
                      <span className="font-bold text-slate-700">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-[#141414] transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    border: "1.5px solid rgba(255,255,255,0.85)",
                    color: "#141414",
                    boxShadow: "0 4px 18px rgba(20,20,25,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
                    backdropFilter: "blur(16px) saturate(160%)",
                    WebkitBackdropFilter: "blur(16px) saturate(160%)"
                  }}
                >
                  {savingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-[#141414]">Security Recommendations</h2>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Use passwords with at least 8 characters including numbers and symbols.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Do not share your portal login credentials with classmates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Log out from public or shared smartboard screens after your presentation.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC & STATS */}
      {activeTab === "academic" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Subjects</p>
              <h3 className="mt-2 text-3xl font-extrabold text-[#141414]">{dashboardMetrics.subjectsCount}</h3>
              <p className="mt-1 text-xs text-slate-400">Enrolled for current semester</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Uploaded PPTs</p>
              <h3 className="mt-2 text-3xl font-extrabold text-emerald-600">{dashboardMetrics.uploadedCount}</h3>
              <p className="mt-1 text-xs text-slate-400">Submitted presentations</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Reviews</p>
              <h3 className="mt-2 text-3xl font-extrabold text-amber-600">{dashboardMetrics.pendingCount}</h3>
              <p className="mt-1 text-xs text-slate-400">Awaiting faculty approval</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <h3 className="text-lg font-bold text-[#141414]">Quick Portal Shortcuts</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/student/upload"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-900 hover:text-white group"
              >
                <div>
                  <p className="font-bold text-sm text-[#141414] group-hover:text-white">Upload PPT</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-300">Submit presentation</p>
                </div>
                <Icon name="upload" className="h-5 w-5 text-purple-600 group-hover:text-white" />
              </Link>

              <Link
                to="/student/presentations"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-900 hover:text-white group"
              >
                <div>
                  <p className="font-bold text-sm text-[#141414] group-hover:text-white">My Presentations</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-300">Track review status</p>
                </div>
                <Icon name="external" className="h-5 w-5 text-purple-600 group-hover:text-white" />
              </Link>

              {isCr && (
                <Link
                  to="/student/cr"
                  className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 transition hover:bg-amber-400 group"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-950">CR Dashboard</p>
                    <p className="text-xs text-amber-800 group-hover:text-slate-900">Class submissions</p>
                  </div>
                  <Icon name="crown" className="h-5 w-5 text-amber-700 group-hover:text-slate-950" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PREFERENCES & SUPPORT */}
      {activeTab === "support" && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <h2 className="text-xl font-bold text-[#141414]">UI Preferences</h2>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Icon name={darkMode ? "moon" : "sun"} className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-bold text-[#141414]">Dark Mode Theme</p>
                    <p className="text-xs text-slate-500">Switch between light and dark interface</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDarkToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? "bg-purple-700" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <h2 className="text-xl font-bold text-[#141414]">Help & Frequently Asked Questions</h2>
              <div className="space-y-2">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.q} className="rounded-2xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between p-4 text-left font-semibold text-sm text-[#141414] hover:bg-slate-50"
                      >
                        <span>{faq.q}</span>
                        <Icon name="chevron" className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="student-profile-card rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <h2 className="text-xl font-bold text-[#141414]">Account Session</h2>
              <p className="text-xs text-slate-500">Need to sign out of your account on this device?</p>
              <button
                type="button"
                onClick={logoutFromProfile}
                className="w-full rounded-xl border border-red-600 bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Log Out of Account
              </button>
            </div>
          </div>
        </div>
      )}

      <PoweredByYeahzz textClassName="text-[#141414]" className="mt-8" />
    </section>
  );
}
