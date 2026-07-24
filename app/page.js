"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CalendarCheck2,
  Eye,
  EyeOff,
  ListChecks,
  LockKeyhole,
  Mail,
  PhoneCall,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import CalendarView from "./components/CalendarView";
import ServicesView from "./components/ServicesView";
import BusinessSettingsView from "./components/BusinessSettingsView";
import AnalyticsView from "./components/AnalyticsView";
import StaffView from "./components/StaffView";
import { PortalShell, PreviewBanner } from "./components/portal/PortalShell";
import reserveSyncLogo from "./reservesync-dark.svg";
import {
  clearPreviewSession,
  getPreviewTarget,
  previewFetch,
} from "./previewSession";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const shopViews = new Set([
  "calendar",
  "calls",
  "services",
  "staff",
  "analytics",
  "business",
]);

function initialShopView() {
  if (typeof window === "undefined") return "calendar";
  const view = new URLSearchParams(window.location.search).get("view");
  return shopViews.has(view) ? view : "calendar";
}

export default function Home() {
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [state, setState] = useState("loading");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState(initialShopView);
  const [shopUser, setShopUser] = useState(null);
  const [adminPreview, setAdminPreview] = useState(false);
  const [previewRecordingUrl, setPreviewRecordingUrl] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  });

  async function loadCalls(page = 1, query = search) {
    setState("loading");

    try {
      const [callsResponse, agentsResponse] = await Promise.all([
        previewFetch(`/api/calls?page=${page}&q=${encodeURIComponent(query)}`),
        previewFetch("/api/agents"),
      ]);
      if (!callsResponse.ok || !agentsResponse.ok) throw new Error();
      const callData = await callsResponse.json();
      setCalls(callData.calls);
      setPagination(callData.pagination);
      setAgents(await agentsResponse.json());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  async function loadShopUser() {
    try {
      const response = await previewFetch("/api/settings");
      if (!response.ok) return;
      const settings = await response.json();
      const profile = {
        name: settings.userName,
        email: settings.userEmail,
        shopName: settings.shopName,
      };
      setAdminPreview(Boolean(settings.adminPreview));
      if (profile.email) {
        localStorage.setItem("shop_user", JSON.stringify(profile));
        setShopUser(profile);
      }
    } catch {
      // Non-blocking: calls/calendar can still load without profile text.
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form)),
    });
    if (response.ok) {
      const user = await response.json();
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else if (user.role === "sales_manager") {
        window.location.href = "/manager";
      } else if (user.role === "sales") {
        window.location.href = "/sales";
      } else {
        const profile = {
          name: user.name,
          email: user.email,
          shopName: user.shopName,
        };
        localStorage.setItem("shop_user", JSON.stringify(profile));
        setShopUser(profile);
        loadCalls();
      }
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearPreviewSession();
    localStorage.removeItem("shop_user");
    window.location.href = "/";
  }

  function searchCalls(event) {
    event.preventDefault();
    loadCalls(1, search);
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("shop_user");
    if (getPreviewTarget() === "shop") {
      setAdminPreview(true);
    }
    if (savedUser) {
      try {
        setShopUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("shop_user");
      }
    }
    loadShopUser();
    loadCalls();
  }, []);

  useEffect(() => {
    if (!selectedCall) return;

    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedCall(null);
    }

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedCall]);

  useEffect(() => {
    if (!selectedCall || !adminPreview || !selectedCall.hasRecording) {
      setPreviewRecordingUrl("");
      return;
    }

    let active = true;
    let objectUrl = "";
    previewFetch(`/api/calls/${selectedCall.id}/recording`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewRecordingUrl(objectUrl);
      })
      .catch(() => setPreviewRecordingUrl(""));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [adminPreview, selectedCall]);

  if (state === "error") {
    return (
      <main className="shop-auth">
        <section className="auth-brand-panel" aria-label="ReserveSync overview">
          <div className="auth-logo-lockup">
            <img src={reserveSyncLogo.src} alt="ReserveSync" />
          </div>
          <div className="auth-hero-copy">
            <span className="eyebrow">
              <span className="live-dot" />
              Reservation operations
            </span>
            <h1>Keep every booking, call, and calendar in sync.</h1>
            <p>
              ReserveSync gives teams one clear workspace for appointments,
              staff availability, call history, and business settings.
            </p>
          </div>
          <div className="auth-signal-grid" aria-hidden="true">
            <div>
              <CalendarCheck2 size={18} />
              <strong>Live schedule</strong>
              <span>Today synced</span>
            </div>
            <div>
              <PhoneCall size={18} />
              <strong>Voice desk</strong>
              <span>Calls captured</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <strong>Secure access</strong>
              <span>Protected portal</span>
            </div>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Sign in">
          <form className="shop-login" onSubmit={login}>
            <div className="auth-form-header">
              <span className="auth-secure">
                <ShieldCheck size={15} /> Secure sign in
              </span>
              <h2>Welcome back</h2>
              <p>Sign in to continue to ReserveSync.</p>
            </div>

            <label className="auth-field">
              <span>Email address</span>
              <span className="auth-input-wrap">
                <Mail size={17} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={17} />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <div className="auth-row">
              <span>Protected account portal</span>
              <a href="mailto:ops@reservesync.com">Need help?</a>
            </div>

            <button className="auth-submit">Sign in</button>
            {loginError && (
              <p className="login-error" role="alert">
                {loginError}
              </p>
            )}
          </form>
          <small className="auth-footer">© 2026 ReserveSync</small>
        </section>
      </main>
    );
  }

  const navItems = [
    {
      key: "calendar",
      label: "Calendar",
      icon: CalendarDays,
      active: activeView === "calendar",
      onClick: () => setActiveView("calendar"),
    },
    {
      key: "calls",
      label: "Calls",
      icon: PhoneCall,
      count: pagination.total,
      active: activeView === "calls",
      onClick: () => setActiveView("calls"),
    },
    {
      key: "services",
      label: "Services",
      icon: ListChecks,
      active: activeView === "services",
      onClick: () => setActiveView("services"),
    },
    {
      key: "staff",
      label: "Staff",
      icon: UsersRound,
      active: activeView === "staff",
      onClick: () => setActiveView("staff"),
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: BarChart3,
      active: activeView === "analytics",
      onClick: () => setActiveView("analytics"),
    },
    {
      key: "business",
      label: "Business",
      icon: BriefcaseBusiness,
      active: activeView === "business",
      onClick: () => setActiveView("business"),
    },
  ];

  const topbarLeft = (
    <>
      {adminPreview && (
        <PreviewBanner
          onExit={() => {
            clearPreviewSession();
            window.close();
            window.location.href = "/admin";
          }}
        />
      )}
      <div className="topbar-numbers">
        <span>Assigned</span>
        {agents.filter((agent) => agent.assignedPhoneNumber).length ? (
          agents
            .filter((agent) => agent.assignedPhoneNumber)
            .map((agent) => (
              <a href={`tel:${agent.assignedPhoneNumber}`} key={agent._id}>
                <span
                  className={`agent-state ${agent.active ? "on" : "off"}`}
                />
                {agent.assignedPhoneNumber}
              </a>
            ))
        ) : (
          <small>No number assigned</small>
        )}
      </div>
    </>
  );

  return (
    <PortalShell
      logoSrc={reserveSyncLogo.src}
      navItems={navItems}
      statusTitle="System online"
      statusDetail={shopUser?.email}
      topbarLeft={topbarLeft}
      profileLabel={shopUser?.email || "Shop account"}
      profileOpen={profileOpen}
      onProfileToggle={() => setProfileOpen(!profileOpen)}
      onLogout={logout}
      mainClassName="shop-main"
    >
      {activeView === "calls" ? (
        <>
          <header className="shop-page-header">
            <div>
              <span className="admin-kicker">Call history</span>
              <h1>Calls</h1>
            </div>
            <button
              className="refresh"
              onClick={() => loadCalls(pagination.page, search)}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading…" : "Refresh"}
            </button>
          </header>

          <section className="call-panel">
            <div className="panel-heading">
              <span>Recent calls</span>
              <span>{pagination.total} total</span>
            </div>

            {state !== "error" && (
              <form className="call-search" onSubmit={searchCalls}>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search caller phone number"
                  aria-label="Search calls by phone number"
                />
                <button>Search</button>
                {search && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setSearch("");
                      loadCalls(1, "");
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            )}

            {state === "ready" && calls.length === 0 && (
              <div className="empty">
                <strong>{search ? "No matching calls" : "No calls yet"}</strong>
                <span>
                  {search
                    ? "Try another caller phone number."
                    : "Completed voice-agent calls will appear here."}
                </span>
              </div>
            )}

            {calls.map((call, index) => (
              <article
                className="call"
                key={call.id}
                style={{ "--delay": `${index * 45}ms` }}
              >
                <button
                  className="call-summary"
                  onClick={() => setSelectedCall(call)}
                  aria-label={`Open call from ${call.callerNumber || "unknown caller"}`}
                >
                  <span className="avatar">
                    {(call.callerNumber || "?").slice(-2)}
                  </span>
                  <span className="call-who">
                    <strong>{call.callerNumber || "Unknown caller"}</strong>
                    <small>to {call.calledNumber || "voice agent"}</small>
                  </span>
                  <span className="call-time">
                    <strong>{formatDate(call.startedAt)}</strong>
                    <small>{formatDuration(call.durationSeconds)}</small>
                  </span>
                  <span className={`status ${call.status}`}>
                    {call.status.replace("_", " ")}
                  </span>
                  <span className="chevron">↗</span>
                </button>
              </article>
            ))}

            {state === "ready" && pagination.totalPages > 1 && (
              <nav className="pagination" aria-label="Call history pages">
                <button
                  disabled={!pagination.hasPrevious}
                  onClick={() => loadCalls(pagination.page - 1, search)}
                >
                  ← Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => loadCalls(pagination.page + 1, search)}
                >
                  Next →
                </button>
              </nav>
            )}
          </section>
        </>
      ) : activeView === "calendar" ? (
        <CalendarView agents={agents} />
      ) : activeView === "services" ? (
        <ServicesView />
      ) : activeView === "staff" ? (
        <StaffView />
      ) : activeView === "analytics" ? (
        <AnalyticsView />
      ) : (
        <BusinessSettingsView />
      )}

      {selectedCall && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedCall(null)}
        >
          <section
            className="call-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-label">Call recording</span>
                <h2 id="modal-title">
                  {selectedCall.callerNumber || "Unknown caller"}
                </h2>
                <p>
                  {formatDate(selectedCall.startedAt)} ·{" "}
                  {formatDuration(selectedCall.durationSeconds)}
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelectedCall(null)}
                aria-label="Close call details"
                autoFocus
              >
                ×
              </button>
            </div>

            <div className="recording">
              <span>Recording</span>
              {selectedCall.hasRecording ? (
                <audio
                  controls
                  preload="none"
                  src={
                    adminPreview
                      ? previewRecordingUrl
                      : `/api/calls/${selectedCall.id}/recording`
                  }
                />
              ) : (
                <small>Recording unavailable</small>
              )}
            </div>

            <div className="transcript">
              <div className="transcript-title">
                Transcript{" "}
                <span>{selectedCall.transcript?.length || 0} messages</span>
              </div>
              {selectedCall.transcript?.length ? (
                selectedCall.transcript.map((message, messageIndex) => (
                  <div
                    className={`message ${message.speaker}`}
                    key={messageIndex}
                  >
                    <span>
                      {message.speaker === "assistant" ? "Agent" : "Caller"}
                    </span>
                    <p>{message.text}</p>
                    <time>
                      {formatDuration(Math.round(message.offsetMs / 1000))}
                    </time>
                  </div>
                ))
              ) : (
                <p className="no-transcript">No transcript was captured.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </PortalShell>
  );
}
