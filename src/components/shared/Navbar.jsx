import { useEffect, useState } from "react";
import { Bell, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getHomePathForRole } from "@/context/auth-context";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { NAV_BY_ROLE, NOTIFICATIONS_PATH_BY_ROLE, ROLE_LABELS } from "@/lib/navigation";

/*
 * FE 50 Authenticated Navbar (matches the supplied mockups).
 *
 * Left   : logo + "UniVent / Event Management System"
 * Centre : role links from lib/navigation.js (active link = light-blue pill)
 * Right  : Student | Organizer | Admin switch, bell with unread badge, avatar, name,
 *          "Role · ID", logout
 *
 * - Unread count comes from the shared useUnreadCount hook (no fetching in this file).
 * - The role switch always shows all three roles, as in the mockup. Roles the account does
 *   not have (user.roles, or just user.role) are shown but disabled, so nobody is sent to a page
 *   that would reject them.
 * - On mobile the links collapse behind a menu button; the bell and logout stay visible.
 * Props: unreadOverride (optional) forces a count, used for demos/tests.
 */
const TRAY_ROLES = [
  { role: "STUDENT", label: "Student" },
  { role: "ORGANIZER", label: "Organizer" },
  { role: "ADMIN", label: "Admin" },
];

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";

// Students are identified by student number. The login response has no separate field yet,
// so fall back to the part of the CPUT email before "@" (e.g. 221234567@mycput.ac.za).
const identifier = (user) => {
  if (user?.studentNumber) return user.studentNumber;
  if (user?.role === "STUDENT" && user?.email) return user.email.split("@")[0];
  return null;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0072bc]";

export default function Navbar({ unreadOverride }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const fetched = useUnreadCount({
    enabled: unreadOverride === undefined && user?.role === "STUDENT",
  });
  const unread = unreadOverride ?? fetched;

  const links = NAV_BY_ROLE[user?.role] ?? [];
  const notificationsPath = NOTIFICATIONS_PATH_BY_ROLE[user?.role];
  const ownedRoles = Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles : [user?.role];
  const id = identifier(user);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-4 py-2.5 font-medium ${focusRing} ${
      isActive ? "bg-[#e6f1f8] text-[#0072bc]" : "text-slate-600 hover:bg-slate-100"
    }`;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 sm:px-8">
        {/* Logo */}
        <Link to={getHomePathForRole(user?.role)} className={`flex items-center gap-3 rounded-lg ${focusRing}`}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold text-slate-950">UniVent</span>
            <span className="hidden text-sm text-slate-500 sm:block">Event Management System</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="ml-4 hidden flex-1 gap-1 lg:flex">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          {/* Role switch */}
          <div role="group" aria-label="Switch role" className="hidden rounded-lg bg-[#eaf2f8] p-1 md:flex">
            {TRAY_ROLES.map(({ role, label }) => {
              const current = role === user?.role;
              const allowed = ownedRoles.includes(role);
              const base = "rounded-md px-4 py-1.5 text-sm font-medium";
              if (current) {
                return (
                  <span key={role} aria-current="true" className={`${base} bg-white text-[#0072bc] shadow-sm`}>
                    {label}
                  </span>
                );
              }
              if (!allowed) {
                return (
                  <span key={role} aria-disabled="true" title="Not available for your account" className={`${base} cursor-not-allowed text-slate-400`}>
                    {label}
                  </span>
                );
              }
              return (
                <Link key={role} to={getHomePathForRole(role)} className={`${base} text-slate-500 hover:text-slate-800 ${focusRing}`}>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Bell */}
          {notificationsPath && (
            <Link
              to={notificationsPath}
              aria-label={`Notifications, ${unread} unread`}
              className={`relative rounded-lg p-2 text-[#0072bc] hover:bg-slate-100 ${focusRing}`}
            >
              <Bell size={22} aria-hidden="true" />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#0072bc] px-1 text-xs font-semibold text-white"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}

          {/* User + logout */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-sm font-semibold text-white" aria-hidden="true">
              {initials(user?.name)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="font-semibold text-slate-950">{user?.name}</p>
              <p className="text-sm text-slate-500">
                {ROLE_LABELS[user?.role] ?? user?.role}
                {id ? ` · ${id}` : ""}
              </p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="Log out" className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 ${focusRing}`}>
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden ${focusRing}`}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-slate-200 px-5 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {links.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} onClick={() => setMenuOpen(false)} className={(state) => `block ${linkClass(state)}`}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}