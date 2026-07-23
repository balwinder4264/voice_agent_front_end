"use client";

import { LogOut, UserRound } from "lucide-react";

export function PreviewBanner({ onExit }) {
  return (
    <div className="preview-banner">
      <span>Admin preview</span>
      <button onClick={onExit}>Exit preview</button>
    </div>
  );
}

export function SidebarNav({ items }) {
  return (
    <nav className="portal-nav">
      {items.map(({ key, label, icon: Icon, count, active, onClick }) => (
        <button
          className={`portal-nav-item ${active ? "active" : ""}`}
          key={key || label}
          onClick={onClick}
          type="button"
        >
          {Icon && <Icon size={17} strokeWidth={2} />}
          <span>{label}</span>
          {count !== undefined && <small>{count}</small>}
        </button>
      ))}
    </nav>
  );
}

export function PortalShell({
  logoSrc,
  navItems,
  statusTitle,
  statusDetail,
  topbarLabel,
  topbarLeft,
  profileLabel,
  profileOpen,
  onProfileToggle,
  onLogout,
  children,
  mainClassName = "portal-main",
}) {
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <img className="brand-logo" src={logoSrc} alt="ReserveSync" />
        </div>
        <SidebarNav items={navItems} />
        <div className="sidebar-status">
          <span className="live-dot" />
          <span>
            <strong>{statusTitle}</strong>
            {statusDetail && <small>{statusDetail}</small>}
          </span>
        </div>
      </aside>

      <div className="portal-workspace">
        <div className="portal-topbar">
          {topbarLeft}
          {topbarLabel && <span className="portal-topbar-label">{topbarLabel}</span>}
          <div className="profile-menu">
            <button
              className="profile-trigger"
              onClick={onProfileToggle}
              aria-expanded={profileOpen}
              aria-label="Open account menu"
              type="button"
            >
              <UserRound size={18} strokeWidth={2.2} />
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <span>{profileLabel}</span>
                <button onClick={onLogout} type="button">
                  <LogOut size={14} strokeWidth={2} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ kicker, title, description, actions, className = "" }) {
  return (
    <header className={`portal-page-header ${className}`}>
      <div>
        {kicker && <span className="admin-kicker">{kicker}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-header-actions">{actions}</div>}
    </header>
  );
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span className="metric-icon">{Icon && <Icon size={18} strokeWidth={2.1} />}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function StatusBadge({ active, children }) {
  return (
    <span className={`service-status ${active ? "active" : "inactive"}`}>
      {children || (active ? "Active" : "Inactive")}
    </span>
  );
}

export function ModalSheet({ children, compact = false, className = "", onClose, as: Element = "form", ...props }) {
  return (
    <div className="admin-overlay" onMouseDown={onClose}>
      <Element
        className={`admin-sheet ${compact ? "compact" : ""} ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
        {...props}
      >
        <button type="button" className="sheet-close" onClick={onClose}>x</button>
        {children}
      </Element>
    </div>
  );
}
