import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          name={name}
          type={type === "password" ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full dark:bg-gray-800 bg-gray-100 dark:text-white text-gray-900 dark:placeholder-gray-500 placeholder-gray-400 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all
            ${error ? "border-red-500/60" : "dark:border-gray-700 border-gray-300"}`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400"
          >
            {show ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim() || form.username.length < 3)
      e.username = "Min 3 characters";
    if (!form.password || form.password.length < 6)
      e.password = "Min 6 characters";
    if (tab === "register" && form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      if (tab === "login") {
        await login(form.username, form.password);
        navigate(from, { replace: true });
      } else {
        await register(form.username, form.password);
        setSuccess("Account created! Sign in now.");
        setTab("login");
        setForm({ username: form.username, password: "", confirmPassword: "" });
      }
    } catch (err) {
      setApiError(
        err.response?.data?.error || err.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-950 bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-green-500 rounded-2xl items-center justify-center shadow-xl shadow-green-500/30 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">
            WhatsApp Clone
          </h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm mt-1">
            Real-time messaging · Socket.io · MERN
          </p>
        </div>

        <div className="dark:bg-gray-900 bg-white rounded-2xl shadow-xl dark:shadow-black/30 border dark:border-gray-800 border-gray-200 p-8">
          {/* Tabs */}
          <div className="flex dark:bg-gray-800 bg-gray-100 rounded-xl p-1 mb-6">
            {["login", "register"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setApiError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200
                  ${tab === t ? "bg-green-500 text-white shadow-lg shadow-green-500/25" : "dark:text-gray-400 text-gray-500"}`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {success && (
            <div className="mb-4 flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl">
              <span>✓</span>
              {success}
            </div>
          )}
          {apiError && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              <span>!</span>
              {apiError}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Username"
              name="username"
              value={form.username}
              onChange={handle}
              placeholder="Enter username"
              error={errors.username}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              placeholder="Enter password"
              error={errors.password}
            />
            {tab === "register" && (
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handle}
                placeholder="Repeat password"
                error={errors.confirmPassword}
              />
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-green-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {tab === "login" ? "Signing in..." : "Creating..."}
                </span>
              ) : tab === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center dark:text-gray-500 text-gray-400 text-sm mt-5">
            {tab === "login" ? "No account? " : "Have an account? "}
            <button
              onClick={() => setTab(tab === "login" ? "register" : "login")}
              className="text-green-400 hover:text-green-300 font-medium"
            >
              {tab === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
