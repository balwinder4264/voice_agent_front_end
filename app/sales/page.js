"use client";

import { useEffect, useState } from "react";
import reserveSyncLogo from "../reservesync-dark.svg";
import { clearPreviewSession, getPreviewTarget, previewFetch } from "../previewSession";

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
  const [agentTemplates, setAgentTemplates] = useState([]);
  const [state, setState] = useState("loading");
  const [loginError, setLoginError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminPreview, setAdminPreview] = useState(false);
  const [agentForm, setAgentForm] = useState(null);
  const [shopFormOpen, setShopFormOpen] = useState(false);

  async function loadPortal() {
    setState("loading");
    try {
      const [meResponse, shopsResponse, templatesResponse] = await Promise.all([
        previewFetch("/api/sales/me"),
        previewFetch("/api/sales/shops"),
        previewFetch("/api/sales/agent-templates"),
      ]);
      if (!meResponse.ok || !shopsResponse.ok || !templatesResponse.ok) {
        throw new Error();
      }
      const me = await meResponse.json();
      setSalesUser(me);
      setAdminPreview(Boolean(me.adminPreview));
      const shopData = await shopsResponse.json();
      setShops(shopData.shops || []);
      setAgentTemplates(await templatesResponse.json());
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
    clearPreviewSession();
    setSalesUser(null);
    setShops([]);
    setState("login");
  }

  async function openAgent(shop) {
    const response = await previewFetch(`/api/sales/shops/${shop._id}/agent`);
    if (response.ok) {
      setAgentForm({ shop, agent: await response.json() });
    }
  }

  async function saveAgent(event) {
    event.preventDefault();
    const response = await previewFetch(
      `/api/sales/shops/${agentForm.shop._id}/agent`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      },
    );
    if (response.ok) {
      setAgentForm(null);
      loadPortal();
    }
  }

  async function createShop(event) {
    event.preventDefault();
    const response = await previewFetch("/api/sales/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    if (response.ok) {
      setShopFormOpen(false);
      loadPortal();
    }
  }

  useEffect(() => {
    loadPortal();
    if (getPreviewTarget() === "sales") setAdminPreview(true);
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
          {adminPreview && (
            <div className="preview-banner">
              <span>Admin preview</span>
              <button
                onClick={() => {
                  clearPreviewSession();
                  window.close();
                  window.location.href = "/admin";
                }}
              >
                Exit preview
              </button>
            </div>
          )}
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
            <div className="admin-header-actions">
              <button className="refresh" onClick={loadPortal} disabled={state === "loading"}>
                {state === "loading" ? "Loading..." : "Refresh"}
              </button>
              <button className="admin-primary" onClick={() => setShopFormOpen(true)}>
                + Create shop
              </button>
            </div>
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
                <button onClick={() => openAgent(shop)}>Agent</button>
              </article>
            ))}
            {state === "ready" && !shops.length && (
              <div className="admin-empty">No shops are assigned to you yet.</div>
            )}
          </section>
        </main>
      </div>

      {shopFormOpen && (
        <div className="admin-overlay" onMouseDown={() => setShopFormOpen(false)}>
          <form
            className="admin-sheet compact"
            onSubmit={createShop}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setShopFormOpen(false)}>x</button>
            <span className="admin-kicker">New account</span>
            <h2>Create shop</h2>
            <label>Shop name<input name="name" required /></label>
            <label>Business type / agent template
              <select name="agentTemplateId" required defaultValue="">
                <option value="" disabled>
                  {agentTemplates.length ? "Select template" : "No active templates"}
                </option>
                {agentTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.businessType} - {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label>Owner login email<input name="email" type="email" required /></label>
            <label>Temporary password<input name="password" type="password" required /></label>
            <button className="admin-primary">Create shop</button>
          </form>
        </div>
      )}

      {agentForm && (
        <div className="admin-overlay" onMouseDown={() => setAgentForm(null)}>
          <form
            className="admin-sheet"
            onSubmit={saveAgent}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setAgentForm(null)}>x</button>
            <span className="admin-kicker">{agentForm.shop.name}</span>
            <h2>Edit agent</h2>
            <div className="form-pair">
              <label>Agent name<input name="name" defaultValue={agentForm.agent.name} required /></label>
              <label>Phone number<input name="assignedPhoneNumber" defaultValue={agentForm.agent.assignedPhoneNumber} placeholder="+14165551234" /></label>
              <label>Voice<input name="voice" defaultValue={agentForm.agent.voice || "marin"} required /></label>
              <label>Language<input name="language" defaultValue={agentForm.agent.language || "en"} required /></label>
            </div>
            <label>Opening greeting<textarea name="greeting" rows="3" defaultValue={agentForm.agent.greeting} required /></label>
            <label>Agent instructions<textarea name="instructions" rows="12" defaultValue={agentForm.agent.instructions} required /></label>
            <label>Status
              <select name="active" defaultValue={String(agentForm.agent.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button className="admin-primary">Save agent</button>
          </form>
        </div>
      )}
    </div>
  );
}
