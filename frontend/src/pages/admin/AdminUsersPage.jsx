import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import GlassCard from "../../components/GlassCard";
import PortalIcon from "../../components/PortalIcon";
import api from "../../services/api";
import { resolveAssetUrl } from "../../utils/urlUtils";

const ROLE_OPTIONS = ["ALL", "STUDENT", "FACULTY", "ADMIN", "SMARTBOARD"];
const YEAR_OPTIONS = ["1", "2", "3", "4"];
const SECTION_OPTIONS_BY_BRANCH = {
  ECE: ["ECE-A", "ECE-B"],
  CSE: ["CSE-A", "CSE-B"],
  CSM: ["CSM-A", "CSM-B"],
  MEC: ["MEC-A", "MEC-B"]
};

function getRoleFilterFromSearch(searchValue = "") {
  const params = new URLSearchParams(searchValue);
  const normalized = String(params.get("role") || "ALL").toUpperCase();
  return ROLE_OPTIONS.includes(normalized) ? normalized : "ALL";
}

function getInitials(name, email) {
  const clean = String(name || "").trim();
  if (clean) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return String(email || "U").slice(0, 2).toUpperCase();
}

function getRoleIcon(role) {
  switch (role) {
    case "ADMIN":
      return "settings";
    case "FACULTY":
      return "classes";
    case "STUDENT":
      return "subjects";
    case "SMARTBOARD":
      return "smartboard";
    default:
      return "users";
  }
}

function getRoleTone(role) {
  switch (role) {
    case "ADMIN":
      return "border border-slate-200 bg-slate-100 text-slate-900";
    case "FACULTY":
      return "border border-slate-200 bg-slate-50 text-slate-900";
    case "STUDENT":
      return "border border-slate-200 bg-slate-50 text-slate-900";
    case "SMARTBOARD":
      return "border border-slate-200 bg-slate-50 text-slate-900";
    default:
      return "border border-slate-200 bg-white text-slate-900";
  }
}

const initialCreateForm = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  rollNumber: "",
  branch: "ECE",
  year: "1",
  section: "ECE-A",
  mobile: "",
  classId: "",
  facultyClassIds: "",
  isVerified: true,
  isActive: true
};

const initialEditForm = {
  id: "",
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  rollNumber: "",
  branch: "ECE",
  year: "1",
  section: "ECE-A",
  mobile: "",
  classId: "",
  facultyClassIds: "",
  isVerified: true,
  isActive: true
};

export default function AdminUsersPage() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedRole, setSelectedRole] = useState(() => getRoleFilterFromSearch(location.search));
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingCrUserId, setTogglingCrUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [academicImporting, setAcademicImporting] = useState(false);
  const [academicSummary, setAcademicSummary] = useState(null);
  const [academicInputKey, setAcademicInputKey] = useState(0);
  const [downloadLoading, setDownloadLoading] = useState("");
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const loadUsers = async (roleFilter = selectedRole) => {
    setLoading(true);
    setError("");
    try {
      const params = roleFilter && roleFilter !== "ALL" ? { role: roleFilter } : undefined;
      const [usersResponse, classesResponse] = await Promise.all([
        api.get("/admin/users", { params }),
        api.get("/admin/classes")
      ]);
      setUsers(usersResponse.data.users || []);
      setSelectedUserIds([]);
      setClasses(classesResponse.data.classes || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    setSelectedRole(getRoleFilterFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!isEditModalOpen && !isCreateModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !editing) {
        setIsEditModalOpen(false);
        setIsCreateModalOpen(false);
        setEditForm(initialEditForm);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editing, isCreateModalOpen, isEditModalOpen]);

  const closeEditModal = () => {
    if (editing) return;
    setIsEditModalOpen(false);
    setEditForm(initialEditForm);
  };

  const parseFacultyClassIds = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeUserPayload = (form, includePassword = true) => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      isVerified: Boolean(form.isVerified),
      classId: form.classId || null,
      isActive: Boolean(form.isActive)
    };

    if (includePassword && form.password) {
      payload.password = form.password;
    } else if (!includePassword && form.password) {
      payload.password = form.password;
    }

    if (form.role === "STUDENT") {
      payload.rollNumber = form.rollNumber.trim().toUpperCase();
      payload.branch = form.branch;
      payload.year = Number(form.year);
      payload.section = form.section;
      payload.mobile = form.mobile.replace(/\D/g, "");
    }

    if (form.role === "FACULTY") {
      payload.classIds = parseFacultyClassIds(form.facultyClassIds);
    }

    return payload;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!confirmCreateOpen) {
      setConfirmCreateOpen(true);
      return;
    }
    setConfirmCreateOpen(false);
    await doCreate();
  };

  const doCreate = async () => {
    setError("");
    setMessage("");
    setCreating(true);
    try {
      const payload = normalizeUserPayload(createForm, true);
      if (!payload.password || payload.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      await api.post("/admin/users", payload);
      setMessage("User created successfully");
      setCreateForm(initialCreateForm);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleBulkImport = async (event) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.importFile;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Please select a CSV/Excel file");
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setImportSummary(null);
    setImporting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/admin/users/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setImportSummary(response.data || null);
      setMessage(
        `Bulk import completed. Created ${response.data?.createdCount || 0} users.`
      );
      setImportInputKey((prev) => prev + 1);
      await loadUsers();
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      if (responseData && typeof responseData === "object") {
        setImportSummary(responseData);
      }
      setError(responseData?.message || "Failed to import users");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async (type) => {
    const endpoint = type === "academic" ? "/admin/templates/academic" : "/admin/templates/users";
    const fallbackFileName =
      type === "academic" ? "academic-import-template.xlsx" : "users-import-template.xlsx";
    setDownloadLoading(type);
    setError("");
    setMessage("");
    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const disposition = String(response.headers?.["content-disposition"] || "");
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || fallbackFileName;
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMessage(`Downloaded ${fileName}`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Template download failed");
    } finally {
      setDownloadLoading("");
    }
  };

  const handleAcademicImport = async (event) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.academicImportFile;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Please select an academic Excel file");
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setAcademicSummary(null);
    setAcademicImporting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/admin/academic/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAcademicSummary(response.data || null);
      setMessage("Academic Excel import completed.");
      setAcademicInputKey((prev) => prev + 1);
      await loadUsers();
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      if (responseData && typeof responseData === "object") {
        setAcademicSummary(responseData);
      }
      setError(responseData?.message || "Failed to import academic data");
    } finally {
      setAcademicImporting(false);
    }
  };

  const startEdit = (user) => {
    setEditForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "STUDENT",
      rollNumber: user.rollNumber || "",
      branch: user.branch || "ECE",
      year: String(user.year || "1"),
      section: user.section || "ECE-A",
      mobile: user.mobile || "",
      classId: user.classId || "",
      facultyClassIds:
        user.role === "FACULTY" && Array.isArray(user.classIds)
          ? user.classIds.join(",")
          : "",
      isVerified: Boolean(user.isVerified),
      isActive: user.isActive !== false
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editForm.id) return;

    setError("");
    setMessage("");
    setEditing(true);
    try {
      const payload = normalizeUserPayload(editForm, false);
      await api.put(`/admin/users/${editForm.id}`, payload);
      setMessage("User updated successfully");
      setEditForm(initialEditForm);
      setIsEditModalOpen(false);
      loadUsers();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update user");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage("User deleted successfully");
      if (editForm.id === userId) {
        setEditForm(initialEditForm);
        setIsEditModalOpen(false);
      }
      loadUsers();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to delete user");
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const bulkUpdateUsers = async (updates, successMessage) => {
    if (!selectedUserIds.length) return;
    setBulkProcessing(true);
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedUserIds.map((userId) => api.put(`/admin/users/${userId}`, updates)));
      setMessage(`${successMessage} (${selectedUserIds.length} users)`);
      setSelectedUserIds([]);
      await loadUsers();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Bulk user update failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkDeleteUsers = async () => {
    if (!selectedUserIds.length || !window.confirm(`Delete ${selectedUserIds.length} selected users?`)) return;
    setBulkProcessing(true);
    setError("");
    setMessage("");
    try {
      await Promise.all(selectedUserIds.map((userId) => api.delete(`/admin/users/${userId}`)));
      setMessage(`${selectedUserIds.length} users deleted successfully`);
      setSelectedUserIds([]);
      await loadUsers();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Bulk delete failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleToggleCr = async (user) => {
    const nextCr = !user.isCr;
    setTogglingCrUserId(user.id);
    setError("");
    setMessage("");
    try {
      await api.put(`/admin/users/${user.id}/cr`, {
        isCr: nextCr,
        classId: user.classId || undefined
      });
      setMessage(
        nextCr
          ? `Assigned ${user.name} (${user.rollNumber || user.email}) as Class Representative (CR)`
          : `Removed CR role from ${user.name}`
      );
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update CR status");
    } finally {
      setTogglingCrUserId(null);
    }
  };

  const getSectionsForBranch = (branch) => SECTION_OPTIONS_BY_BRANCH[branch] || [];

  return (
    <section className="space-y-5">
      <GlassCard>
        <h3 className="font-display text-lg text-white">Demo Excel Templates</h3>
        <p className="mt-2 text-sm text-soft">
          Download, modify, and upload these files to create users, departments, classes, sections, and
          subjects in bulk.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadTemplate("users")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-70"
            disabled={downloadLoading === "users"}
          >
            {downloadLoading === "users" ? "Downloading..." : "Download Users Template"}
          </button>
          <button
            type="button"
            onClick={() => downloadTemplate("academic")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-70"
            disabled={downloadLoading === "academic"}
          >
            {downloadLoading === "academic" ? "Downloading..." : "Download Academic Template"}
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg text-white">Bulk Import Academic Structure</h3>
        <p className="mt-2 text-sm text-soft">
          Upload academic Excel to auto-create Year, Department, Class, Section, and Subject data.
        </p>
        <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={handleAcademicImport}>
          <input
            key={academicInputKey}
            name="academicImportFile"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-1 file:text-xs file:text-white hover:file:bg-white/25"
          />
          <button
            className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
            type="submit"
            disabled={academicImporting}
          >
            {academicImporting ? "Importing..." : "Import Academic Excel"}
          </button>
        </form>

        {academicSummary ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-slate-200">
              Departments:{" "}
              <span className="font-semibold text-emerald-300">
                {academicSummary.createdDepartments || 0}
              </span>{" "}
              | Classes:{" "}
              <span className="font-semibold text-emerald-300">
                {academicSummary.createdClasses || 0}
              </span>{" "}
              | Subjects:{" "}
              <span className="font-semibold text-emerald-300">
                {academicSummary.createdSubjects || 0}
              </span>{" "}
              | Updated Subjects:{" "}
              <span className="font-semibold text-amber-300">
                {academicSummary.updatedSubjects || 0}
              </span>{" "}
              | Failed:{" "}
              <span className="font-semibold text-red-300">
                {academicSummary.failedCount || 0}
              </span>
            </p>
            {Array.isArray(academicSummary.failed) && academicSummary.failed.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-red-200">
                {academicSummary.failed.map((item, index) => (
                  <p key={`${item.row || index}-${index}`}>
                    Row {item.row || "-"}: {item.reason || "Failed"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg text-white">Bulk Import Users</h3>
        <p className="mt-2 text-sm text-soft">
          Upload a <span className="text-white">.csv</span>, <span className="text-white">.xls</span>, or{" "}
          <span className="text-white">.xlsx</span> file.
        </p>
        <p className="mt-2 text-xs text-soft">
          Required columns: name, email, password, role. Optional: rollNumber, year, branch,
          section, mobile, classId, classIds, classDepartmentCode, classYear, classSection,
          className, facultyClassAssignments, isVerified.
        </p>
        <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={handleBulkImport}>
          <input
            key={importInputKey}
            name="importFile"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-1 file:text-xs file:text-white hover:file:bg-white/25"
          />
          <button
            className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
            type="submit"
            disabled={importing}
          >
            {importing ? "Importing..." : "Import File"}
          </button>
        </form>

        {importSummary ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-slate-200">
              Created:{" "}
              <span className="font-semibold text-emerald-300">
                {importSummary.createdCount || 0}
              </span>{" "}
              | Failed:{" "}
              <span className="font-semibold text-red-300">{importSummary.failedCount || 0}</span> |
              Skipped:{" "}
              <span className="font-semibold text-amber-300">
                {importSummary.skippedCount || 0}
              </span>
            </p>
            {Array.isArray(importSummary.failed) && importSummary.failed.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-red-200">
                {importSummary.failed.map((item, index) => (
                  <p key={`${item.row || index}-${index}`}>
                    Row {item.row || "-"}: {item.reason || "Failed"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </GlassCard>

      {/* CONFIRMATION POPUP FOR CREATION */}
      {confirmCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#18181b] p-6 shadow-2xl space-y-4 text-white">
            <h4 className="text-lg font-display font-bold text-white">Confirm User Creation</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to create this user with the following details?
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs space-y-1.5 text-slate-300">
              <p><strong className="text-white">Name:</strong> {createForm.name || "-"}</p>
              <p><strong className="text-white">Email:</strong> {createForm.email || "-"}</p>
              <p><strong className="text-white">Role:</strong> {createForm.role}</p>
              {createForm.role === "STUDENT" && (
                <>
                  <p><strong className="text-white">Roll No:</strong> {createForm.rollNumber || "-"}</p>
                  <p><strong className="text-white">Branch / Sec:</strong> {createForm.branch} - {createForm.section} (Y{createForm.year})</p>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCreateOpen(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doCreate}
                className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CREATE USER MODAL POPUP */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-[#141416] p-6 shadow-2xl space-y-5 text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-violetBrand-500 to-brand-500 text-white text-sm font-bold">
                    +
                  </span>
                  Add New User / Faculty
                </h3>
                <p className="text-xs text-soft mt-1">
                  Create a new student, faculty member, smartboard, or administrator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateForm(initialCreateForm);
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-soft mb-2 uppercase tracking-wider">
                  Select User Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.filter((r) => r !== "ALL").map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        const sections = getSectionsForBranch(createForm.branch);
                        setCreateForm((prev) => ({
                          ...prev,
                          role: r,
                          section: sections.includes(prev.section) ? prev.section : sections[0] || ""
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                        createForm.role === r
                          ? "border-brand-400 bg-brand-500/20 text-white shadow-md"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <PortalIcon name={getRoleIcon(r)} className="h-4 w-4" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Fields */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-soft mb-1">Full Name *</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="Enter full name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-soft mb-1">Email Address *</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="name@cmrcet.ac.in"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-soft mb-1">Password (min 8 chars) *</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="Set account password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>

                {/* Role Specific: Student */}
                {createForm.role === "STUDENT" && (
                  <>
                    <div>
                      <label className="block text-xs text-soft mb-1">Roll Number *</label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                        placeholder="e.g. 21H51A0501"
                        value={createForm.rollNumber}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, rollNumber: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Mobile Number *</label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                        placeholder="10-digit mobile number"
                        value={createForm.mobile}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            mobile: e.target.value.replace(/\D/g, "").slice(0, 10)
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Branch</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={createForm.branch}
                        onChange={(e) => {
                          const branch = e.target.value;
                          const sections = getSectionsForBranch(branch);
                          setCreateForm((prev) => ({
                            ...prev,
                            branch,
                            section: sections.includes(prev.section) ? prev.section : sections[0] || ""
                          }));
                        }}
                      >
                        {Object.keys(SECTION_OPTIONS_BY_BRANCH).map((branch) => (
                          <option key={branch} value={branch} className="bg-slate-900 text-white">
                            {branch}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Year</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={createForm.year}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, year: e.target.value }))}
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y} className="bg-slate-900 text-white">
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-soft mb-1">Section</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={createForm.section}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, section: e.target.value }))}
                      >
                        {getSectionsForBranch(createForm.branch).map((sec) => (
                          <option key={sec} value={sec} className="bg-slate-900 text-white">
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Role Specific: Faculty */}
                {createForm.role === "FACULTY" && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-soft mb-1">Assigned Classes (Select multiple)</label>
                    <select
                      multiple
                      className="h-32 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                      value={parseFacultyClassIds(createForm.facultyClassIds)}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          facultyClassIds: Array.from(e.target.selectedOptions).map((option) => option.value).join(",")
                        }))
                      }
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.name} ({c.departmentCode}) Y{c.year}-{c.section}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-soft">Hold Ctrl/Cmd to select more than one class.</p>
                  </div>
                )}

                {/* Class Assignment */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-soft mb-1">Class Assignment (Optional)</label>
                  <select
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                    value={createForm.classId}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, classId: e.target.value }))}
                  >
                    <option value="" className="bg-slate-900 text-white">Select Class (Optional)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name} ({c.departmentCode}) Y{c.year}-{c.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="create-verified-check"
                    checked={createForm.isVerified}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, isVerified: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-400 cursor-pointer"
                  />
                  <label htmlFor="create-verified-check" className="text-sm text-slate-200 cursor-pointer">
                    Mark account as verified immediately
                  </label>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-active-check"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                  />
                  <label htmlFor="create-active-check" className="text-sm text-slate-200 cursor-pointer">
                    Active Account (allow login)
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreateForm(initialCreateForm);
                  }}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition"
                >
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL POPUP */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div
            className="relative my-0 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#141416] text-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-6 pb-4">
              <div>
                <h3 id="edit-user-modal-title" className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-sm">
                    ✎
                  </span>
                  Edit {editForm.role} Account
                </h3>
                <p className="text-xs text-soft mt-1">
                  Updating details for <strong className="text-white">{editForm.name || "User"}</strong> ({editForm.email})
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Close edit user dialog"
                disabled={editing}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 overflow-y-auto p-6">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-soft mb-2 uppercase tracking-wider">
                  Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.filter((r) => r !== "ALL").map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({ ...prev, role: r }))
                      }
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                        editForm.role === r
                          ? "border-brand-400 bg-brand-500/20 text-white shadow-md"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <PortalIcon name={getRoleIcon(r)} className="h-4 w-4" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Fields */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-soft mb-1">Full Name *</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                    placeholder="Full name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-soft mb-1">Email Address *</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                    placeholder="Email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-soft mb-1">New Password (Leave blank to keep unchanged)</label>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                    placeholder="Enter new password if changing"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                {/* Role Specific: Student */}
                {editForm.role === "STUDENT" && (
                  <>
                    <div>
                      <label className="block text-xs text-soft mb-1">Roll Number *</label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        placeholder="Roll number"
                        value={editForm.rollNumber}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, rollNumber: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Mobile Number *</label>
                      <input
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        placeholder="Mobile"
                        value={editForm.mobile}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            mobile: e.target.value.replace(/\D/g, "").slice(0, 10)
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Branch</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={editForm.branch}
                        onChange={(e) => {
                          const branch = e.target.value;
                          const sections = getSectionsForBranch(branch);
                          setEditForm((prev) => ({
                            ...prev,
                            branch,
                            section: sections.includes(prev.section) ? prev.section : sections[0] || ""
                          }));
                        }}
                      >
                        {Object.keys(SECTION_OPTIONS_BY_BRANCH).map((branch) => (
                          <option key={branch} value={branch} className="bg-slate-900 text-white">
                            {branch}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-soft mb-1">Year</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={editForm.year}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, year: e.target.value }))}
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y} className="bg-slate-900 text-white">
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-soft mb-1">Section</label>
                      <select
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                        value={editForm.section}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, section: e.target.value }))}
                      >
                        {getSectionsForBranch(editForm.branch).map((sec) => (
                          <option key={sec} value={sec} className="bg-slate-900 text-white">
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Role Specific: Faculty */}
                {editForm.role === "FACULTY" && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-soft mb-1">Assigned Classes (Select multiple)</label>
                    <select
                      multiple
                      className="h-32 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                      value={parseFacultyClassIds(editForm.facultyClassIds)}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          facultyClassIds: Array.from(e.target.selectedOptions).map((option) => option.value).join(",")
                        }))
                      }
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.name} ({c.departmentCode}) Y{c.year}-{c.section}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-soft">Hold Ctrl/Cmd to select more than one class.</p>
                  </div>
                )}

                {/* Class Assignment */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-soft mb-1">Class Assignment (Optional)</label>
                  <select
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400"
                    value={editForm.classId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, classId: e.target.value }))}
                  >
                    <option value="" className="bg-slate-900 text-white">Select Class (Optional)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name} ({c.departmentCode}) Y{c.year}-{c.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit-verified-check"
                    checked={editForm.isVerified}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isVerified: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-400 cursor-pointer"
                  />
                  <label htmlFor="edit-verified-check" className="text-sm text-slate-200 cursor-pointer">
                    Verified Account
                  </label>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-active-check"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                  />
                  <label htmlFor="edit-active-check" className="text-sm text-slate-200 cursor-pointer">
                    Active Account (allow login)
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editing}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {message ? <p className="text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</p> : null}

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-lg text-white">Users</h3>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-soft">
              {users.length} Total
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search roll no, name, email..."
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-soft outline-none focus:border-brand-300 w-48 md:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <label className="text-xs uppercase tracking-[0.12em] text-soft" htmlFor="user-role">
              Role
            </label>
            <select
              id="user-role"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-300"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role} className="bg-slate-900 text-white">
                  {role}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-violetBrand-500 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 flex items-center gap-1.5"
            >
              <span>+</span> Add User / Faculty
            </button>
          </div>
        </div>

        {loading ? <p className="mt-3 text-soft">Loading users...</p> : null}
        {!loading && users.length === 0 ? <p className="mt-3 text-soft">No users found.</p> : null}

        {(() => {
          const cleanQuery = searchTerm.trim().toLowerCase();
          const filteredUsers = users.filter((u) => {
            if (!cleanQuery) return true;
            return (
              (u.name || "").toLowerCase().includes(cleanQuery) ||
              (u.email || "").toLowerCase().includes(cleanQuery) ||
              (u.rollNumber || "").toLowerCase().includes(cleanQuery) ||
              (u.branch || "").toLowerCase().includes(cleanQuery) ||
              (u.section || "").toLowerCase().includes(cleanQuery)
            );
          });

          if (!loading && users.length > 0 && filteredUsers.length === 0) {
            return <p className="mt-3 text-soft">No users match &quot;{searchTerm}&quot;.</p>;
          }

          if (filteredUsers.length === 0) return null;

          return (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-soft">
                  {selectedUserIds.length} selected
                </span>
                <select
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-300"
                  value={bulkClassId}
                  onChange={(event) => setBulkClassId(event.target.value)}
                  disabled={bulkProcessing || !selectedUserIds.length}
                >
                  <option value="">Assign class...</option>
                  <option value="">Remove class assignment</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.departmentCode}) Y{c.year}-{c.section}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={bulkProcessing || !selectedUserIds.length || !bulkClassId}
                  onClick={() => bulkUpdateUsers({ classId: bulkClassId }, "Class assigned to selected users")}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Assign Class
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing || !selectedUserIds.length}
                  onClick={() => bulkUpdateUsers({ classId: null }, "Class assignment removed")}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Remove Class
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing || !selectedUserIds.length}
                  onClick={() => bulkUpdateUsers({ isActive: true }, "Selected users activated")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Activate
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing || !selectedUserIds.length}
                  onClick={() => bulkUpdateUsers({ isActive: false }, "Selected users deactivated")}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Deactivate
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing || !selectedUserIds.length}
                  onClick={bulkDeleteUsers}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Delete Selected
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-soft">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all visible users"
                        checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.includes(user.id))}
                        onChange={(event) => {
                          const visibleIds = filteredUsers.map((user) => user.id);
                          setSelectedUserIds((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, ...visibleIds]))
                              : current.filter((id) => !visibleIds.includes(id))
                          );
                        }}
                      />
                    </th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Verified</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${user.name || user.email}`}
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {user.profilePhoto ? (
                            <img
                              src={resolveAssetUrl(user.profilePhoto)}
                              alt={`${user.name || "User"} avatar`}
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10"
                            />
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-xs font-semibold text-[#141414]">
                              {getInitials(user.name, user.email)}
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-white">{user.name}</p>
                              {user.isCr && (
                                <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                                  CR
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-soft">{user.rollNumber || user.mobile || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{user.email}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getRoleTone(
                            user.role
                          )}`}
                        >
                          <PortalIcon name={getRoleIcon(user.role)} className="h-3.5 w-3.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">{user.isVerified ? "Yes" : "No"}</td>
                      <td className="px-3 py-3">
                        <span className={user.isActive === false ? "text-amber-300" : "text-emerald-300"}>
                          {user.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3">{user.branch || "-"}</td>
                      <td className="px-3 py-3">{user.year || "-"}</td>
                      <td className="px-3 py-3">{user.section || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {user.role === "STUDENT" && (
                            <button
                              type="button"
                              disabled={togglingCrUserId === user.id}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${user.isCr
                                ? "bg-amber-500/20 text-amber-200 border border-amber-400/50 hover:bg-amber-500/30"
                                : "bg-indigo-500/20 text-indigo-200 border border-indigo-400/50 hover:bg-indigo-500/30"
                                } disabled:opacity-50`}
                              onClick={() => handleToggleCr(user)}
                              title={user.isCr ? "Remove Class Representative role" : "Assign as Class Representative"}
                            >
                              {togglingCrUserId === user.id
                                ? "Saving..."
                                : user.isCr
                                  ? "Remove CR"
                                  : "Assign CR"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25 transition"
                            onClick={() => startEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-red-500/20 text-red-200 border border-red-500/30 px-2.5 py-1 text-xs font-semibold hover:bg-red-500/30 transition"
                            onClick={() => handleDelete(user.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          );
        })()}
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg text-white">Class IDs Quick Reference</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-soft">
              <tr>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2">
                    {item.departmentCode} Y{item.year}-{item.section}
                  </td>
                  <td className="px-2 py-2 text-soft">{item.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </section>
  );
}
