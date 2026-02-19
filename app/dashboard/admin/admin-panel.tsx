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
    <div className="glass-panel border-white/5 p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{value.toLocaleString()}</p>
        </div>
        <div className={cn("rounded-xl p-2.5 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500", color)}>
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
    { id: "overview" as const, label: "PLATFORM OVERVIEW", icon: LayoutDashboard },
    { id: "resources" as const, label: `PENDING APPROVALS (${pending.length})`, icon: BookOpen },
    { id: "users" as const, label: "USER DIRECTORY", icon: Users },
  ];

  const approvalRate =
    stats.totalResources > 0
      ? `${Math.round(((stats.totalResources - stats.pendingApprovals) / stats.totalResources) * 100)}%`
      : "N/A";
  const resourcesPerUser =
    stats.totalUsers > 0 ? (stats.totalResources / stats.totalUsers).toFixed(2) : "0.00";
  const pendingRatio =
    stats.totalResources > 0 ? `${Math.round((stats.pendingApprovals / stats.totalResources) * 100)}%` : "0%";

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 shadow-[0_0_20px_rgba(10,143,106,0.1)]">
          <Shield className="h-6 w-6 text-[#0A8F6A]" />
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white mb-0.5">Admin Dashboard</h1>
          <p className="text-sm text-neutral-500 font-light">Manage platform users, resources, and system data.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-white/5 bg-black/20 p-1.5 w-fit backdrop-blur-sm shadow-2xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all",
              tab === id
                ? "bg-[#0A8F6A] text-white shadow-lg shadow-emerald-500/20"
                : "text-neutral-500 hover:text-white hover:bg-white/5",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-500/10 text-blue-400 border border-blue-500/20" />
            <StatCard label="Live Resources" value={stats.totalResources} icon={BookOpen} color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
            <StatCard label="Active Lectures" value={stats.totalLectures} icon={Video} color="bg-purple-500/10 text-purple-400 border border-purple-500/20" />
            <StatCard label="Opportunities" value={stats.totalOpportunities} icon={Trophy} color="bg-orange-500/10 text-orange-400 border border-orange-500/20" />
            <StatCard label="Pending Queue" value={stats.pendingApprovals} icon={Shield} color="bg-red-500/10 text-red-400 border border-red-500/20" />
          </div>

          {stats.pendingApprovals > 0 && (
            <div className="rounded-2xl border border-[#0A8F6A]/30 bg-[#0A8F6A]/5 p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 h-32 w-32 bg-[#0A8F6A]/10 rounded-full blur-3xl group-hover:bg-[#0A8F6A]/20 transition-all duration-700"></div>
              <p className="text-lg font-medium text-white mb-1">
                {stats.pendingApprovals} RESOURCE{stats.pendingApprovals !== 1 ? "S" : ""} AWAITING APPROVAL
              </p>
              <p className="text-sm text-neutral-500 font-light">
                New uploads require verification before being published to the marketplace.
              </p>
              <button
                onClick={() => setTab("resources")}
                className="mt-4 rounded-xl bg-[#0A8F6A] px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
              >
                Review Pending
              </button>
            </div>
          )}

          <div className="glass-panel border-white/5 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-6">Platform Analytics</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { label: "Approval Rate", value: approvalRate },
                { label: "Resources per User", value: resourcesPerUser },
                { label: "Pending Ratio", value: pendingRatio },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 text-center shadow-xl">
                  <p className="text-3xl font-bold text-white tracking-tighter mb-1">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending resources tab */}
      {tab === "resources" && (
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-white/5 py-24 text-center bg-white/[0.01]">
              <CheckCircle2 className="mx-auto h-16 w-16 text-[#0A8F6A]/20" />
              <p className="mt-6 text-lg font-medium text-white">ALL CLEAR</p>
              <p className="mt-2 text-sm text-neutral-500 font-light">No resources currently awaiting approval.</p>
            </div>
          ) : (
            pending.map((resource) => (
              <div key={resource.id} className="glass-panel border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-[#0A8F6A]/30 transition-all duration-500">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/5 shadow-xl group-hover:bg-[#0A8F6A]/10 group-hover:border-[#0A8F6A]/20 transition-all duration-500">
                      <BookOpen className="h-6 w-6 text-neutral-500 group-hover:text-[#0A8F6A]" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white mb-1 group-hover:text-[#0A8F6A] transition-colors">{resource.title}</p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A8F6A] bg-[#0A8F6A]/10 px-2 py-0.5 rounded-md border border-[#0A8F6A]/20">{resource.type}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{resource.course_code}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">BY {resource.uploader_name}</span>
                      </div>
                      {resource.description && (
                        <p className="text-xs text-neutral-500 font-light mb-4 line-clamp-2 max-w-xl italic">&ldquo;{resource.description}&rdquo;</p>
                      )}
                      <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">SUBMITTED {timeAgo(resource.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col lg:flex-row shrink-0 gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <button
                      onClick={() => void handleApprove(resource.id)}
                      disabled={processingId === resource.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#0A8F6A] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 disabled:opacity-60 transition-all"
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
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-60 transition-all"
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
        <div className="glass-panel border-white/5 rounded-3xl shadow-2xl overflow-hidden">
          <div className="border-b border-white/5 px-8 py-6 bg-white/[0.02]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">{users.length} USERS REGISTERED</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                <tr>
                  {["USER NAME", "EMAIL ADDRESS", "ACCOUNT ROLE", "PLAN TYPE", "INSTITUTION", "POINTS", "JOINED"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5 font-medium text-white">{u.name || "UNIDENTIFIED"}</td>
                    <td className="px-6 py-5 text-neutral-500 font-light">{u.email}</td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-[8px] font-bold uppercase tracking-tighter border",
                        u.role === "admin" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          u.role === "lecturer" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            "bg-[#0A8F6A]/10 text-[#0A8F6A] border-[#0A8F6A]/20 shadow-[0_0_10px_rgba(10,143,106,0.1)]",
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">{u.plan}</td>
                    <td className="px-6 py-5 text-neutral-500 font-light truncate max-w-36">{u.university || "—"}</td>
                    <td className="px-6 py-5 font-bold text-[#0A8F6A]">{u.points}</td>
                    <td className="px-6 py-5 text-neutral-600 font-light">{timeAgo(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-24 text-center text-sm text-neutral-600 font-light">NO USERS FOUND.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
