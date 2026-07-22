"use client";

import { useEffect, useState } from "react";
import { previewFetch } from "../previewSession";

function minutes(seconds = 0) {
  const value = seconds / 60;
  return value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1);
}

function duration(seconds = 0) {
  const minutesValue = Math.floor(seconds / 60);
  return `${minutesValue}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function money(amountCents, currency) {
  if (!amountCents || !currency) return "Not set";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function statusLabel(status) {
  return String(status || "none").replace(/_/g, " ");
}

function eventLabel(event) {
  const amount = money(event.amountCents, event.currency);
  return amount === "Not set" ? event.message : `${event.message} · ${amount}`;
}

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [logsOpen, setLogsOpen] = useState(false);

  async function loadAnalytics() {
    setState("loading");
    try {
      const response = await previewFetch("/api/analytics", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (state === "loading" && !data) {
    return <div className="analytics-loading">Calculating usage…</div>;
  }

  if (state === "error" && !data) {
    return (
      <section className="analytics-error">
        <strong>Usage data could not be loaded.</strong>
        <button onClick={loadAnalytics}>Try again</button>
      </section>
    );
  }

  const cards = [
    ["Today", data.today],
    ["This month", data.month],
    ["This year", data.year],
    ["Lifetime", data.lifetime],
  ];
  const maximum = Math.max(...data.trend.map((day) => day.seconds), 1);
  const paymentEvents = data.subscription?.events || [];

  return (
    <section className="analytics-module">
      <header className="analytics-header">
        <div>
          <span className="admin-kicker">Analytics &amp; usage</span>
          <h1>Usage</h1>
          <p>Call activity measured from completed voice conversations.</p>
        </div>
        <button className="refresh" onClick={loadAnalytics} disabled={state === "loading"}>
          {state === "loading" ? "Loading…" : "Refresh"}
        </button>
      </header>

      <div className="usage-cards">
        <article className="billing-card">
          <div>
            <span>Subscription</span>
            <strong>{money(data.subscription?.amountCents, data.subscription?.currency)}</strong>
            <small>
              {data.subscription?.currency
                ? `${data.subscription.currency} monthly`
                : "No paid subscription yet"}
            </small>
          </div>
          <div>
            <span>Status</span>
            <b className={`billing-status ${data.subscription?.status || "none"}`}>
              {statusLabel(data.subscription?.status)}
            </b>
            {data.subscription?.currentPeriodEnd && (
              <small>
                Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            )}
            {data.subscription?.pauseCollectionBehavior && (
              <small>Payment collection paused</small>
            )}
            {data.subscription?.cancelAtPeriodEnd && data.subscription?.cancelAt && (
              <small>
                Ends {new Date(data.subscription.cancelAt).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            )}
            <button className="billing-log-trigger" onClick={() => setLogsOpen(true)}>
              Payment logs {paymentEvents.length ? `(${paymentEvents.length})` : ""}
            </button>
          </div>
        </article>
        {cards.map(([label, metric], index) => (
          <article className="usage-card" key={label}>
            <span className="usage-index">0{index + 1}</span>
            <span>{label}</span>
            <strong>{minutes(metric.seconds)}</strong>
            <small>minutes · {metric.calls.toLocaleString()} calls</small>
          </article>
        ))}
      </div>

      <div className="analytics-grid">
        <article className="usage-chart-card">
          <div className="usage-section-heading">
            <div>
              <span>Last 30 days</span>
              <strong>Daily voice usage</strong>
            </div>
            <small>{data.timezone}</small>
          </div>
          <div className="usage-chart" aria-label="Daily minutes used over the last 30 days">
            {data.trend.map((day, index) => (
              <div
                className="usage-bar-column"
                key={day.date}
                title={`${day.date}: ${minutes(day.seconds)} minutes`}
              >
                <span
                  className={day.seconds ? "usage-bar active" : "usage-bar"}
                  style={{ height: `${Math.max((day.seconds / maximum) * 100, day.seconds ? 5 : 1)}%` }}
                />
                {(index === 0 || index === 14 || index === 29) && (
                  <time>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</time>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="usage-summary-card">
          <span className="usage-summary-label">Lifetime signal</span>
          <strong>{data.lifetime.calls.toLocaleString()}</strong>
          <p>Total calls handled</p>
          <div>
            <span>Average call</span>
            <b>{duration(data.lifetime.averageSeconds)}</b>
          </div>
          <div>
            <span>Total voice time</span>
            <b>{minutes(data.lifetime.seconds)} min</b>
          </div>
        </article>
      </div>
      {logsOpen && (
        <div className="admin-overlay" onMouseDown={() => setLogsOpen(false)}>
          <aside
            className="admin-sheet compact billing-log-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setLogsOpen(false)}>x</button>
            <span className="admin-kicker">Billing</span>
            <h2>Payment logs</h2>
            <div className="billing-log-heading">
              <span>Recent Stripe updates</span>
              <small>{paymentEvents.length} events</small>
            </div>
            <div className="billing-log-list">
              {paymentEvents.length ? (
                paymentEvents.map((event, index) => (
                  <div className="billing-log-row" key={`${event.occurredAt}-${index}`}>
                    <span className={`billing-log-dot ${event.type}`} />
                    <div>
                      <strong>{eventLabel(event)}</strong>
                      <time>
                        {new Date(event.occurredAt).toLocaleString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p>No payment activity yet.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
