"use client";

import { useEffect, useState } from "react";
import countries from "i18n-iso-countries";
import englishCountries from "i18n-iso-countries/langs/en.json";
import { previewFetch } from "../previewSession";

countries.registerLocale(englishCountries);

const countryNames = countries.getNames("en", { select: "official" });
const countryOptions = Object.entries(countryNames).sort((first, second) =>
  first[1].localeCompare(second[1]),
);

function countryFlag(code) {
  return code
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt()),
    );
}

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function BusinessSettingsView() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    previewFetch("/api/settings")
      .then((response) => response.json())
      .then(setSettings);
  }, []);

  function updateHours(index, field, value) {
    setSettings((current) => ({
      ...current,
      weeklyHours: current.weeklyHours.map((hours, position) =>
        position === index ? { ...hours, [field]: value } : hours,
      ),
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await previewFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: values.shopName,
        countryCode: values.countryCode,
        country: countryNames[values.countryCode],
        address: values.address,
        publicPhone: values.publicPhone,
        website: values.website,
        timezone: values.timezone,
        minimumNoticeHours: Number(values.minimumNoticeHours),
        maximumAdvanceDays: Number(values.maximumAdvanceDays),
        weeklyHours: settings.weeklyHours,
        closedDates: values.closedDates
          .split(/\r?\n|,/)
          .map((date) => date.trim())
          .filter(Boolean),
      }),
    });
    if (response.ok) {
      setSettings(await response.json());
      setMessage("Business information and availability saved.");
    } else {
      setMessage("Could not save settings.");
    }
  }

  if (!settings) {
    return <div className="admin-empty">Loading business settings…</div>;
  }

  return (
    <section className="business-settings-module">
      <header className="settings-header">
        <div>
          <span className="admin-kicker">Agent source of truth</span>
          <h1>Business</h1>
          <p>This information is automatically supplied to your voice agents.</p>
        </div>
      </header>

      <form onSubmit={saveSettings}>
        <section className="settings-card">
          <div className="settings-section-title">
            <span>01</span>
            <div>
              <h2>Business information</h2>
              <p>Public details agents may share with callers.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>Shop name<input name="shopName" defaultValue={settings.shopName} required /></label>
            <label>Country
              <select
                name="countryCode"
                defaultValue={
                  settings.countryCode ||
                  countries.getAlpha2Code(settings.country || "", "en") ||
                  "CA"
                }
                required
              >
                {countryOptions.map(([code, name]) => (
                  <option value={code} key={code}>
                    {countryFlag(code)} {name}
                  </option>
                ))}
              </select>
            </label>
            <label>Address<input name="address" defaultValue={settings.address} /></label>
            <label>Public phone<input name="publicPhone" defaultValue={settings.publicPhone} /></label>
            <label>Website<input name="website" type="url" defaultValue={settings.website} /></label>
            <label>Timezone<input name="timezone" defaultValue={settings.timezone} required /></label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <span>02</span>
            <div>
              <h2>Weekly availability</h2>
              <p>Set the normal opening hours for each day.</p>
            </div>
          </div>
          <div className="weekly-hours">
            {settings.weeklyHours.map((hours, index) => (
              <div className={`hours-row ${hours.enabled ? "" : "closed"}`} key={hours.day}>
                <label className="day-toggle">
                  <input
                    type="checkbox"
                    checked={hours.enabled}
                    onChange={(event) => updateHours(index, "enabled", event.target.checked)}
                  />
                  <span>{dayLabels[hours.day]}</span>
                </label>
                {hours.enabled ? (
                  <>
                    <input
                      type="time"
                      value={hours.opensAt}
                      onChange={(event) => updateHours(index, "opensAt", event.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hours.closesAt}
                      onChange={(event) => updateHours(index, "closesAt", event.target.value)}
                    />
                  </>
                ) : (
                  <span className="closed-label">Closed</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <span>03</span>
            <div>
              <h2>Booking rules</h2>
              <p>Control notice periods and exceptional closures.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>Minimum notice (hours)
              <input name="minimumNoticeHours" type="number" min="0" defaultValue={settings.minimumNoticeHours} required />
            </label>
            <label>Maximum advance booking (days)
              <input name="maximumAdvanceDays" type="number" min="1" defaultValue={settings.maximumAdvanceDays} required />
            </label>
            <label className="wide-field">Closed dates
              <textarea
                name="closedDates"
                rows="5"
                defaultValue={settings.closedDates
                  ?.map((date) => new Date(date).toISOString().slice(0, 10))
                  .join("\n")}
                placeholder={"2026-12-25\n2026-12-26"}
              />
              <small>Enter one YYYY-MM-DD date per line.</small>
            </label>
          </div>
        </section>

        <div className="settings-save">
          {message && <span>{message}</span>}
          <button className="admin-primary">Save settings</button>
        </div>
      </form>
    </section>
  );
}
