"use client";

import { useEffect, useState } from "react";
import { previewFetch } from "../previewSession";

function priceLabel(priceCents) {
  if (priceCents === undefined || priceCents === null) return "Price not set";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(priceCents / 100);
}

export default function ServicesView() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function loadServices() {
    const response = await previewFetch("/api/services");
    if (response.ok) setServices(await response.json());
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function saveService(event) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...values,
      durationMinutes: Number(values.durationMinutes),
      bufferMinutes: Number(values.bufferMinutes),
      priceCents: values.price ? Math.round(Number(values.price) * 100) : undefined,
      active: values.active === "true",
    };
    delete body.price;

    const response = await previewFetch(
      `/api/services${editing?._id ? `/${editing._id}` : ""}`,
      {
        method: editing?._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      setEditing(null);
      loadServices();
    } else {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Could not save service.");
    }
  }

  async function deleteService() {
    if (
      !window.confirm(
        `Delete "${editing.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setError("");
    const response = await previewFetch(`/api/services/${editing._id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setEditing(null);
      loadServices();
    } else {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Could not delete service.");
    }
  }

  return (
    <section className="services-module">
      <header className="services-header">
        <div>
          <span className="admin-kicker">Bookable catalogue</span>
          <h1>Services</h1>
          <p>Define what customers can book and how much time it requires.</p>
        </div>
        <button className="admin-primary" onClick={() => setEditing({})}>
          + Create service
        </button>
      </header>

      <div className="service-list-heading">
        <span>Service</span>
        <span>Timing</span>
        <span>Price</span>
        <span>Status</span>
        <span />
      </div>
      <div className="service-list">
        {services.map((service) => (
          <article key={service._id}>
            <div>
              <strong>{service.name}</strong>
              <p>{service.description || "No description"}</p>
            </div>
            <span>
              {service.durationMinutes} min
              {service.bufferMinutes ? ` + ${service.bufferMinutes} buffer` : ""}
            </span>
            <span>{priceLabel(service.priceCents)}</span>
            <span className={`service-status ${service.active ? "active" : "inactive"}`}>
              {service.active ? "Active" : "Inactive"}
            </span>
            <button onClick={() => setEditing(service)}>Edit</button>
          </article>
        ))}
        {!services.length && (
          <div className="admin-empty">Create your first bookable service.</div>
        )}
      </div>

      {editing && (
        <div className="admin-overlay" onMouseDown={() => setEditing(null)}>
          <form
            className="admin-sheet compact"
            key={editing._id || "new"}
            onSubmit={saveService}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setEditing(null)}>×</button>
            <span className="admin-kicker">Service setup</span>
            <h2>{editing._id ? "Edit service" : "Create service"}</h2>
            <label>Service name<input name="name" defaultValue={editing.name} required /></label>
            <label>Description<textarea name="description" rows="4" defaultValue={editing.description} /></label>
            <div className="form-pair">
              <label>Duration (minutes)
                <input name="durationMinutes" type="number" min="5" max="1440" defaultValue={editing.durationMinutes || 30} required />
              </label>
              <label>Buffer (minutes)
                <input name="bufferMinutes" type="number" min="0" max="240" defaultValue={editing.bufferMinutes || 0} required />
              </label>
            </div>
            <label>Price in CAD
              <input name="price" type="number" min="0" step="0.01" defaultValue={editing.priceCents != null ? editing.priceCents / 100 : ""} placeholder="Optional" />
            </label>
            <label>Status
              <select name="active" defaultValue={String(editing.active ?? true)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="service-form-actions">
              {editing._id && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={deleteService}
                >
                  Delete service
                </button>
              )}
              <button className="admin-primary">
                {editing._id ? "Save changes" : "Create service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
