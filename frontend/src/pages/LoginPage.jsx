import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { PoweredByYeahzz } from "../components/YeahzzBranding";
import useAuth from "../hooks/useAuth";

function getRoleLandingPath(role) {
  if (role === "STUDENT") return "/student/home";
  if (role === "FACULTY") return "/faculty/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "SMARTBOARD") return "/smartboard/view";
  return "/login";
}

function getPortalCopy(portalRole) {
  if (portalRole === "STUDENT") {
    return {
      title: "Student Portal Login",
      subtitle: "Use your student email or roll number to continue."
    };
  }
  if (portalRole === "FACULTY") {
    return {
      title: "Faculty Portal Login",
      subtitle: "Sign in with faculty email or username ID."
    };
  }
  if (portalRole === "ADMIN") {
    return {
      title: "Admin Portal Login",
      subtitle: "Sign in with administrator credentials only."
    };
  }
  return {
    title: "Welcome Back.",
    subtitle: "Please enter your account."
  };
}

function getSafeRedirectPath(location) {
  const params = new URLSearchParams(location.search || "");
  const fromQuery = String(params.get("redirect") || params.get("redirectTo") || "").trim();
  const fromState = String(location.state?.redirectTo || "").trim();
  const candidate = fromState || fromQuery;

  if (!candidate) return "";
  if (candidate.startsWith("/")) return candidate;

  try {
    const parsed = new URL(candidate);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_error) {
    // ignore and continue with smartboard fallback below
  }

  if (
    typeof window !== "undefined" &&
    location.pathname.startsWith("/faculty/login")
  ) {
    const pendingToken = String(window.sessionStorage.getItem("cmr_smartboard_auth_token") || "").trim();
    if (pendingToken) {
      return `/smartboard/authorize?token=${encodeURIComponent(pendingToken)}`;
    }
  }

  return "";
}

export default function LoginPage({ portalRole = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loading, requestFacultyLoginOtp, verifyFacultyLoginOtp, requestStudentLoginOtp, verifyStudentLoginOtp, requestPortalLoginOtp, verifyPortalLoginOtp } = useAuth();
  const routeRole = location.pathname.startsWith("/student/login")
    ? "STUDENT"
    : location.pathname.startsWith("/faculty/login")
      ? "FACULTY"
      : location.pathname.startsWith("/admin/login")
        ? "ADMIN"
      : null;
  const activePortalRole = portalRole || routeRole || "STUDENT";
  const isRootLogin = !portalRole && !routeRole;
  const supportsOtpLogin = isRootLogin || activePortalRole === "FACULTY" || activePortalRole === "STUDENT";
  const portalCopy = isRootLogin
    ? { title: "Portal Login", subtitle: "Sign in with your email, roll number, or account ID." }
    : getPortalCopy(activePortalRole);
  const helperLinkTo =
    activePortalRole === "ADMIN"
      ? "/login"
      : activePortalRole === "FACULTY"
        ? "/faculty/register"
        : "/register";
  const loginLinkTo =
    activePortalRole === "FACULTY"
      ? "/faculty/login"
      : activePortalRole === "ADMIN"
        ? "/admin/login"
        : "/login";
  const registerLinkTo = activePortalRole === "FACULTY" ? "/faculty/register" : "/register";
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [facultyLoginMode, setFacultyLoginMode] = useState("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#141414] px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-white/60";
  const linkClass = "text-slate-200 hover:text-white";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const user = await login({ ...form, role: isRootLogin ? null : activePortalRole });
      const redirectTo = getSafeRedirectPath(location);
      const targetPath = redirectTo || getRoleLandingPath(user.role);
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Login failed");
    }
  };

  const handleOtpLogin = async () => {
    setError("");
    try {
      if (!otpSent) {
        const requestOtp = isRootLogin ? requestPortalLoginOtp : activePortalRole === "FACULTY" ? requestFacultyLoginOtp : requestStudentLoginOtp;
        await requestOtp(form.identifier.trim());
        setOtpSent(true);
        return;
      }
      const verifyOtp = isRootLogin ? verifyPortalLoginOtp : activePortalRole === "FACULTY" ? verifyFacultyLoginOtp : verifyStudentLoginOtp;
      const user = await verifyOtp({ email: form.identifier.trim(), otp: otp.trim() });
      const redirectTo = getSafeRedirectPath(location);
      navigate(redirectTo || getRoleLandingPath(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Faculty OTP login failed");
    }
  };

  return (
    <AuthShell
      mode="login"
      title={portalCopy.title}
      subtitle={portalCopy.subtitle}
      helperText=""
      helperLinkLabel=""
      helperLinkTo={helperLinkTo}
      loginLinkTo={loginLinkTo}
      registerLinkTo={registerLinkTo}
      loading={loading}
      loadingLabel="Signing in..."
      showAuthTabs={false}
    >
      {supportsOtpLogin ? (
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={() => { setFacultyLoginMode("password"); setOtpSent(false); setOtp(""); setError(""); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${facultyLoginMode === "password" ? "bg-black text-white" : "text-slate-600"}`}>Password</button>
          <button type="button" onClick={() => { setFacultyLoginMode("otp"); setOtpSent(false); setOtp(""); setError(""); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${facultyLoginMode === "otp" ? "bg-black text-white" : "text-slate-600"}`}>OTP</button>
        </div>
      ) : null}
      <form className="mt-6 space-y-4" onSubmit={facultyLoginMode === "otp" ? (event) => { event.preventDefault(); handleOtpLogin(); } : handleSubmit}>
        <div>
          <label className="mb-2 block text-sm text-soft" htmlFor="login-identifier">
            Email or ID
          </label>
          <input
            id="login-identifier"
            className={inputClass}
            type="text"
            placeholder={facultyLoginMode === "otp" && supportsOtpLogin ? (isRootLogin ? "Account email" : `${activePortalRole === "FACULTY" ? "Faculty" : "Student"} email`) : isRootLogin ? "Email, Roll Number, or ID" : activePortalRole === "STUDENT" ? "Roll Number or Email" : activePortalRole === "FACULTY" ? "Faculty email" : "Email or ID"}
            value={form.identifier}
            onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
            required
          />
        </div>
        {facultyLoginMode === "otp" && supportsOtpLogin ? (
          otpSent ? (
            <input className={inputClass} type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
          ) : null
        ) : <div>
          <label className="mb-2 block text-sm text-soft" htmlFor="login-password">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              className={`${inputClass} pr-16`}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${linkClass}`}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-2 text-right text-violet-100 hover:text-violet-700">
            <Link className={`text-xs ${linkClass}`} to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1f1f] disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {facultyLoginMode === "otp" && supportsOtpLogin ? (otpSent ? "Verify OTP" : "Send Login OTP") : loading ? "Signing In..." : "Sign In"}
        </button>
        <p className="text-xs text-slate-">
          By clicking Sign In you agree to our{" "}
          <Link className={linkClass} to="/terms-and-conditions">
            Terms and Conditions
          </Link>
          .
        </p>
      </form>
      <div className="flex justify-center pt-6">
        <PoweredByYeahzz />
      </div>
    </AuthShell>
  );
}
