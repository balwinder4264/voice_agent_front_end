"use client";

import { useEffect, useState } from "react";

const days = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

function defaultHours() {
  return days.map((day, index) => ({
    day,
    enabled: index < 5,
    startsAt: "09:00",
    endsAt: "17:00",
  }));
}

function prepareStaff(staff = {}) {
  return {
    ...staff,
    serviceIds: (staff.serviceIds || []).map((service) => service._id || service),
    weeklyHours: staff.weeklyHours?.length ? staff.weeklyHours : defaultHours(),
    timeOff: (staff.timeOff || []).map((entry) => ({
      ...entry,
      startAt: new Date(entry.startAt).toISOString().slice(0, 10),
      endAt: new Date(entry.endAt).toISOString().slice(0, 10),
    })),
  };
}

export default function StaffView() {
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const [staffResponse, servicesResponse] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/services"),
    ]);
    if (staffResponse.ok) setStaff(await staffResponse.json());
    if (servicesResponse.ok) setServices(await servicesResponse.json());
  }

  useEffect(() => {
    load();
  }, []);

  function updateHour(index, key, value) {
    setEditing((current) => ({
      ...current,
      weeklyHours: current.weeklyHours.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    }));
  }

  async function saveStaff(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const selectedServices = form.getAll("serviceIds");
    if (!selectedServices.length) {
      setError("Select at least one service.");
      return;
    }
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      active: form.get("active") === "true",
      serviceIds: selectedServices,
      weeklyHours: editing.weeklyHours,
      timeOff: editing.timeOff.map((entry) => ({
        reason: entry.reason,
        startAt: new Date(`${entry.startAt}T00:00:00`).toISOString(),
        endAt: new Date(`${entry.endAt}T23:59:59.999`).toISOString(),
      })),
    };
    const response = await fetch(
      `/api/staff${editing._id ? `/${editing._id}` : ""}`,
      {
        method: editing._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      setEditing(null);
      load();
    } else {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Could not save staff member.");
    }
  }

  async function deleteStaff() {
    if (!window.confirm(`Delete ${editing.name}?`)) return;
    const response = await fetch(`/api/staff/${editing._id}`, { method: "DELETE" });
    if (response.ok) {
      setEditing(null);
      load();
    } else {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Could not delete staff member.");
    }
  }

  return (
    <section className="staff-module">
      <header className="services-header">
        <div>
          <span className="admin-kicker">People &amp; capacity</span>
          <h1>Staff</h1>
          <p>Connect services to the people qualified and available to deliver them.</p>
        </div>
        <button className="admin-primary" onClick={() => setEditing(prepareStaff())}>
          + Add staff
        </button>
      </header>

      <div className="staff-roster">
        {staff.map((person, index) => (
          <article key={person._id} style={{ "--delay": `${index * 45}ms` }}>
            <span className="staff-monogram">
              {person.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}
            </span>
            <div className="staff-identity">
              <strong>{person.name}</strong>
              <span>{person.email || person.phone || "No contact details"}</span>
            </div>
            <div className="staff-services">
              {person.serviceIds.map((service) => (
                <span key={service._id}>{service.name}</span>
              ))}
            </div>
            <span className={`service-status ${person.active ? "active" : "inactive"}`}>
              {person.active ? "Active" : "Inactive"}
            </span>
            <button onClick={() => setEditing(prepareStaff(person))}>Edit</button>
          </article>
        ))}
        {!staff.length && (
          <div className="admin-empty">Add staff to unlock parallel scheduling.</div>
        )}
      </div>

      {editing && (
        <div className="admin-overlay" onMouseDown={() => setEditing(null)}>
          <form className="admin-sheet staff-sheet" onSubmit={saveStaff} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="sheet-close" onClick={() => setEditing(null)}>×</button>
            <span className="admin-kicker">Staff profile</span>
            <h2>{editing._id ? "Edit staff member" : "Add staff member"}</h2>
            <div className="form-pair">
              <label>Name<input name="name" defaultValue={editing.name} required /></label>
              <label>Status
                <select name="active" defaultValue={String(editing.active ?? true)}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
            <div className="form-pair">
              <label>Email<input name="email" type="email" defaultValue={editing.email} /></label>
              <label>Phone<input name="phone" defaultValue={editing.phone} /></label>
            </div>

            <fieldset className="staff-fieldset">
              <legend>Qualified services</legend>
              <div className="service-checks">
                {services.map((service) => (
                  <label key={service._id}>
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={service._id}
                      defaultChecked={editing.serviceIds.includes(service._id)}
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="staff-fieldset">
              <legend>Weekly availability</legend>
              <div className="staff-hours">
                {editing.weeklyHours.map((entry, index) => (
                  <div className={!entry.enabled ? "disabled" : ""} key={entry.day}>
                    <label>
                      <input type="checkbox" checked={entry.enabled} onChange={(event) => updateHour(index, "enabled", event.target.checked)} />
                      <span>{entry.day}</span>
                    </label>
                    {entry.enabled ? (
                      <>
                        <input type="time" value={entry.startsAt} onChange={(event) => updateHour(index, "startsAt", event.target.value)} />
                        <span>to</span>
                        <input type="time" value={entry.endsAt} onChange={(event) => updateHour(index, "endsAt", event.target.value)} />
                      </>
                    ) : <small>Unavailable</small>}
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="staff-fieldset">
              <legend>Time off</legend>
              <div className="time-off-list">
                {editing.timeOff.map((entry, index) => (
                  <div key={entry._id || index}>
                    <input type="date" value={entry.startAt} onChange={(event) => setEditing((current) => ({ ...current, timeOff: current.timeOff.map((item, itemIndex) => itemIndex === index ? { ...item, startAt: event.target.value } : item) }))} required />
                    <input type="date" value={entry.endAt} onChange={(event) => setEditing((current) => ({ ...current, timeOff: current.timeOff.map((item, itemIndex) => itemIndex === index ? { ...item, endAt: event.target.value } : item) }))} required />
                    <input placeholder="Reason" value={entry.reason || ""} onChange={(event) => setEditing((current) => ({ ...current, timeOff: current.timeOff.map((item, itemIndex) => itemIndex === index ? { ...item, reason: event.target.value } : item) }))} />
                    <button type="button" onClick={() => setEditing((current) => ({ ...current, timeOff: current.timeOff.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-time-off" onClick={() => setEditing((current) => ({ ...current, timeOff: [...current.timeOff, { startAt: "", endAt: "", reason: "" }] }))}>
                + Add time off
              </button>
            </fieldset>

            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="service-form-actions">
              {editing._id && <button type="button" className="danger-button" onClick={deleteStaff}>Delete staff</button>}
              <button className="admin-primary">{editing._id ? "Save changes" : "Add staff"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
