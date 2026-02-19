"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getResources, createResource, incrementDownload } from "@/lib/supabase/queries";
import { formatFileSize, timeAgo, getResourceTypeColor, cn } from "@/lib/utils";

type Resource = {
  id: string;
  title: string;
  description: string;
  type: string;
  course_code: string;
  university: string;
  department: string;
  uploader_name: string;
  file_url: string;
  file_size: number;
  downloads: number;
  rating: number;
  review_count: number;
  tags: string[];
  is_premium: boolean;
  is_verified: boolean;
  is_approved: boolean;
  year: number;
  created_at: string;
};

const RESOURCE_TYPES = ["notes", "past-questions", "study-guide", "textbook", "assignment"];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "notes",
    course_code: "",
    university: "University of Lagos",
    department: "",
    year: new Date().getFullYear(),
    tags: "",
    is_premium: false,
  });

  const supabase = createClient();

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getResources(supabase, { isApproved: true, search: search || undefined, type: typeFilter || undefined }, 30);
      setResources(data as Resource[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, [supabase, search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void loadResources(), 300);
    return () => clearTimeout(timer);
  }, [loadResources]);

  useEffect(() => {
    const channel = supabase
      .channel("resources-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () => {
        void loadResources();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, loadResources]);

  const handleDownload = async (resource: Resource) => {
    try {
      await incrementDownload(supabase, resource.id);
      window.open(resource.file_url, "_blank");
      setResources((prev) =>
        prev.map((r) => r.id === resource.id ? { ...r, downloads: r.downloads + 1 } : r),
      );
      toast.success("Download started.");
    } catch {
      window.open(resource.file_url, "_blank");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.course_code || !uploadForm.department) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

      await createResource(supabase, {
        ...uploadForm,
        uploaded_by: user.id,
        uploader_name: profile?.name ?? user.email?.split("@")[0] ?? "Anonymous",
        tags: uploadForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        file_url: "",
        file_size: 0,
      });

      toast.success("Resource submitted for review!");
      setShowUpload(false);
      setUploadForm({
        title: "", description: "", type: "notes", course_code: "",
        university: "University of Lagos", department: "", year: new Date().getFullYear(),
        tags: "", is_premium: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Resource Marketplace</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Notes, past questions, study guides and textbooks from your peers.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Upload Resource
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or course…"
            className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-muted-foreground"
          >
            <option value="">All types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(""); setTypeFilter(""); }}
            className="rounded-xl border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No resources found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || typeFilter ? "Try different filters." : "Be the first to upload!"}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Upload className="h-4 w-4" /> Upload first resource
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.id} className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", getResourceTypeColor(resource.type))}>
                    {resource.type}
                  </span>
                  {resource.is_premium && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                      Premium
                    </span>
                  )}
                  {resource.is_verified && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex-1">
                <p className="text-sm font-semibold leading-snug">{resource.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resource.course_code} · {resource.department} · {resource.year}
                </p>
                {resource.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{resource.description}</p>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" /> {resource.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {resource.rating} ({resource.review_count})
                </span>
                <span className="ml-auto">{timeAgo(resource.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">By {resource.uploader_name}</p>
              {resource.file_size > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(resource.file_size)}</p>
              )}

              {resource.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {resource.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => void handleDownload(resource)}
                disabled={resource.is_premium}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-opacity",
                  resource.is_premium
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-white hover:opacity-90",
                )}
              >
                <Download className="h-3.5 w-3.5" />
                {resource.is_premium ? "Premium — Upgrade to download" : "Download"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Resource</h2>
              <button onClick={() => setShowUpload(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your upload will be reviewed by an admin before going live.
            </p>

            <form onSubmit={(e) => void handleUpload(e)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title *</label>
                <input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="CSC 201 Comprehensive Notes"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Type *</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  >
                    {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Course Code *</label>
                  <input
                    value={uploadForm.course_code}
                    onChange={(e) => setUploadForm((f) => ({ ...f, course_code: e.target.value.toUpperCase() }))}
                    placeholder="CSC 201"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Department *</label>
                <input
                  value={uploadForm.department}
                  onChange={(e) => setUploadForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="Computer Science"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what this resource covers…"
                  rows={3}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Tags (comma-separated)</label>
                <input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="data-structures, algorithms"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploading ? "Submitting…" : "Submit for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
