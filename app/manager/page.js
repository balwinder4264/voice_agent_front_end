"use client";

import { useEffect, useState } from "react";
import { Store, UsersRound } from "lucide-react";
import reserveSyncLogo from "../reservesync-dark.svg";
import { clearPreviewSession, getPreviewTarget, previewFetch } from "../previewSession";
import { PortalShell, PreviewBanner } from "../components/portal/PortalShell";

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

function formatMoney(amountCents, currency) {
  if (!amountCents || !currency) return "";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function paymentEventLabel(event) {
  const amount = formatMoney(event.amountCents, event.currency);
  return amount ? `${event.message} · ${amount}` : event.message;
}

export default function ManagerPage() {
  const [manager, setManager] = useState(null);
  const [shops, setShops] = useState([]);
  const [reps, setReps] = useState([]);
  const [agentTemplates, setAgentTemplates] = useState([]);
  const [state, setState] = useState("loading");
  const [activeView, setActiveView] = useState("shops");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [shopForm, setShopForm] = useState(null);
  const [repForm, setRepForm] = useState(null);
  const [adminPreview, setAdminPreview] = useState(false);
  const [agentForm, setAgentForm] = useState(null);
  const [paymentLogsShop, setPaymentLogsShop] = useState(null);

  async function load() {
    setState("loading");
    try {
      const [meResponse, shopsResponse, repsResponse, templatesResponse] =
        await Promise.all([
        previewFetch("/api/manager/me"),
        previewFetch("/api/manager/shops"),
        previewFetch("/api/manager/sales-people"),
        previewFetch("/api/manager/agent-templates"),
      ]);
      if (
        !meResponse.ok ||
        !shopsResponse.ok ||
        !repsResponse.ok ||
        !templatesResponse.ok
      ) {
        throw new Error();
      }
      const me = await meResponse.json();
      setManager(me);
      setAdminPreview(Boolean(me.adminPreview));
      setShops((await shopsResponse.json()).shops || []);
      setReps(await repsResponse.json());
      setAgentTemplates(await templatesResponse.json());
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

  async function openAgent(shop) {
    const response = await previewFetch(`/api/manager/shops/${shop._id}/agent`);
    if (response.ok) {
      setAgentForm({ shop, agent: await response.json() });
    }
  }

  async function saveAgent(event) {
    event.preventDefault();
    const response = await previewFetch(
      `/api/manager/shops/${agentForm.shop._id}/agent`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      },
    );
    if (response.ok) {
      setAgentForm(null);
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

  const navItems = [
    {
      key: "shops",
      label: "Shops",
      icon: Store,
      count: shops.length,
      active: activeView === "shops",
      onClick: () => setActiveView("shops"),
    },
    {
      key: "reps",
      label: "Team",
      icon: UsersRound,
      count: reps.length,
      active: activeView === "reps",
      onClick: () => setActiveView("reps"),
    },
  ];

  const topbarLeft = adminPreview ? (
    <PreviewBanner
      onExit={() => {
        clearPreviewSession();
        window.close();
        window.location.href = "/admin";
      }}
    />
  ) : null;

  return (
    <PortalShell
      logoSrc={reserveSyncLogo.src}
      navItems={navItems}
      statusTitle="Manager online"
      statusDetail={manager?.email}
      topbarLeft={topbarLeft}
      topbarLabel="Manager Portal"
      profileLabel={manager?.email || "Manager account"}
      profileOpen={profileOpen}
      onProfileToggle={() => setProfileOpen(!profileOpen)}
      onLogout={logout}
      mainClassName="sales-main"
    >
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
                    <button onClick={() => setPaymentLogsShop(shop)}>
                      Logs{shop.subscription?.events?.length ? ` (${shop.subscription.events.length})` : ""}
                    </button>
                    <button onClick={() => openAgent(shop)}>Agent</button>
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
            {!shopForm._id && (
              <label>Business type / agent template
                <select name="agentTemplateId" required defaultValue="">
                  <option value="" disabled>Select template</option>
                  {agentTemplates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.businessType} - {template.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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

      {paymentLogsShop && (
        <div className="admin-overlay" onMouseDown={() => setPaymentLogsShop(null)}>
          <aside
            className="admin-sheet compact billing-log-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setPaymentLogsShop(null)}>x</button>
            <span className="admin-kicker">{paymentLogsShop.name}</span>
            <h2>Payment logs</h2>
            <div className="billing-log-heading">
              <span>Recent Stripe updates</span>
              <small>{paymentLogsShop.subscription?.events?.length || 0} events</small>
            </div>
            <div className="billing-log-list">
              {paymentLogsShop.subscription?.events?.length ? (
                paymentLogsShop.subscription.events.map((event, index) => (
                  <div className="billing-log-row" key={`${event.occurredAt}-${index}`}>
                    <span className={`billing-log-dot ${event.type}`} />
                    <div>
                      <strong>{paymentEventLabel(event)}</strong>
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
    </PortalShell>
  );
}
