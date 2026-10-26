import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Search, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import { approveOrganizer, disableUser, getAdminUsers } from "../../api/admin";
import StatusBadge from "../../components/shared/StatusBadge";

import { useAuth } from "../../hooks/useAuth";
const asList = (data) => Array.isArray(data) ? data : data?.content ?? data?.users ?? [];
const roleLabel = (role) => ({ STUDENT: "Student", ORGANIZER: "Organizer", ADMIN: "Administrator" }[role] ?? role ?? "—");

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try { setUsers(asList(await getAdminUsers()).map((user) => ({ ...user, status: user.accountStatus ?? user.status }))); }
    catch (requestError) { setError(requestError.response?.data?.message || "Users could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Fetching user records synchronizes this screen with the admin API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => (role === "ALL" || user.role === role) && (!term || [user.name, user.email, user.studentNumber, user.staffNumber].some((value) => String(value ?? "").toLowerCase().includes(term))));
  }, [users, query, role]);

  const runAction = async (user, action) => {
    if (action === disableUser && String(user.id) === String(currentUser?.userId)) { setError("You cannot disable your own administrator account."); return; }
    setBusyId(user.id); setError("");
    try { await action(user.id); await loadUsers(); }
    catch (requestError) { setError(requestError.response?.data?.message || "The account could not be updated."); }
    finally { setBusyId(null); }
  };

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7"><p className="text-sm text-slate-500">Administration · ICT Services</p><h1 className="mt-1 text-3xl font-bold tracking-tight">User management</h1><p className="mt-2 text-slate-600">Review accounts and manage access to UniVent.</p></header>
        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><CircleAlert size={18} />{error}<button onClick={loadUsers} className="ml-auto font-semibold underline">Retry</button></div>}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative block md:w-80"><span className="sr-only">Search users</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or number…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-600">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-900 outline-none focus:border-sky-600"><option value="ALL">All roles</option><option value="STUDENT">Students</option><option value="ORGANIZER">Organizers</option><option value="ADMIN">Administrators</option></select></label>
          </div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left text-sm"><thead><tr className="border-y border-slate-100 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3 font-semibold">User</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Faculty / organization</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
            {!loading && visibleUsers.map((user) => { const status = user.status ?? (user.enabled === false ? "DISABLED" : user.approved === false ? "PENDING" : "APPROVED"); const pendingOrganizer = user.role === "ORGANIZER" && ["PENDING", "PENDING_APPROVAL"].includes(status); const disabled = user.enabled === false || status === "DISABLED"; const currentAccount = String(user.id) === String(currentUser?.userId); return <tr key={user.id} className="hover:bg-slate-50"><td className="px-3 py-4"><div className="font-semibold text-slate-900">{user.name ?? "—"}</div><div className="mt-1 text-xs text-slate-500">{user.email ?? "—"}</div><div className="mt-1 text-xs text-slate-400">{user.studentNumber ?? user.staffNumber ?? ""}</div></td><td className="px-3 py-4">{roleLabel(user.role)}</td><td className="px-3 py-4">{user.faculty ?? user.organizationName ?? user.department ?? "—"}</td><td className="px-3 py-4"><StatusBadge status={status} className="text-xs" /></td><td className="px-3 py-4"><div className="flex gap-2">{pendingOrganizer && <button disabled={busyId === user.id} onClick={() => runAction(user, approveOrganizer)} className="inline-flex items-center gap-1 rounded-md bg-sky-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><ShieldCheck size={14} />Approve</button>}{!disabled && !currentAccount && <button disabled={busyId === user.id} onClick={() => runAction(user, disableUser)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><UserRoundX size={14} />Disable</button>}</div></td></tr>; })}
            {loading && <tr><td colSpan="5" className="px-3 py-16 text-center text-slate-500"><UserRound className="mx-auto mb-3" />Loading users…</td></tr>}
            {!loading && visibleUsers.length === 0 && <tr><td colSpan="5" className="px-3 py-16 text-center text-slate-500"><UserRound className="mx-auto mb-3" />No users match these filters.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </main>
  );
}
