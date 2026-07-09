"use client";

import { useEffect, useState } from "react";

function agentShopId(agent) {
  return typeof agent.shopId === "object" ? agent.shopId?._id : agent.shopId;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [shops, setShops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [showShopForm, setShowShopForm] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function load() {
    const [shopResponse, agentResponse] = await Promise.all([
      fetch("/api/admin/shops"),
      fetch("/api/admin/agents"),
    ]);
    if (!shopResponse.ok) return setAuthenticated(false);
    setShops(await shopResponse.json());
    setAgents(await agentResponse.json());
    setAuthenticated(true);
  }

  useEffect(() => { load(); }, []);

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    if (response.ok) {
      load();
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function createShop(event) {
    event.preventDefault();
    const response = await fetch("/api/admin/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    if (response.ok) {
      event.currentTarget.reset();
      setShowShopForm(false);
      load();
    }
  }

  async function saveAgent(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.shopId = selectedShopId;
    const editing = Boolean(agentForm?._id);
    const response = await fetch(
      `/api/admin/agents${editing ? `/${agentForm._id}` : ""}`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      setAgentForm(null);
      load();
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <span className="admin-kicker">Control room</span>
          <h1>Admin access</h1>
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

  const selectedShop = shops.find((shop) => shop._id === selectedShopId);
  const shopAgents = agents.filter(
    (agent) => agentShopId(agent) === selectedShopId,
  );

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">Voice network / Admin</span>
          <h1>Shops</h1>
          <p>Select a shop to manage its phone agents.</p>
        </div>
        <div className="header-actions">
          <button className="logout-button" onClick={logout}>Logout</button>
          <button className="admin-primary" onClick={() => setShowShopForm(true)}>
            + Create shop
          </button>
        </div>
      </header>

      {!selectedShop ? (
        <section className="shop-grid">
          {shops.map((shop) => {
            const count = agents.filter(
              (agent) => agentShopId(agent) === shop._id,
            ).length;
            return (
              <button
                className="shop-card"
                key={shop._id}
                onClick={() => setSelectedShopId(shop._id)}
              >
                <span className="shop-number">
                  {String(count).padStart(2, "0")}
                </span>
                <div>
                  <h2>{shop.name}</h2>
                  <p>{count} {count === 1 ? "agent" : "agents"}</p>
                </div>
                <span className="shop-arrow">→</span>
              </button>
            );
          })}
          {!shops.length && (
            <div className="admin-empty">Create your first shop to continue.</div>
          )}
        </section>
      ) : (
        <section className="shop-detail">
          <button
            className="admin-back"
            onClick={() => {
              setSelectedShopId(null);
              setAgentForm(null);
            }}
          >
            ← All shops
          </button>
          <div className="shop-detail-title">
            <div>
              <span className="admin-kicker">Shop workspace</span>
              <h2>{selectedShop.name}</h2>
            </div>
            <button className="admin-primary" onClick={() => setAgentForm({})}>
              + Create agent
            </button>
          </div>

          <div className="agent-list">
            {shopAgents.map((agent) => (
              <article className="agent-row" key={agent._id}>
                <span className={`agent-state ${agent.active ? "on" : "off"}`} />
                <div>
                  <h3>{agent.name}</h3>
                  <p>{agent.assignedPhoneNumber}</p>
                </div>
                <span className="agent-meta">
                  {agent.voice} · {agent.language}
                </span>
                <button onClick={() => setAgentForm(agent)}>Edit</button>
              </article>
            ))}
            {!shopAgents.length && (
              <div className="admin-empty">No agents are assigned to this shop.</div>
            )}
          </div>
        </section>
      )}

      {showShopForm && (
        <div className="admin-overlay" onMouseDown={() => setShowShopForm(false)}>
          <form
            className="admin-sheet compact"
            onSubmit={createShop}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setShowShopForm(false)}>×</button>
            <span className="admin-kicker">New business</span>
            <h2>Create shop</h2>
            <label>Shop name<input name="name" required /></label>
            <label>Owner login email<input name="email" type="email" required /></label>
            <label>Temporary password<input name="password" type="password" required /></label>
            <button className="admin-primary">Create shop and user</button>
          </form>
        </div>
      )}

      {agentForm && selectedShop && (
        <div className="admin-overlay" onMouseDown={() => setAgentForm(null)}>
          <form
            className="admin-sheet"
            key={agentForm._id || "new"}
            onSubmit={saveAgent}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setAgentForm(null)}>×</button>
            <span className="admin-kicker">{selectedShop.name}</span>
            <h2>{agentForm._id ? "Edit agent" : "Create agent"}</h2>
            <div className="form-pair">
              <label>Agent name<input name="name" defaultValue={agentForm.name} required /></label>
              <label>Phone number<input name="assignedPhoneNumber" defaultValue={agentForm.assignedPhoneNumber} placeholder="+14165551234" required /></label>
              <label>Voice<input name="voice" defaultValue={agentForm.voice || "marin"} required /></label>
              <label>Language<input name="language" defaultValue={agentForm.language || "en"} required /></label>
            </div>
            <label>Opening greeting<textarea name="greeting" rows="3" defaultValue={agentForm.greeting} required /></label>
            <label>Agent instructions<textarea name="instructions" rows="12" defaultValue={agentForm.instructions} required /></label>
            <label>Status
              <select name="active" defaultValue={String(agentForm.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button className="admin-primary">
              {agentForm._id ? "Save changes" : "Create agent"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
