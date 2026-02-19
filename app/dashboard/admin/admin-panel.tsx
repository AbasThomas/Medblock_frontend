"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  Shield,
  Trash2,
  Users,
  Video,
  Trophy,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { approveResource, rejectResource } from "@/lib/supabase/queries";
import { timeAgo, cn } from "@/lib/utils";

type AdminStats = {
  totalUsers: number;
  totalResources: number;
  totalLectures: number;
  totalOpportunities: number;
  pendingApprovals: number;
};

type PendingResource = {
  id: string;
  title: string;
  type: string;
  course_code: string;
  uploader_name: string;
  created_at: string;
  description: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  university: string;
  points: number;
  created_at: string;
};

interface AdminPanelProps {
  stats: AdminStats;
  pendingResources: PendingResource[];
  users: User[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({ stats, pendingResources: initialPending, users }: AdminPanelProps) {
  const [pending, setPending] = useState(initialPending);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "resources" | "users">("overview");
  const supabase = createClient();

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await approveResource(supabase, id);
      setPending((prev) => prev.filter((r) => r.id !== id));
      toast.success("Resource approved and published.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await rejectResource(supabase, id);
      setPending((prev) => prev.filter((r) => r.id !== id));
      toast.success("Resource rejected and removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setProcessingId(null);
    }
  };

  const TABS = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "resources" as const, label: `Pending (${pending.length})`, icon: BookOpen },
    { id: "users" as const, label: "Users", icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Admin Hub</h1>
          <p className="text-sm text-muted-foreground">Manage users, resources, and platform data.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-white p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-100 text-blue-700" />
            <StatCard label="Total Resources" value={stats.totalResources} icon={BookOpen} color="bg-emerald-100 text-emerald-700" />
            <StatCard label="Total Lectures" value={stats.totalLectures} icon={Video} color="bg-purple-100 text-purple-700" />
            <StatCard label="Opportunities" value={stats.totalOpportunities} icon={Trophy} color="bg-orange-100 text-orange-700" />
            <StatCard label="Pending Reviews" value={stats.pendingApprovals} icon={Shield} color="bg-red-100 text-red-700" />
          </div>

          {stats.pendingApprovals > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="font-semibold text-orange-800">
                {stats.pendingApprovals} resource{stats.pendingApprovals !== 1 ? "s" : ""} awaiting review
              </p>
              <p className="mt-1 text-sm text-orange-700">
                Switch to the Pending tab to review and approve/reject submissions.
              </p>
              <button
                onClick={() => setTab("resources")}
                className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Review Now
              </button>
            </div>
          )}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Platform Health</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Approval Rate", value: stats.totalResources > 0 ? `${Math.round(((stats.totalResources - stats.pendingApprovals) / stats.totalResources) * 100)}%` : "N/A" },
                { label: "Avg Points / User", value: "—" },
                { label: "Active Opportunities", value: stats.totalOpportunities },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending resources tab */}
      {tab === "resources" && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed py-16 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/60" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="mt-1 text-xs text-muted-foreground">No resources pending review.</p>
            </div>
          ) : (
            pending.map((resource) => (
              <div key={resource.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.type} · {resource.course_code} · by {resource.uploader_name}
                      </p>
                      {resource.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">Submitted {timeAgo(resource.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void handleApprove(resource.id)}
                      disabled={processingId === resource.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {processingId === resource.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => void handleReject(resource.id)}
                      disabled={processingId === resource.id}
                      className="flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {processingId === resource.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4">
            <p className="font-semibold">{users.length} registered users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {["Name", "Email", "Role", "Plan", "University", "Points", "Joined"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        u.role === "admin" ? "bg-red-100 text-red-700" :
                        u.role === "lecturer" ? "bg-blue-100 text-blue-700" :
                        "bg-muted text-muted-foreground",
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{u.plan}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-36">{u.university || "—"}</td>
                    <td className="px-4 py-3 font-medium text-primary">{u.points}</td>
                    <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No users yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
