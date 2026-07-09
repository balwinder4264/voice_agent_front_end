"use client";

import { useEffect, useState } from "react";
import CalendarView from "./components/CalendarView";
import ServicesView from "./components/ServicesView";
import BusinessSettingsView from "./components/BusinessSettingsView";

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

export default function Home() {
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [state, setState] = useState("loading");
  const [loginError, setLoginError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState("calls");
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
        fetch(`/api/calls?page=${page}&q=${encodeURIComponent(query)}`),
        fetch("/api/agents"),
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
      } else {
        loadCalls();
      }
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function searchCalls(event) {
    event.preventDefault();
    loadCalls(1, search);
  }

  useEffect(() => {
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

  if (state === "error") {
    return (
      <main className="shop-auth">
        <form className="shop-login" onSubmit={login}>
          <span className="eyebrow"><span className="live-dot" />Voice agent portal</span>
          <h1>Welcome back</h1>
          <p>Sign in to review your calls and recordings.</p>
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button>Sign in</button>
          {loginError && (
            <p className="login-error" role="alert">{loginError}</p>
          )}
        </form>
      </main>
    );
  }

  return (
    <div className="shop-shell">
      <aside className="shop-sidebar">
        <div className="shop-brand">
          <span className="brand-mark">V</span>
          <span>Voice desk</span>
        </div>
        <nav>
          <button
            className={`shop-nav-item ${activeView === "calls" ? "active" : ""}`}
            onClick={() => setActiveView("calls")}
          >
            <span>◉</span> Calls
            <small>{pagination.total}</small>
          </button>
          <button
            className={`shop-nav-item ${activeView === "calendar" ? "active" : ""}`}
            onClick={() => setActiveView("calendar")}
          >
            <span>▦</span> Calendar
          </button>
          <button
            className={`shop-nav-item ${activeView === "services" ? "active" : ""}`}
            onClick={() => setActiveView("services")}
          >
            <span>≡</span> Services
          </button>
          <button
            className={`shop-nav-item ${activeView === "business" ? "active" : ""}`}
            onClick={() => setActiveView("business")}
          >
            <span>⌂</span> Business
          </button>
        </nav>
        <div className="sidebar-status">
          <span className="live-dot" />
          System online
        </div>
      </aside>

      <div className="shop-workspace">
        <div className="shop-topbar">
          <div className="topbar-numbers">
            <span>Assigned</span>
            {agents.length ? agents.map((agent) => (
              <a href={`tel:${agent.assignedPhoneNumber}`} key={agent._id}>
                <span className={`agent-state ${agent.active ? "on" : "off"}`} />
                {agent.assignedPhoneNumber}
              </a>
            )) : <small>No number assigned</small>}
          </div>
          <div className="profile-menu">
            <button
              className="profile-trigger"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-label="Open account menu"
            >
              <span className="person-glyph" />
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <span>Shop account</span>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <main className="shop-main">
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
      ) : (
        <BusinessSettingsView />
      )}
        </main>
      </div>

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
                  src={`/api/calls/${selectedCall.id}/recording`}
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
    </div>
  );
}
