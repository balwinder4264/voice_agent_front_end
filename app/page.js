"use client";

import { useEffect, useState } from "react";

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

  async function loadCalls() {
    setState("loading");

    try {
      const [callsResponse, agentsResponse] = await Promise.all([
        fetch("/api/calls"),
        fetch("/api/agents"),
      ]);
      if (!callsResponse.ok || !agentsResponse.ok) throw new Error();
      setCalls(await callsResponse.json());
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

  return (
    <main>
      <header>
        <div className="eyebrow">
          <span className="live-dot" />
          Voice agent archive
        </div>
        <div className="title-row">
          <div>
            <h1>Call desk</h1>
            <p>Listen back. Read what was said.</p>
          </div>
          <div className="header-actions">
            {state === "ready" && (
              <button className="logout-button" onClick={logout}>Logout</button>
            )}
            <button
              className="refresh"
              onClick={loadCalls}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {state === "ready" && (
        <section className="assigned-agents">
          <div className="panel-heading">
            <span>Assigned phone numbers</span>
            <span>{agents.length} {agents.length === 1 ? "agent" : "agents"}</span>
          </div>
          <div className="assigned-agent-grid">
            {agents.map((agent) => (
              <article className="assigned-agent" key={agent._id}>
                <span className={`agent-state ${agent.active ? "on" : "off"}`} />
                <div>
                  <strong>{agent.name}</strong>
                  <a href={`tel:${agent.assignedPhoneNumber}`}>
                    {agent.assignedPhoneNumber}
                  </a>
                </div>
                <small>{agent.active ? "Active" : "Inactive"}</small>
              </article>
            ))}
            {!agents.length && (
              <div className="no-assigned-agent">
                No phone number is assigned to this shop.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="call-panel">
        <div className="panel-heading">
          <span>Recent calls</span>
          <span>{calls.length} total</span>
        </div>

        {state === "error" && (
          <div className="empty">
            <strong>Shop sign in</strong>
            <form className="shop-login" onSubmit={login}>
              <input name="email" type="email" placeholder="Email" required />
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
              />
              <button>Sign in</button>
              {loginError && (
                <p className="login-error" role="alert">{loginError}</p>
              )}
            </form>
          </div>
        )}

        {state === "ready" && calls.length === 0 && (
          <div className="empty">
            <strong>No calls yet</strong>
            <span>Completed voice-agent calls will appear here.</span>
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
      </section>

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
    </main>
  );
}
