"use client";

import { useEffect, useState } from "react";
import reserveSyncLogo from "../reservesync-dark.svg";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function SalesPage() {
  const [salesUser, setSalesUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [state, setState] = useState("loading");
  const [loginError, setLoginError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  async function loadPortal() {
    setState("loading");
    try {
      const [meResponse, shopsResponse] = await Promise.all([
        fetch("/api/sales/me"),
        fetch("/api/sales/shops"),
      ]);
      if (!meResponse.ok || !shopsResponse.ok) throw new Error();
      setSalesUser(await meResponse.json());
      const shopData = await shopsResponse.json();
      setShops(shopData.shops || []);
      setState("ready");
    } catch {
      setState("login");
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/sales/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    if (response.ok) {
      setSalesUser(await response.json());
      loadPortal();
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  async function logout() {
    await fetch("/api/sales/auth/logout", { method: "POST" });
    setSalesUser(null);
    setShops([]);
    setState("login");
  }

  useEffect(() => {
    loadPortal();
  }, []);

  if (state === "login") {
    return (
      <main className="shop-auth">
        <form className="shop-login" onSubmit={login}>
          <span className="eyebrow"><span className="live-dot" />Sales portal</span>
          <h1>Sales access</h1>
          <p>Sign in to view your assigned shops.</p>
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
    <div className="sales-shell">
      <aside className="sales-sidebar">
        <div className="shop-brand">
          <img className="brand-logo" src={reserveSyncLogo.src} alt="ReserveSync" />
        </div>
        <nav>
          <button className="shop-nav-item active">
            <span>▦</span> Assigned Shops
            <small>{shops.length}</small>
          </button>
        </nav>
        <div className="sidebar-status">
          <span className="live-dot" />
          <span>
            <strong>Sales online</strong>
            {salesUser?.email && <small>{salesUser.email}</small>}
          </span>
        </div>
      </aside>

      <div className="sales-workspace">
        <div className="shop-topbar">
          <span className="sales-topbar-label">Sales Portal</span>
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
                <span>{salesUser?.email || "Sales account"}</span>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <main className="sales-main">
          <header className="sales-page-header">
            <div>
              <span className="admin-kicker">My accounts</span>
              <h1>Assigned Shops</h1>
              <p>{shops.length} shops assigned to {salesUser?.name || "you"}.</p>
            </div>
            <button className="refresh" onClick={loadPortal} disabled={state === "loading"}>
              {state === "loading" ? "Loading..." : "Refresh"}
            </button>
          </header>

          <section className="sales-shop-list">
            {shops.map((shop, index) => (
              <article
                className="sales-shop-row"
                key={shop._id}
                style={{ "--delay": `${index * 45}ms` }}
              >
                <span className={`agent-state ${shop.active ? "on" : "off"}`} />
                <div>
                  <h2>{shop.name}</h2>
                  <p>Assigned since {formatDate(shop.createdAt)}</p>
                </div>
                <span className={`service-status ${shop.active ? "active" : "inactive"}`}>
                  {shop.active ? "Active" : "Inactive"}
                </span>
              </article>
            ))}
            {state === "ready" && !shops.length && (
              <div className="admin-empty">No shops are assigned to you yet.</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
