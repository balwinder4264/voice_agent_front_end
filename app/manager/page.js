"use client";

import { useEffect, useState } from "react";
import reserveSyncLogo from "../reservesync-dark.svg";
import { clearPreviewSession, getPreviewTarget, previewFetch } from "../previewSession";

function assignedRepName(shop) {
  return typeof shop.assignedSalesPersonId === "object"
    ? shop.assignedSalesPersonId?.name
    : null;
}

function assignedRepId(shop) {
  return typeof shop.assignedSalesPersonId === "object"
    ? shop.assignedSalesPersonId?._id
    : shop.assignedSalesPersonId;
}

export default function ManagerPage() {
  const [manager, setManager] = useState(null);
  const [shops, setShops] = useState([]);
  const [reps, setReps] = useState([]);
  const [state, setState] = useState("loading");
  const [activeView, setActiveView] = useState("shops");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [shopForm, setShopForm] = useState(null);
  const [repForm, setRepForm] = useState(null);
  const [adminPreview, setAdminPreview] = useState(false);

  async function load() {
    setState("loading");
    try {
      const [meResponse, shopsResponse, repsResponse] = await Promise.all([
        previewFetch("/api/manager/me"),
        previewFetch("/api/manager/shops"),
        previewFetch("/api/manager/sales-people"),
      ]);
      if (!meResponse.ok || !shopsResponse.ok || !repsResponse.ok) {
        throw new Error();
      }
      const me = await meResponse.json();
      setManager(me);
      setAdminPreview(Boolean(me.adminPreview));
      setShops((await shopsResponse.json()).shops || []);
      setReps(await repsResponse.json());
      setState("ready");
    } catch {
      setState("login");
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/manager/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    if (response.ok) {
      setManager(await response.json());
      load();
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  async function logout() {
    await fetch("/api/manager/auth/logout", { method: "POST" });
    clearPreviewSession();
    setManager(null);
    setState("login");
  }

  async function saveShop(event) {
    event.preventDefault();
    const editing = Boolean(shopForm?._id);
    const response = await previewFetch(
      `/api/manager/shops${editing ? `/${shopForm._id}` : ""}`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      },
    );
    if (response.ok) {
      setShopForm(null);
      load();
    }
  }

  async function saveRep(event) {
    event.preventDefault();
    const editing = Boolean(repForm?._id);
    const response = await previewFetch(
      `/api/manager/sales-people${editing ? `/${repForm._id}` : ""}`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      },
    );
    if (response.ok) {
      setRepForm(null);
      load();
    }
  }

  useEffect(() => {
    load();
    if (getPreviewTarget() === "manager") setAdminPreview(true);
  }, []);

  if (state === "login") {
    return (
      <main className="shop-auth">
        <form className="shop-login" onSubmit={login}>
          <span className="eyebrow"><span className="live-dot" />Manager portal</span>
          <h1>Manager access</h1>
          <p>Sign in to manage your team and shops.</p>
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button>Sign in</button>
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
        </form>
      </main>
    );
  }

  return (
    <div className="manager-shell">
      <aside className="sales-sidebar">
        <div className="shop-brand">
          <img className="brand-logo" src={reserveSyncLogo.src} alt="ReserveSync" />
        </div>
        <nav>
          <button
            className={`shop-nav-item ${activeView === "shops" ? "active" : ""}`}
            onClick={() => setActiveView("shops")}
          >
            <span>◆</span> Shops
            <small>{shops.length}</small>
          </button>
          <button
            className={`shop-nav-item ${activeView === "reps" ? "active" : ""}`}
            onClick={() => setActiveView("reps")}
          >
            <span>◈</span> Team
            <small>{reps.length}</small>
          </button>
        </nav>
        <div className="sidebar-status">
          <span className="live-dot" />
          <span>
            <strong>Manager online</strong>
            {manager?.email && <small>{manager.email}</small>}
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
          <span className="sales-topbar-label">Manager Portal</span>
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
                <span>{manager?.email || "Manager account"}</span>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <main className="sales-main">
          {activeView === "shops" ? (
            <section>
              <header className="sales-page-header">
                <div>
                  <span className="admin-kicker">Team accounts</span>
                  <h1>Shops</h1>
                  <p>{shops.length} shops owned by your sales team.</p>
                </div>
                <button className="admin-primary" onClick={() => setShopForm({})}>
                  + Create shop
                </button>
              </header>

              <div className="sales-shop-list">
                {shops.map((shop, index) => (
                  <article
                    className="manager-row"
                    key={shop._id}
                    style={{ "--delay": `${index * 45}ms` }}
                  >
                    <span className={`agent-state ${shop.active ? "on" : "off"}`} />
                    <div>
                      <h2>{shop.name}</h2>
                      <p>Rep: {assignedRepName(shop) || "Unassigned"}</p>
                    </div>
                    <span className={`service-status ${shop.active ? "active" : "inactive"}`}>
                      {shop.active ? "Active" : "Inactive"}
                    </span>
                    <button onClick={() => setShopForm(shop)}>Edit</button>
                  </article>
                ))}
                {state === "ready" && !shops.length && (
                  <div className="admin-empty">Create your first team shop.</div>
                )}
              </div>
            </section>
          ) : (
            <section>
              <header className="sales-page-header">
                <div>
                  <span className="admin-kicker">Sales team</span>
                  <h1>Team</h1>
                  <p>{reps.length} reps under your manager account.</p>
                </div>
                <button className="admin-primary" onClick={() => setRepForm({})}>
                  + Add rep
                </button>
              </header>

              <div className="sales-shop-list">
                {reps.map((rep, index) => (
                  <article
                    className="manager-row"
                    key={rep._id}
                    style={{ "--delay": `${index * 45}ms` }}
                  >
                    <span className={`agent-state ${rep.active ? "on" : "off"}`} />
                    <div>
                      <h2>{rep.name}</h2>
                      <p>{rep.email || "No email"} · {rep.phone || "No phone"}</p>
                    </div>
                    <span className="agent-meta">
                      {rep.assignedShopCount || 0} assigned
                    </span>
                    <button onClick={() => setRepForm(rep)}>Edit</button>
                  </article>
                ))}
                {state === "ready" && !reps.length && (
                  <div className="admin-empty">Add your first sales rep.</div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {shopForm && (
        <div className="admin-overlay" onMouseDown={() => setShopForm(null)}>
          <form
            className="admin-sheet compact"
            onSubmit={saveShop}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setShopForm(null)}>x</button>
            <span className="admin-kicker">Manager shop</span>
            <h2>{shopForm._id ? "Edit shop" : "Create shop"}</h2>
            <label>Shop name<input name="name" defaultValue={shopForm.name} required /></label>
            <label>Assigned sales rep
              <select name="assignedSalesPersonId" defaultValue={assignedRepId(shopForm) || ""}>
                <option value="">Unassigned</option>
                {reps.filter((rep) => rep.active || rep._id === assignedRepId(shopForm)).map((rep) => (
                  <option key={rep._id} value={rep._id}>{rep.name}</option>
                ))}
              </select>
            </label>
            {shopForm._id ? (
              <label>Status
                <select name="active" defaultValue={String(shopForm.active ?? true)}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            ) : (
              <>
                <label>Owner login email<input name="email" type="email" required /></label>
                <label>Temporary password<input name="password" type="password" required /></label>
              </>
            )}
            <button className="admin-primary">
              {shopForm._id ? "Save shop" : "Create shop"}
            </button>
          </form>
        </div>
      )}

      {repForm && (
        <div className="admin-overlay" onMouseDown={() => setRepForm(null)}>
          <form
            className="admin-sheet compact"
            onSubmit={saveRep}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setRepForm(null)}>x</button>
            <span className="admin-kicker">Team rep</span>
            <h2>{repForm._id ? "Edit rep" : "Add rep"}</h2>
            <label>Name<input name="name" defaultValue={repForm.name} required /></label>
            <label>Email<input name="email" type="email" defaultValue={repForm.email} /></label>
            <label>Phone<input name="phone" defaultValue={repForm.phone} /></label>
            <label>
              {repForm.userId ? "Reset login password" : "Temporary login password"}
              <input name="password" type="password" />
            </label>
            <label>Status
              <select name="active" defaultValue={String(repForm.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button className="admin-primary">
              {repForm._id ? "Save rep" : "Add rep"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
