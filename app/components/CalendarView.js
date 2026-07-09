"use client";

import { useEffect, useMemo, useState } from "react";

function startOfCalendar(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(first, second) {
  return first.toDateString() === second.toDateString();
}

function timeLabel(value) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CalendarView({ agents }) {
  const [month, setMonth] = useState(() => new Date());
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const calendarStart = useMemo(() => startOfCalendar(month), [month]);
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index)),
    [calendarStart],
  );

  async function loadAppointments() {
    setLoading(true);
    const end = addDays(calendarStart, 42);
    const response = await fetch(
      `/api/appointments?start=${encodeURIComponent(calendarStart.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
    );
    if (response.ok) setAppointments(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, [calendarStart]);

  useEffect(() => {
    fetch("/api/services")
      .then((response) => (response.ok ? response.json() : []))
      .then((result) => setServices(result.filter((service) => service.active)));
  }, []);

  async function createAppointment(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const service = services.find((item) => item._id === data.serviceId);
    if (!service) return;
    const startAt = new Date(data.startAt);
    const endAt = new Date(
      startAt.getTime() + Number(service.durationMinutes) * 60000,
    );
    if (!data.agentId) delete data.agentId;

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        title: service.name,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    });
    if (response.ok) {
      setShowForm(false);
      loadAppointments();
    }
  }

  async function updateStatus(id, status) {
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) loadAppointments();
  }

  return (
    <section className="calendar-module">
      <header className="calendar-header">
        <div>
          <span className="admin-kicker">Schedule</span>
          <h1>Calendar</h1>
        </div>
        <div className="calendar-actions">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <strong>
            {new Intl.DateTimeFormat("en-CA", {
              month: "long",
              year: "numeric",
            }).format(month)}
          </strong>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            →
          </button>
          <button className="calendar-create" onClick={() => setShowForm(true)}>
            + Appointment
          </button>
        </div>
      </header>

      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={`calendar-grid ${loading ? "loading" : ""}`}>
        {days.map((day) => {
          const dayAppointments = appointments.filter((appointment) =>
            sameDay(new Date(appointment.startAt), day),
          );
          return (
            <article
              className={`calendar-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${sameDay(day, new Date()) ? "today" : ""}`}
              key={day.toISOString()}
            >
              <span className="day-number">{day.getDate()}</span>
              <div className="day-appointments">
                {dayAppointments.map((appointment) => (
                  <div className={`calendar-event ${appointment.status}`} key={appointment._id}>
                    <strong>{timeLabel(appointment.startAt)} · {appointment.title}</strong>
                    <span>{appointment.customerName}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="appointment-list">
        <div className="panel-heading">
          <span>Appointments this view</span>
          <span>{appointments.length} total</span>
        </div>
        {appointments.map((appointment) => (
          <article key={appointment._id}>
            <div>
              <strong>{appointment.title}</strong>
              <span>{appointment.customerName} · {appointment.customerPhone}</span>
            </div>
            <time>{new Date(appointment.startAt).toLocaleString("en-CA")}</time>
            <select
              value={appointment.status}
              onChange={(event) => updateStatus(appointment._id, event.target.value)}
              aria-label={`Status for ${appointment.title}`}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
          </article>
        ))}
      </div>

      {showForm && (
        <div className="admin-overlay" onMouseDown={() => setShowForm(false)}>
          <form
            className="admin-sheet compact"
            onSubmit={createAppointment}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="sheet-close" onClick={() => setShowForm(false)}>×</button>
            <span className="admin-kicker">New booking</span>
            <h2>Create appointment</h2>
            <label>Service
              <select name="serviceId" required defaultValue="">
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option value={service._id} key={service._id}>
                    {service.name} · {service.durationMinutes} min
                  </option>
                ))}
              </select>
            </label>
            <label>Customer name<input name="customerName" required /></label>
            <label>Customer phone<input name="customerPhone" required /></label>
            <label>Date and time<input name="startAt" type="datetime-local" required /></label>
            <label>Agent
              <select name="agentId" defaultValue="">
                <option value="">No agent</option>
                {agents.map((agent) => (
                  <option value={agent._id} key={agent._id}>{agent.name}</option>
                ))}
              </select>
            </label>
            <label>Status
              <select name="status" defaultValue="confirmed">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </label>
            <label>Notes<textarea name="notes" rows="4" /></label>
            <button className="admin-primary">Create appointment</button>
          </form>
        </div>
      )}
    </section>
  );
}
