"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Cancel01Icon,
  Clock01Icon,
  Download01Icon,
  PlusSignIcon,
  PlayIcon,
  Search01Icon,
  SignalIcon,
  Upload01Icon,
  VideoReplayIcon,
} from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addUserPoints, createLecture, getLectures } from "@/lib/supabase/queries";
import { cn, formatDateTime } from "@/lib/utils";

type VideoLesson = {
  id: string;
  title: string;
  course_code: string;
  lecturer_id?: string;
  lecturer_name: string;
  description?: string;
  recording_url?: string;
  stream_url?: string;
  tags: string[];
  created_at: string;
  scheduled_at: string;
};

type VideoForm = {
  title: string;
  course_code: string;
  description: string;
  video_url: string;
  material_url: string;
  tags: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
}

export default function LecturesPage() {
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    role: "student" as "student" | "lecturer" | "admin",
    university: "",
    department: "",
  });

  const [videoForm, setVideoForm] = useState<VideoForm>({
    title: "",
    course_code: "",
    description: "",
    video_url: "",
    material_url: "",
    tags: "",
  });

  const supabase = useMemo(() => createClient(), []);
  const canUpload = profile.role === "lecturer" || profile.role === "admin";

  const parseTags = (value: string) =>
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

  const loadIdentity = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      return;
    }

    setUserId(user.id);

    try {
      const { data } = await supabase
        .from("profiles")
        .select("name, role, university, department")
        .eq("id", user.id)
        .single();

      const resolvedRole =
        data?.role === "student" || data?.role === "lecturer" || data?.role === "admin"
          ? data.role
          : "student";

      setProfile({
        name: data?.name ?? user.email?.split("@")[0] ?? "Lecturer",
        role: resolvedRole,
        university: data?.university ?? "",
        department: data?.department ?? "",
      });
    } catch {
      setProfile((prev) => ({
        ...prev,
        name: user.email?.split("@")[0] ?? "Lecturer",
      }));
    }
  }, [supabase]);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const rows = (await getLectures(supabase, {})) as VideoLesson[];
      const mapped = rows
        .filter((item) => Boolean(item.recording_url))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setVideos(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load uploaded videos.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadIdentity();
    void loadVideos();
  }, [loadIdentity, loadVideos]);

  useEffect(() => {
    if (searchParams.get("create") === "1" && canUpload) {
      setShowUpload(true);
    }
  }, [canUpload, searchParams]);

  useEffect(() => {
    const channel = supabase
      .channel("videos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        void loadVideos();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadVideos, supabase]);

  const filteredVideos = videos.filter((video) => {
    const searchOk =
      !search ||
      video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.course_code.toLowerCase().includes(search.toLowerCase()) ||
      video.lecturer_name.toLowerCase().includes(search.toLowerCase());
    const mineOk = !mineOnly || (userId && video.lecturer_id === userId);
    return searchOk && mineOk;
  });

  const handlePublishVideo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Please sign in first.");
      return;
    }

    if (!videoForm.title || !videoForm.course_code) {
      toast.error("Title and course code are required.");
      return;
    }

    if (uploadMode === "url" && !videoForm.video_url.trim()) {
      toast.error("Please provide a video link.");
      return;
    }

    if (uploadMode === "file" && !videoFile) {
      toast.error("Please select a video file.");
      return;
    }

    try {
      setPublishing(true);

      let finalVideoUrl = videoForm.video_url.trim();

      if (uploadMode === "file" && videoFile) {
        const path = `${userId}/videos/${Date.now()}-${sanitizeFilename(videoFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(path, videoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            "Video upload failed. Confirm Supabase storage bucket 'resources' exists and allows uploads.",
          );
        }

        const { data: publicUrl } = supabase.storage.from("resources").getPublicUrl(path);
        finalVideoUrl = publicUrl.publicUrl;
      }

      await createLecture(supabase, {
        title: videoForm.title.trim(),
        course_code: videoForm.course_code.trim().toUpperCase(),
        lecturer_id: userId,
        lecturer_name: profile.name || "Lecturer",
        university: profile.university || "",
        department: profile.department || "",
        scheduled_at: new Date().toISOString(),
        duration: 0,
        description: videoForm.description.trim(),
        recording_url: finalVideoUrl,
        stream_url: videoForm.material_url.trim() || undefined,
        tags: parseTags(videoForm.tags),
        is_live: false,
        is_recorded: true,
        offline_available: Boolean(videoForm.material_url.trim()),
      });

      try {
        await addUserPoints(supabase, userId, 25);
      } catch {
        // Publishing should still succeed if points update fails.
      }

      toast.success("Video lesson published.");
      setShowUpload(false);
      setUploadMode("url");
      setVideoFile(null);
      setVideoForm({
        title: "",
        course_code: "",
        description: "",
        video_url: "",
        material_url: "",
        tags: "",
      });
      await loadVideos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish video lesson.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Video Lessons</h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            Upload course videos and optional download materials for students.
          </p>
        </div>
        {canUpload && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/lecturer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all"
            >
              <SignalIcon size={16} /> Go Live
            </Link>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <PlusSignIcon size={16} /> Upload Video
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search01Icon size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search uploaded videos"
            className="w-56 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <Cancel01Icon size={14} className="text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        <button
          onClick={() => setMineOnly((prev) => !prev)}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            mineOnly
              ? "border-[#0A8F6A] bg-[#0A8F6A]/20 text-white"
              : "border-white/10 bg-black/20 text-neutral-500 hover:text-white",
          )}
        >
          My Uploads
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <VideoReplayIcon size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No video lessons found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canUpload ? "Upload your first course video." : "Check back when lecturers publish videos."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 text-[#0A8F6A]">
                  <VideoReplayIcon size={24} />
                </div>
                {video.lecturer_id && userId === video.lecturer_id && (
                  <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] tracking-widest uppercase">
                    You Uploaded
                  </span>
                )}
              </div>

              <div className="mt-6 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{video.course_code}</p>
                <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{video.title}</p>
                <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">By {video.lecturer_name}</p>
                {video.description && (
                  <p className="mt-4 line-clamp-3 text-xs text-neutral-500 font-light leading-relaxed">{video.description}</p>
                )}
              </div>

              <div className="mt-6 space-y-2 border-t border-white/5 pt-5 text-[10px] uppercase tracking-widest text-neutral-500">
                <div className="flex items-center gap-2">
                  <Clock01Icon size={14} className="text-[#0A8F6A]" />
                  Published {formatDateTime(video.created_at || video.scheduled_at)}
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                {video.recording_url && (
                  <a
                    href={video.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <PlayIcon size={14} /> Watch Video
                  </a>
                )}

                {video.stream_url && (
                  <a
                    href={video.stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-white hover:border-white/20 transition-all"
                  >
                    <Download01Icon size={14} /> Material
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium tracking-tight text-white">Upload Video Lesson</h2>
              <button onClick={() => setShowUpload(false)} className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all">
                <Cancel01Icon size={16} />
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6">
              Publish course videos and include downloadable material links for students.
            </p>

            <form onSubmit={(event) => void handlePublishVideo(event)} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Title *</label>
                  <input
                    value={videoForm.title}
                    onChange={(event) => setVideoForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Video title"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Course Code *</label>
                  <input
                    value={videoForm.course_code}
                    onChange={(event) => setVideoForm((prev) => ({ ...prev, course_code: event.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="CSC301"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-2">
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                    uploadMode === "url" ? "bg-[#0A8F6A] text-white" : "text-neutral-500 hover:text-white",
                  )}
                >
                  Use Video Link
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                    uploadMode === "file" ? "bg-[#0A8F6A] text-white" : "text-neutral-500 hover:text-white",
                  )}
                >
                  Upload Video File
                </button>
              </div>

              {uploadMode === "url" ? (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Video URL *</label>
                  <input
                    type="url"
                    value={videoForm.video_url}
                    onChange={(event) => setVideoForm((prev) => ({ ...prev, video_url: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="https://youtube.com/... or hosted mp4 link"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Video File *</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                  {videoFile && (
                    <p className="mt-2 text-[11px] text-neutral-500">{videoFile.name}</p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Download Material URL (Optional)</label>
                <input
                  type="url"
                  value={videoForm.material_url}
                  onChange={(event) => setVideoForm((prev) => ({ ...prev, material_url: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="https://drive.google.com/... or document link"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Description</label>
                <textarea
                  rows={3}
                  value={videoForm.description}
                  onChange={(event) => setVideoForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="What this video covers."
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Tags (CSV)</label>
                <input
                  value={videoForm.tags}
                  onChange={(event) => setVideoForm((prev) => ({ ...prev, tags: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="exam prep, revision, tutorial"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
                >
                  {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {publishing ? "Publishing..." : (
                    <>
                      <Upload01Icon size={14} /> Publish Video
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
