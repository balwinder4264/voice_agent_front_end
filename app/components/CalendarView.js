"use client";

import { useEffect, useMemo, useState } from "react";
import { previewFetch } from "../previewSession";

function startOfCalendar(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const start = startOfDay(date);
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

function dateTimeInputValue(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function appointmentStaffId(appointment) {
  if (!appointment.staffId) return "";
  return appointment.staffId._id || appointment.staffId;
}

export default function CalendarView({ agents }) {
  const [month, setMonth] = useState(() => new Date());
  const [bookingView, setBookingView] = useState("month");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [formServiceId, setFormServiceId] = useState("");

  const calendarStart = useMemo(() => {
    if (bookingView === "today") return startOfDay(month);
    if (bookingView === "week") return startOfWeek(month);
    return startOfCalendar(month);
  }, [bookingView, month]);
  const visibleDayCount = bookingView === "month" ? 42 : bookingView === "week" ? 7 : 1;
  const days = useMemo(
    () => Array.from({ length: visibleDayCount }, (_, index) => addDays(calendarStart, index)),
    [calendarStart, visibleDayCount],
  );
  const visibleAppointments = useMemo(() => {
    if (!selectedStaffId) return appointments;
    if (selectedStaffId === "unassigned") {
      return appointments.filter((appointment) => !appointmentStaffId(appointment));
    }
    return appointments.filter(
      (appointment) => appointmentStaffId(appointment) === selectedStaffId,
    );
  }, [appointments, selectedStaffId]);
  const periodTitle = useMemo(() => {
    if (bookingView === "today") {
      return new Intl.DateTimeFormat("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(calendarStart);
    }
    if (bookingView === "week") {
      const end = addDays(calendarStart, 6);
      return `${new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
      }).format(calendarStart)} – ${new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(end)}`;
    }
    return new Intl.DateTimeFormat("en-CA", {
      month: "long",
      year: "numeric",
    }).format(month);
  }, [bookingView, calendarStart, month]);

  function movePeriod(direction) {
    if (bookingView === "today") {
      setMonth(addDays(month, direction));
    } else if (bookingView === "week") {
      setMonth(addDays(month, direction * 7));
    } else {
      setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
    }
  }

  async function loadAppointments() {
    setLoading(true);
    const end = addDays(calendarStart, visibleDayCount);
    const response = await previewFetch(
      `/api/appointments?start=${encodeURIComponent(calendarStart.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
    );
    if (response.ok) setAppointments(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, [calendarStart, visibleDayCount]);

  useEffect(() => {
    Promise.all([
      previewFetch("/api/services").then((response) => (response.ok ? response.json() : [])),
      previewFetch("/api/staff").then((response) => (response.ok ? response.json() : [])),
    ]).then(([serviceResult, staffResult]) => {
      setServices(serviceResult.filter((service) => service.active));
      setStaff(staffResult.filter((person) => person.active));
    });
  }, []);

  async function saveAppointment(event) {
    event.preventDefault();
    setFormError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const service = services.find((item) => item._id === data.serviceId);
    if (!service) return;
    const startAt = new Date(data.startAt);
    const endAt = new Date(
      startAt.getTime() + Number(service.durationMinutes) * 60000,
    );
    if (!data.agentId) data.agentId = null;

    const response = await previewFetch(
      `/api/appointments${editingAppointment ? `/${editingAppointment._id}` : ""}`,
      {
      method: editingAppointment ? "PATCH" : "POST",
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
      setEditingAppointment(null);
      loadAppointments();
    } else {
      const result = await response.json().catch(() => ({}));
      setFormError(
        result.error ||
          `Could not ${editingAppointment ? "update" : "create"} appointment.`,
      );
    }
  }

  async function updateStatus(id, status) {
    const response = await previewFetch(`/api/appointments/${id}`, {
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
          <label className="calendar-filter">
            <span>View</span>
            <select
              value={bookingView}
              onChange={(event) => setBookingView(event.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <label className="calendar-filter">
            <span>Staff</span>
            <select
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
            >
              <option value="">All staff</option>
              {staff.map((person) => (
                <option value={person._id} key={person._id}>{person.name}</option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <button
            onClick={() => movePeriod(-1)}
            aria-label="Previous period"
          >
            ←
          </button>
          <strong>{periodTitle}</strong>
          <button
            onClick={() => movePeriod(1)}
            aria-label="Next period"
          >
            →
          </button>
          <button
            className="calendar-create"
            onClick={() => {
              setFormError("");
              setFormServiceId("");
              setShowForm(true);
            }}
          >
            + Appointment
          </button>
        </div>
      </header>

      <div className={`calendar-weekdays ${bookingView}`}>
        {(bookingView === "today"
          ? [new Intl.DateTimeFormat("en-CA", { weekday: "long" }).format(calendarStart)]
          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        ).map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={`calendar-grid ${bookingView} ${loading ? "loading" : ""}`}>
        {days.map((day) => {
          const dayAppointments = visibleAppointments.filter((appointment) =>
            sameDay(new Date(appointment.startAt), day),
          );
          return (
            <article
              className={`calendar-day ${bookingView === "month" && day.getMonth() !== month.getMonth() ? "outside" : ""} ${sameDay(day, new Date()) ? "today" : ""}`}
              key={day.toISOString()}
            >
              <span className="day-number">{day.getDate()}</span>
              <div className="day-appointments">
                {dayAppointments.map((appointment) => (
                  <button
                    className={`calendar-event ${appointment.status}`}
                    key={appointment._id}
                    onClick={() => {
                      setFormError("");
                      setFormServiceId(appointment.serviceId?._id || appointment.serviceId || "");
                      setEditingAppointment(appointment);
                    }}
                  >
                    <strong>{timeLabel(appointment.startAt)} · {appointment.title}</strong>
                    <span>{appointment.customerName}</span>
                    {appointment.staffId?.name && <span>{appointment.staffId.name}</span>}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="appointment-list">
        <div className="panel-heading">
          <span>
            {bookingView === "today"
              ? "Appointments today"
              : bookingView === "week"
                ? "Appointments this week"
                : "Appointments this month"}
          </span>
          <span>{visibleAppointments.length} total</span>
        </div>
        {visibleAppointments.map((appointment) => (
          <article key={appointment._id}>
            <div>
              <strong>{appointment.title}</strong>
              <span>{appointment.customerName} · {appointment.customerPhone}</span>
              {appointment.additionalDetails && (
                <span>{appointment.additionalDetails}</span>
              )}
              {appointment.staffId?.name && <span>Staff: {appointment.staffId.name}</span>}
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
            <button
              className="appointment-edit"
              onClick={() => {
                setFormError("");
                setFormServiceId(appointment.serviceId?._id || appointment.serviceId || "");
                setEditingAppointment(appointment);
              }}
            >
              Edit
            </button>
          </article>
        ))}
      </div>

      {(showForm || editingAppointment) && (
        <div
          className="admin-overlay"
          onMouseDown={() => {
            setShowForm(false);
            setEditingAppointment(null);
          }}
        >
          <form
            className="admin-sheet compact"
            key={editingAppointment?._id || "new"}
            onSubmit={saveAppointment}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="sheet-close"
              onClick={() => {
                setShowForm(false);
                setEditingAppointment(null);
              }}
            >
              ×
            </button>
            <span className="admin-kicker">
              {editingAppointment ? "Booking details" : "New booking"}
            </span>
            <h2>{editingAppointment ? "Edit appointment" : "Create appointment"}</h2>
            <label>Service
              <select
                name="serviceId"
                required
                onChange={(event) => setFormServiceId(event.target.value)}
                defaultValue={
                  typeof editingAppointment?.serviceId === "object"
                    ? editingAppointment.serviceId?._id
                    : editingAppointment?.serviceId || ""
                }
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option value={service._id} key={service._id}>
                    {service.name} · {service.durationMinutes} min
                  </option>
                ))}
              </select>
            </label>
            <label>Customer name<input name="customerName" defaultValue={editingAppointment?.customerName} required /></label>
            <label>Customer phone<input name="customerPhone" defaultValue={editingAppointment?.customerPhone} required /></label>
            <label>Date and time
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={
                  editingAppointment
                    ? dateTimeInputValue(editingAppointment.startAt)
                    : ""
                }
                required
              />
            </label>
            <label>Agent
              <select
                name="agentId"
                defaultValue={
                  typeof editingAppointment?.agentId === "object"
                    ? editingAppointment.agentId?._id
                    : editingAppointment?.agentId || ""
                }
              >
                <option value="">No agent</option>
                {agents.map((agent) => (
                  <option value={agent._id} key={agent._id}>{agent.name}</option>
                ))}
              </select>
            </label>
            <label>Staff member
              <select
                name="staffId"
                defaultValue={
                  typeof editingAppointment?.staffId === "object"
                    ? editingAppointment.staffId?._id
                    : editingAppointment?.staffId || ""
                }
              >
                <option value="">Automatically assign qualified staff</option>
                {staff
                  .filter(
                    (person) =>
                      !formServiceId ||
                      person.serviceIds.some(
                        (service) => (service._id || service) === formServiceId,
                      ),
                  )
                  .map((person) => (
                  <option value={person._id} key={person._id}>{person.name}</option>
                  ))}
              </select>
            </label>
            <label>Status
              <select name="status" defaultValue={editingAppointment?.status || "confirmed"}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
            </label>
            <label>Additional details<textarea name="additionalDetails" rows="4" defaultValue={editingAppointment?.additionalDetails} /></label>
            <label>Notes<textarea name="notes" rows="4" defaultValue={editingAppointment?.notes} /></label>
            {formError && (
              <p className="login-error" role="alert">{formError}</p>
            )}
            <button className="admin-primary">
              {editingAppointment ? "Save changes" : "Create appointment"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
