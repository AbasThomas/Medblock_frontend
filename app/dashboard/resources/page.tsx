"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen01Icon,
  Download01Icon,
  FilterIcon,
  PlusSignIcon,
  Search01Icon,
  StarIcon,
  Upload01Icon,
  Cancel01Icon as XIcon,
} from "hugeicons-react";
import { Loader2 } from "lucide-react"; // Keeping Loader2 for the spinner
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addUserPoints, getResources, createResource, incrementDownload } from "@/lib/supabase/queries";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultUniversity, setDefaultUniversity] = useState("");

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "notes",
    course_code: "",
    university: "",
    department: "",
    year: new Date().getFullYear(),
    tags: "",
    is_premium: false,
  });

  const supabase = useMemo(() => createClient(), []);

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
    const loadProfileDefaults = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", user.id)
        .single();

      const university = data?.university ?? "";
      setDefaultUniversity(university);
      if (university) {
        setUploadForm((prev) => ({ ...prev, university: prev.university || university }));
      }
    };

    void loadProfileDefaults();
  }, [supabase]);

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
    if (!resource.file_url) {
      toast.error("This resource does not have a downloadable file yet.");
      return;
    }

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
    if (!uploadForm.title || !uploadForm.course_code || !uploadForm.department || !selectedFile) {
      toast.error("Please complete all required fields and attach a file.");
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

      const extension = selectedFile.name.split(".").pop() ?? "bin";
      const slug = uploadForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const path = `${user.id}/${Date.now()}-${slug}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          "File upload failed. Confirm the Supabase storage bucket 'resources' exists and is writable.",
        );
      }

      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);

      await createResource(supabase, {
        ...uploadForm,
        uploaded_by: user.id,
        uploader_name: profile?.name ?? user.email?.split("@")[0] ?? "Anonymous",
        tags: uploadForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        file_url: urlData.publicUrl,
        file_size: selectedFile.size,
      });

      try {
        await addUserPoints(supabase, user.id, 20);
      } catch {
        // Points are non-blocking for resource submission.
      }

      toast.success("Resource submitted for review.");
      setShowUpload(false);
      setUploadForm({
        title: "", description: "", type: "notes", course_code: "",
        university: defaultUniversity, department: "", year: new Date().getFullYear(),
        tags: "", is_premium: false,
      });
      setSelectedFile(null);
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Resource Marketplace</h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            Share and access verified study materials from your institution community.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <PlusSignIcon size={16} /> Upload Resource
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search01Icon size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-48 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <XIcon size={14} className="text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <FilterIcon size={16} className="text-neutral-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-neutral-400 cursor-pointer"
          >
            <option value="" className="bg-neutral-900">All Resource Types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t} className="bg-neutral-900">{t.replace("-", " ").toUpperCase()}</option>
            ))}
          </select>
        </div>

        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(""); setTypeFilter(""); }}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Clear Filters
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
          <BookOpen01Icon size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No resources found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || typeFilter ? "Try different filters." : "Be the first to upload!"}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Upload01Icon size={16} /> Upload first resource
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.id} className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-neutral-400 group-hover:text-[#0A8F6A] transition-colors">
                  <BookOpen01Icon size={24} />
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border", getResourceTypeColor(resource.type))}>
                    {resource.type}
                  </span>
                  {resource.is_premium && (
                    <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[10px] font-bold text-orange-500 tracking-widest uppercase">
                      Premium
                    </span>
                  )}
                  {resource.is_verified && (
                    <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] tracking-widest uppercase">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{resource.course_code}</p>
                <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{resource.title}</p>
                <p className="mt-2 text-xs text-neutral-500 uppercase tracking-wider font-medium">
                  {resource.department} · {resource.year}
                </p>
                {resource.description && (
                  <p className="mt-4 line-clamp-2 text-xs text-neutral-500 font-light leading-relaxed">{resource.description}</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500 pt-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Download01Icon size={14} className="text-[#0A8F6A]" /> {resource.downloads}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <StarIcon size={14} className="fill-yellow-500 text-yellow-500" />
                    {resource.rating}
                  </span>
                </div>
                <span>{timeAgo(resource.created_at)}</span>
              </div>
              <p className="mt-2 text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Uploaded by {resource.uploader_name}</p>

              <button
                onClick={() => void handleDownload(resource)}
                disabled={resource.is_premium}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-lg",
                  resource.is_premium
                    ? "bg-white/5 border border-white/10 text-neutral-600 cursor-not-allowed shadow-none"
                    : "bg-[#0A8F6A] text-white hover:opacity-90 shadow-emerald-500/20",
                )}
              >
                <Download01Icon size={14} />
                {resource.is_premium ? "Upgrade Required" : "Download Resource"}
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
              <button
                onClick={() => {
                  setShowUpload(false);
                  setSelectedFile(null);
                }}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <XIcon size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your upload will be reviewed by an admin before going live.
            </p>

            <form onSubmit={(e) => void handleUpload(e)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  required
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Title *</label>
                <input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter resource title"
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
                    placeholder="Enter course code"
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
                  placeholder="Enter department"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Provide a brief resource description"
                  rows={3}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Tags (comma-separated)</label>
                <input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="Enter tags separated by commas"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setSelectedFile(null);
                  }}
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
                  {uploading ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
