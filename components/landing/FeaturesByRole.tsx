"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    StudentIcon,
    TeacherIcon,
    UniversityIcon,
    BookOpen01Icon,
    Briefcase02Icon,
    Brain02Icon,
    AnalyticsUpIcon,
    CheckmarkBadge01Icon,
    Time02Icon,
    UserGroupIcon,
    ChartRoseIcon,
    Shield01Icon
} from "hugeicons-react";

type RoleType = "student" | "lecturer" | "university";

const ROLE_DATA: Record<RoleType, {
    title: string;
    subtitle: string;
    features: Array<{ title: string; desc: string; icon: React.ElementType }>;
}> = {
    student: {
        title: "Student Empowerment",
        subtitle: "Accelerate your academic journey with intelligent, personalized tools.",
        features: [
            {
                title: "AI-Powered Summaries",
                desc: "Convert hours of lectures into concise, high-yield study materials instantly.",
                icon: Brain02Icon,
            },
            {
                title: "Opportunity Matching",
                desc: "Autonomous discovery of scholarships, internships, and gigs tailored to your profile.",
                icon: Briefcase02Icon,
            },
            {
                title: "Peer Marketplace",
                desc: "Access a verified, centralized hub of top-tier study guides and past questions.",
                icon: BookOpen01Icon,
            },
        ],
    },
    lecturer: {
        title: "Lecturer Amplification",
        subtitle: "Streamline course delivery and enhance student engagement.",
        features: [
            {
                title: "Automated Insights",
                desc: "Gain real-time analytics on student comprehension and resource utilization.",
                icon: AnalyticsUpIcon,
            },
            {
                title: "Resource Verification",
                desc: "Easily endorse high-quality student materials, building a robust academic base.",
                icon: CheckmarkBadge01Icon,
            },
            {
                title: "Time Optimization",
                desc: "Reduce administrative overhead with AI-assisted grading and Q&A management.",
                icon: Time02Icon,
            },
        ],
    },
    university: {
        title: "Institutional Scaling",
        subtitle: "Modernize campus infrastructure with data-driven administrative systems.",
        features: [
            {
                title: "Global Analytics",
                desc: "Track campus-wide academic performance and resource engagement metrics.",
                icon: ChartRoseIcon,
            },
            {
                title: "Alumni & Network Growth",
                desc: "Foster stronger connections between current students, alumni, and industry partners.",
                icon: UserGroupIcon,
            },
            {
                title: "Secure Infrastructure",
                desc: "Ensure all academic data is protected with enterprise-grade encryption and access controls.",
                icon: Shield01Icon,
            },
        ],
    },
};

export function FeaturesByRole() {
    const [activeRole, setActiveRole] = useState<RoleType>("student");

    return (
        <section id="ecosystem" className="py-32 px-6 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
                        Universal Ecosystem
                    </div>
                    <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tighter mb-6">
                        Value Across the <span className="text-emerald-500 italic">Entire Academic Stack.</span>
                    </h2>
                    <p className="text-neutral-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
                        UniBridge isn't just a student tool. It's a cohesive infrastructure designed to elevate every participant in the university ecosystem.
                    </p>
                </div>

                {/* Role Selector Tabs */}
                <div className="flex flex-wrap justify-center gap-4 mb-16 relative z-10">
                    {[
                        { id: "student", label: "Students", icon: StudentIcon },
                        { id: "lecturer", label: "Lecturers", icon: TeacherIcon },
                        { id: "university", label: "Universities", icon: UniversityIcon },
                    ].map((role) => {
                        const isActive = activeRole === role.id;
                        const Icon = role.icon;
                        return (
                            <button
                                key={role.id}
                                onClick={() => setActiveRole(role.id as RoleType)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300",
                                    isActive
                                        ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(10,143,106,0.3)] scale-105"
                                        : "bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <Icon size={20} />
                                {role.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Display */}
                <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 relative overflow-hidden min-h-[400px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

                    <div className="relative z-10 animate-soft-fade" key={activeRole}>
                        <div className="mb-12 border-b border-white/10 pb-8">
                            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                                {ROLE_DATA[activeRole].title}
                            </h3>
                            <p className="text-neutral-400 text-lg font-light max-w-2xl">
                                {ROLE_DATA[activeRole].subtitle}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {ROLE_DATA[activeRole].features.map((feature, idx) => {
                                const FeatureIcon = feature.icon;
                                return (
                                    <div key={idx} className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all duration-300">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(10,143,106,0.1)] group-hover:shadow-[0_0_20px_rgba(10,143,106,0.2)]">
                                            <FeatureIcon size={24} className="text-emerald-400" />
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-3">
                                            {feature.title}
                                        </h4>
                                        <p className="text-sm font-light text-neutral-400 leading-relaxed">
                                            {feature.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
