"use client";

import { useEffect, useState } from "react";
import reserveSyncLogo from "../reservesync-dark.svg";

function agentShopId(agent) {
  return typeof agent.shopId === "object" ? agent.shopId?._id : agent.shopId;
}

function shopSalesPersonId(shop) {
  return typeof shop.assignedSalesPersonId === "object"
    ? shop.assignedSalesPersonId?._id
    : shop.assignedSalesPersonId;
}

function shopSalesManagerId(shop) {
  return typeof shop.salesManagerId === "object"
    ? shop.salesManagerId?._id
    : shop.salesManagerId;
}

function salesPersonName(shop) {
  return typeof shop.assignedSalesPersonId === "object"
    ? shop.assignedSalesPersonId?.name
    : null;
}

function salesManagerName(shop) {
  return typeof shop.salesManagerId === "object" ? shop.salesManagerId?.name : null;
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

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [shops, setShops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);
  const [agentTemplates, setAgentTemplates] = useState([]);
  const [activeSection, setActiveSection] = useState("shops");
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [shopForm, setShopForm] = useState(null);
  const [salesPersonForm, setSalesPersonForm] = useState(null);
  const [agentTemplateForm, setAgentTemplateForm] = useState(null);
  const [paymentLogsShop, setPaymentLogsShop] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  });

  async function load(page = 1, query = search) {
    const [
      shopResponse,
      agentResponse,
      salesPeopleResponse,
      agentTemplatesResponse,
    ] = await Promise.all([
      fetch(`/api/admin/shops?page=${page}&q=${encodeURIComponent(query)}`),
      fetch("/api/admin/agents"),
      fetch("/api/admin/sales-people"),
      fetch("/api/admin/agent-templates"),
    ]);
    if (!shopResponse.ok) return setAuthenticated(false);
    const shopData = await shopResponse.json();
    setShops(shopData.shops);
    setPagination(shopData.pagination);
    setAgents(await agentResponse.json());
    setSalesPeople(await salesPeopleResponse.json());
    setAgentTemplates(await agentTemplatesResponse.json());
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

  async function saveShop(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const editing = Boolean(shopForm?._id);
    const response = await fetch(`/api/admin/shops${editing ? `/${shopForm._id}` : ""}`, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      event.currentTarget.reset();
      setShopForm(null);
      if (editing) {
        load(pagination.page, search);
      } else {
        setSearch("");
        load(1, "");
      }
    }
  }

  async function saveSalesPerson(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const editing = Boolean(salesPersonForm?._id);
    const response = await fetch(
      `/api/admin/sales-people${editing ? `/${salesPersonForm._id}` : ""}`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      setSalesPersonForm(null);
      load(pagination.page, search);
    }
  }

  async function saveAgentTemplate(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const editing = Boolean(agentTemplateForm?._id);
    const response = await fetch(
      `/api/admin/agent-templates${editing ? `/${agentTemplateForm._id}` : ""}`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      setAgentTemplateForm(null);
      load(pagination.page, search);
    }
  }

  async function deleteShop(shop) {
    if (
      !window.confirm(
        `Delete "${shop.name}" and all of its users, agent, calls, appointments, services, staff, and settings?`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/shops/${shop._id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setSelectedShopId(null);
      setShopForm(null);
      load(1, search);
    }
  }

  async function deleteSalesPerson(person) {
    if (
      !window.confirm(
        `Delete "${person.name}"? Shops and reps linked to this person will be unassigned.`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/sales-people/${person._id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setSalesPersonForm(null);
      load(pagination.page, search);
    }
  }

  async function deleteAgentTemplate(template) {
    if (
      !window.confirm(
        `Delete template "${template.name}"? Existing shop agents copied from it will not change.`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/agent-templates/${template._id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setAgentTemplateForm(null);
      load(pagination.page, search);
    }
  }

  async function openShopPreview(shopId) {
    const response = await fetch(`/api/admin/shops/${shopId}/preview`, {
      method: "POST",
    });
    if (!response.ok) return;
    const preview = await response.json();
    window.open(
      `${preview.previewPath}#${encodeURIComponent(preview.token)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function openSalesPreview(salesPersonId) {
    const response = await fetch(`/api/admin/sales-people/${salesPersonId}/preview`, {
      method: "POST",
    });
    if (!response.ok) return;
    const preview = await response.json();
    window.open(
      `${preview.previewPath}#${encodeURIComponent(preview.token)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
      load(pagination.page, search);
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
  const salesManagers = salesPeople.filter(
    (person) => person.salesRole === "manager",
  );
  const salesReps = salesPeople.filter(
    (person) => (person.salesRole || "rep") === "rep",
  );
  const activeAgentTemplates = agentTemplates.filter(
    (template) => template.active,
  );
  const editingShop = Boolean(shopForm?._id);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="shop-brand">
          <img className="brand-logo" src={reserveSyncLogo.src} alt="ReserveSync" />
        </div>
        <nav>
          <button
            className={`admin-nav-item ${activeSection === "shops" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("shops");
              setSelectedShopId(null);
            }}
          >
            <span>◆</span> Shops
            <small>{pagination.total}</small>
          </button>
          <button
            className={`admin-nav-item ${activeSection === "sales" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("sales");
              setSelectedShopId(null);
              setAgentForm(null);
            }}
          >
            <span>◈</span> Sales
            <small>{salesPeople.length}</small>
          </button>
          <button
            className={`admin-nav-item ${activeSection === "templates" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("templates");
              setSelectedShopId(null);
              setAgentForm(null);
            }}
          >
            <span>▣</span> Templates
            <small>{agentTemplates.length}</small>
          </button>
        </nav>
        <div className="sidebar-status">
          <span className="live-dot" />
          Admin console
        </div>
      </aside>

      <div className="admin-workspace">
        <div className="admin-topbar">
          <span>Administration</span>
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
                <span>Administrator</span>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>

    <main className="admin">
      {activeSection === "shops" && (
        <>
        <header className="admin-header">
          <div>
            <span className="admin-kicker">Business directory</span>
            <h1>Shops</h1>
            <p>{pagination.total} shops · Select one to manage its agents.</p>
          </div>
          <button className="admin-primary" onClick={() => setShopForm({})}>
            + Create shop
          </button>
        </header>
        {!selectedShop ? (
        <>
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            load(1, search);
          }}
        >
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shops by name"
          />
          <button>Search</button>
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setSearch("");
                load(1, "");
              }}
            >
              Clear
            </button>
          )}
        </form>
        <section className="shop-grid">
          {shops.map((shop) => {
            const count = agents.filter(
              (agent) => agentShopId(agent) === shop._id,
            ).length;
            return (
              <article
                className="shop-row"
                key={shop._id}
              >
                <button
                  className="shop-card-main"
                  onClick={() => setSelectedShopId(shop._id)}
                >
                  <span className="shop-number">
                    {String(count).padStart(2, "0")}
                  </span>
                  <div>
                    <h2>{shop.name}</h2>
                    <p>
                      {count} {count === 1 ? "agent" : "agents"}
                      {" · "}
                      Rep: {salesPersonName(shop) || "Unassigned"}
                      {" · "}
                      Manager: {salesManagerName(shop) || "Unassigned"}
                    </p>
                  </div>
                </button>
                <div className="shop-row-actions">
                  <button onClick={() => setSelectedShopId(shop._id)}>
                    Manage
                  </button>
                  <button onClick={() => openShopPreview(shop._id)}>
                    Portal
                  </button>
                  <button onClick={() => setPaymentLogsShop(shop)}>
                    Logs{shop.subscription?.events?.length ? ` (${shop.subscription.events.length})` : ""}
                  </button>
                  <button onClick={() => setShopForm(shop)}>
                    Edit
                  </button>
                  <button className="danger-link" onClick={() => deleteShop(shop)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          {!shops.length && (
            <div className="admin-empty">Create your first shop to continue.</div>
          )}
        </section>
        {pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Shop pages">
            <button
              disabled={!pagination.hasPrevious}
              onClick={() => load(pagination.page - 1, search)}
            >
              ← Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={!pagination.hasNext}
              onClick={() => load(pagination.page + 1, search)}
            >
              Next →
            </button>
          </nav>
        )}
        </>
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
              <p className="shop-sales-owner">
                Sales: {salesPersonName(selectedShop) || "Unassigned"}
                {" · "}
                Manager: {salesManagerName(selectedShop) || "Unassigned"}
              </p>
            </div>
            <div className="admin-header-actions">
              <button
                className="admin-secondary"
                onClick={() => setShopForm(selectedShop)}
              >
                Edit shop
              </button>
              <button
                className="admin-secondary"
                onClick={() => setPaymentLogsShop(selectedShop)}
              >
                Payment logs
              </button>
              <button
                className="admin-secondary"
                onClick={() => openShopPreview(selectedShop._id)}
              >
                View shop portal
              </button>
              <button
                className="danger-button"
                onClick={() => deleteShop(selectedShop)}
              >
                Delete shop
              </button>
              {!shopAgents.length && (
                <button className="admin-primary" onClick={() => setAgentForm({})}>
                  + Create agent
                </button>
              )}
            </div>
          </div>

          <div className="agent-list">
            {shopAgents.map((agent) => (
              <article className="agent-row" key={agent._id}>
                <span className={`agent-state ${agent.active ? "on" : "off"}`} />
                <div>
                  <h3>{agent.name}</h3>
                  <p>{agent.assignedPhoneNumber || "No phone assigned"}</p>
                </div>
                <span className="agent-meta">
                  {agent.voice} · {agent.language}
                </span>
                <button onClick={() => setAgentForm(agent)}>Edit</button>
              </article>
            ))}
            {!shopAgents.length && (
              <div className="admin-empty">No agent is assigned to this shop.</div>
            )}
          </div>
        </section>
      )}
      </>
      )}

      {activeSection === "sales" && (
        <section className="sales-team">
          <header className="admin-header">
            <div>
              <span className="admin-kicker">Assignment team</span>
              <h1>Sales Team</h1>
              <p>{salesPeople.length} people available for shop assignment.</p>
            </div>
            <button className="admin-primary" onClick={() => setSalesPersonForm({})}>
              + Add sales person
            </button>
          </header>

          <div className="sales-list">
            {salesPeople.map((person) => {
              const assignedCount = person.assignedShopCount || 0;
              return (
                <article className="sales-row" key={person._id}>
                  <span className={`agent-state ${person.active ? "on" : "off"}`} />
                  <div>
                    <h3>{person.name}</h3>
                    <p>
                      {(person.salesRole || "rep") === "manager" ? "Manager" : "Rep"}
                      {" · "}
                      {person.email || "No email"} · {person.phone || "No phone"}
                    </p>
                  </div>
                  <span className="agent-meta">
                    {(person.salesRole || "rep") === "manager"
                      ? `${person.managedShopCount || 0} managed`
                      : `${assignedCount} assigned`}
                  </span>
                  <button onClick={() => openSalesPreview(person._id)}>Portal</button>
                  <button onClick={() => setSalesPersonForm(person)}>Edit</button>
                  <button className="danger-link" onClick={() => deleteSalesPerson(person)}>Delete</button>
                </article>
              );
            })}
            {!salesPeople.length && (
              <div className="admin-empty">Add sales people before assigning shops.</div>
            )}
          </div>
        </section>
      )}

      {activeSection === "templates" && (
        <section className="sales-team">
          <header className="admin-header">
            <div>
              <span className="admin-kicker">Global setup</span>
              <h1>Agent Templates</h1>
              <p>{agentTemplates.length} global templates for new shops.</p>
            </div>
            <button className="admin-primary" onClick={() => setAgentTemplateForm({})}>
              + Add template
            </button>
          </header>

          <div className="sales-list">
            {agentTemplates.map((template) => (
              <article className="template-row" key={template._id}>
                <span className={`agent-state ${template.active ? "on" : "off"}`} />
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.businessType} · {template.voice} · {template.language}</p>
                </div>
                <span className={`service-status ${template.active ? "active" : "inactive"}`}>
                  {template.active ? "Active" : "Inactive"}
                </span>
                <button onClick={() => setAgentTemplateForm(template)}>Edit</button>
                <button className="danger-link" onClick={() => deleteAgentTemplate(template)}>Delete</button>
              </article>
            ))}
            {!agentTemplates.length && (
              <div className="admin-empty">Create your first global agent template.</div>
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
            <button type="button" className="sheet-close" onClick={() => setShopForm(null)}>×</button>
            <span className="admin-kicker">{editingShop ? "Shop settings" : "New business"}</span>
            <h2>{editingShop ? "Edit shop" : "Create shop"}</h2>
            <label>Shop name<input name="name" defaultValue={shopForm.name} required /></label>
            {!editingShop && (
              <label>Business type / agent template
                <select name="agentTemplateId" required defaultValue="">
                  <option value="" disabled>
                    {activeAgentTemplates.length ? "Select template" : "No active templates"}
                  </option>
                  {activeAgentTemplates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.businessType} - {template.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>Assigned sales person
              <select
                name="assignedSalesPersonId"
                defaultValue={shopSalesPersonId(shopForm) || ""}
              >
                <option value="">Unassigned</option>
                {salesReps
                  .filter((person) => person.active || person._id === shopSalesPersonId(shopForm))
                  .map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.name}{person.active ? "" : " (inactive)"}
                    </option>
                  ))}
              </select>
            </label>
            <label>Sales manager
              <select
                name="salesManagerId"
                defaultValue={shopSalesManagerId(shopForm) || ""}
              >
                <option value="">Unassigned</option>
                {salesManagers
                  .filter((person) => person.active || person._id === shopSalesManagerId(shopForm))
                  .map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.name}{person.active ? "" : " (inactive)"}
                    </option>
                  ))}
              </select>
            </label>
            {editingShop ? (
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
              {editingShop ? "Save shop" : "Create shop and user"}
            </button>
          </form>
        </div>
      )}

      {agentTemplateForm && (
        <div className="admin-overlay" onMouseDown={() => setAgentTemplateForm(null)}>
          <form
            className="admin-sheet"
            key={agentTemplateForm._id || "new-template"}
            onSubmit={saveAgentTemplate}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setAgentTemplateForm(null)}>×</button>
            <span className="admin-kicker">Global template</span>
            <h2>{agentTemplateForm._id ? "Edit template" : "Add template"}</h2>
            <div className="form-pair">
              <label>Template name<input name="name" defaultValue={agentTemplateForm.name} required /></label>
              <label>Business type<input name="businessType" defaultValue={agentTemplateForm.businessType} placeholder="Auto cleaning" required /></label>
              <label>Voice<input name="voice" defaultValue={agentTemplateForm.voice || "marin"} required /></label>
              <label>Language<input name="language" defaultValue={agentTemplateForm.language || "en"} required /></label>
            </div>
            <label>Opening greeting<textarea name="greeting" rows="3" defaultValue={agentTemplateForm.greeting} required /></label>
            <label>Agent instructions<textarea name="instructions" rows="12" defaultValue={agentTemplateForm.instructions} required /></label>
            <label>Status
              <select name="active" defaultValue={String(agentTemplateForm.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button className="admin-primary">
              {agentTemplateForm._id ? "Save template" : "Add template"}
            </button>
            {agentTemplateForm._id && (
              <button
                type="button"
                className="danger-button"
                onClick={() => deleteAgentTemplate(agentTemplateForm)}
              >
                Delete template
              </button>
            )}
          </form>
        </div>
      )}

      {salesPersonForm && (
        <div className="admin-overlay" onMouseDown={() => setSalesPersonForm(null)}>
          <form
            className="admin-sheet compact"
            key={salesPersonForm._id || "new-sales-person"}
            onSubmit={saveSalesPerson}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setSalesPersonForm(null)}>×</button>
            <span className="admin-kicker">Sales Team</span>
            <h2>{salesPersonForm._id ? "Edit person" : "Add person"}</h2>
            <label>Name<input name="name" defaultValue={salesPersonForm.name} required /></label>
            <label>Email<input name="email" type="email" defaultValue={salesPersonForm.email} /></label>
            <label>Phone<input name="phone" defaultValue={salesPersonForm.phone} /></label>
            <label>Sales role
              <select name="salesRole" defaultValue={salesPersonForm.salesRole || "rep"}>
                <option value="rep">Sales rep</option>
                <option value="manager">Sales manager</option>
              </select>
            </label>
            <label>Manager for rep
              <select name="managerId" defaultValue={salesPersonForm.managerId || ""}>
                <option value="">No manager</option>
                {salesManagers
                  .filter((person) => person._id !== salesPersonForm._id)
                  .map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {salesPersonForm.userId ? "Reset login password" : "Temporary login password"}
              <input
                name="password"
                type="password"
                placeholder={salesPersonForm.userId ? "Leave blank to keep current password" : "Optional until portal access is needed"}
              />
            </label>
            <label>Status
              <select name="active" defaultValue={String(salesPersonForm.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button className="admin-primary">
              {salesPersonForm._id ? "Save person" : "Add sales person"}
            </button>
            {salesPersonForm._id && (
              <button
                type="button"
                className="danger-button"
                onClick={() => deleteSalesPerson(salesPersonForm)}
              >
                Delete person
              </button>
            )}
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
              <label>Phone number<input name="assignedPhoneNumber" defaultValue={agentForm.assignedPhoneNumber} placeholder="+14165551234" /></label>
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

      {paymentLogsShop && (
        <div className="admin-overlay" onMouseDown={() => setPaymentLogsShop(null)}>
          <aside
            className="admin-sheet compact billing-log-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setPaymentLogsShop(null)}>×</button>
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
    </main>
      </div>
    </div>
  );
}
