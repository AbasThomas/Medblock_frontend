export type UserRole = "student" | "lecturer" | "admin";
export type Plan = "basic" | "premium" | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: Plan;
  university: string;
  matricNumber?: string;
  department?: string;
  bio?: string;
  avatar?: string;
  points: number;
  badges: Badge[];
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  color: string;
}

export interface Lecture {
  id: string;
  title: string;
  courseCode: string;
  lecturer: string;
  lecturerId: string;
  university: string;
  department: string;
  scheduledAt: string;
  duration: number; // minutes
  isLive: boolean;
  isRecorded: boolean;
  recordingUrl?: string;
  streamUrl?: string;
  attendees: number;
  description?: string;
  tags: string[];
  summary?: string;
  offlineAvailable: boolean;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "notes" | "past-questions" | "study-guide" | "textbook" | "assignment";
  courseCode: string;
  university: string;
  department: string;
  uploadedBy: string;
  uploadedById: string;
  fileUrl: string;
  fileSize: number; // bytes
  downloads: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  isPremium: boolean;
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  year: number;
}

export interface Opportunity {
  id: string;
  title: string;
  type: "scholarship" | "bursary" | "gig" | "internship" | "grant";
  organization: string;
  description: string;
  amount?: number;
  currency?: string;
  deadline: string;
  requirements: string[];
  skills: string[];
  location: string;
  isRemote: boolean;
  applicationUrl: string;
  contactPerson?: string;
  contactLink?: string;
  matchScore?: number;
  tags: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  mood?: "happy" | "sad" | "anxious" | "stressed" | "neutral";
}

export interface AdminReport {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  pendingApprovals: number;
  totalDownloads: number;
  revenue: number;
  enrollmentRate: number;
  retentionRate: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  university: string;
  points: number;
  badges: number;
  change: number;
}
