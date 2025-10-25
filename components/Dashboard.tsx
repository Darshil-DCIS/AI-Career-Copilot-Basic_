import React, { useState, useMemo } from 'react';
// FIX: Removed the non-existent 'FutureTrend' type from the import.
import type { UserProfile, RoadmapStep, UserProject, SkillGap, Achievement } from '../types';
import Card from './common/Card';
import { SparklesIcon, GithubIcon, LinkedInIcon, ProjectIcon } from './icons';
import SkillDetailModal from './SkillDetailModal';


const groupBy = <T, K extends string | number>(list: T[], getKey: (item: T) => K) =>
  (list || []).reduce((acc, currentItem) => {
    const group = getKey(currentItem);
    (acc[group] = acc[group] || []).push(currentItem);
    return acc;
  }, {} as Record<K, T[]>);

const proficiencyConfig = {
    'Beginner': { color: 'bg-sky-500/30', textColor: 'text-sky-300', level: 1, chartColor: '#0ea5e9' },
    'Intermediate': { color: 'bg-emerald-500/30', textColor: 'text-emerald-300', level: 2, chartColor: '#10b981' },
    'Advanced': { color: 'bg-amber-500/30', textColor: 'text-amber-300', level: 3, chartColor: '#f59e0b' },
    'Expert': { color: 'bg-purple-500/30', textColor: 'text-purple-300', level: 4, chartColor: '#a855f7' },
} as const;


const SkillHeatmap: React.FC<{skills: SkillGap[], onSkillClick: (skill: SkillGap) => void}> = ({ skills, onSkillClick }) => {
    if (!skills || skills.length === 0) return null;
    const groupedSkills = groupBy(skills, (skill: SkillGap) => skill.category);
    
    return (
        <Card>
            <h2 className="text-xl font-bold text-slate-100">Your Skill Heatmap</h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">A visual overview of your skills. Click a skill to see related items.</p>
            <div className="space-y-6">
                {Object.entries(groupedSkills).map(([category, skillsInCategory]) => (
                    <div key={category}>
                        <h3 className="font-semibold text-slate-200 mb-3">{category}</h3>
                        <div className="flex flex-wrap gap-2">
                            {skillsInCategory.sort((a, b) => proficiencyConfig[b.proficiency].level - proficiencyConfig[a.proficiency].level).map((skill) => (
                                <button 
                                    key={skill.name} 
                                    onClick={() => onSkillClick(skill)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full ${proficiencyConfig[skill.proficiency].color} ${proficiencyConfig[skill.proficiency].textColor} relative border border-transparent ${skill.isGap ? 'ring-2 ring-amber-400/80' : ''} transition-transform hover:scale-105`}
                                >
                                    {skill.name}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const Integrations: React.FC<{ githubUrl?: string; linkedinUrl?: string }> = ({ githubUrl, linkedinUrl }) => (
    <Card>
        <h2 className="text-xl font-bold text-slate-100">Professional Links</h2>
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <a 
                href={githubUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all ${githubUrl ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'}`}
                aria-disabled={!githubUrl}
            >
                <GithubIcon /> GitHub
            </a>
            <a 
                href={linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all ${linkedinUrl ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'}`}
                aria-disabled={!linkedinUrl}
            >
                <LinkedInIcon /> LinkedIn
            </a>
        </div>
    </Card>
);

interface DashboardProps {
  user: UserProfile;
}

const ProgressOverview: React.FC<{ user: UserProfile, xpForNextLevel: number }> = ({ user, xpForNextLevel }) => {
    const percentage = Math.min(100, (user.xp / xpForNextLevel) * 100);
    const circumference = 2 * Math.PI * 54; // 2 * pi * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <Card className="col-span-1 md:col-span-3">
             <h2 className="text-2xl font-bold text-slate-100">Progress Overview</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 items-center">
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#334155" strokeWidth="12" />
                            <circle 
                                cx="60" cy="60" r="54" fill="none" stroke="url(#levelGradient)" strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 60 60)"
                                className="transition-all duration-500"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2dd4bf" />
                                <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-teal-300">Level {user.level}</span>
                            <span className="text-sm text-slate-400">{user.xp} / {xpForNextLevel} XP</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-6xl font-bold text-amber-400">{user.streak}🔥</p>
                    <p className="text-slate-300 font-semibold mt-1">Day Streak</p>
                    <p className="text-sm text-slate-400 mt-2">Keep it up to unlock new achievements!</p>
                </div>
                 <div className="flex flex-col items-center justify-center">
                    <p className="font-semibold text-slate-300 mb-2">Achievements</p>
                    <div className="flex flex-wrap gap-4 mt-2 justify-center">
                        {(user.achievements || []).map((badge: Achievement) => (
                            <span key={badge.name} title={badge.description} className="text-4xl filter grayscale hover:grayscale-0 transition-all cursor-pointer">{badge.icon}</span>
                        ))}
                         {(user.achievements || []).length === 0 && <p className="text-sm text-slate-400 self-center">Complete projects to earn badges!</p>}
                    </div>
                </div>
             </div>
        </Card>
    );
};

const DashboardGraphs: React.FC<{ user: UserProfile }> = ({ user }) => {
    const { skillStats, projectStats, roadmapStats } = useMemo(() => {
        const skills = user.skills || [];
        const projects = user.projects || [];
        const roadmap = user.roadmap || [];
        
        const skillCounts = { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0 };
        skills.forEach(s => skillCounts[s.proficiency]++);

        const projectCounts = { 'Not Started': 0, 'In Progress': 0, 'Completed': 0 };
        projects.forEach(p => projectCounts[p.status]++);

        const completedSteps = roadmap.filter(step => step.completed).length;
        const totalSteps = roadmap.length;

        return { 
            skillStats: skillCounts, 
            projectStats: projectCounts,
            roadmapStats: { completed: completedSteps, total: totalSteps }
        };
    }, [user.skills, user.projects, user.roadmap]);

    const totalSkills = (user.skills || []).length;
    const totalProjects = (user.projects || []).length;

    const DonutChart = () => {
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        let offset = 0;

        return (
             <div className="flex items-center justify-center gap-6">
                <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                        {Object.entries(skillStats).map(([proficiency, count]) => {
                            if (count === 0) return null;
                            const percentage = (count / totalSkills) * 100;
                            const dash = (percentage / 100) * circumference;
                            const currentOffset = offset;
                            offset += dash;
                            return (
                                <circle
                                    key={proficiency}
                                    cx="70" cy="70" r={radius} fill="none"
                                    stroke={proficiencyConfig[proficiency as keyof typeof proficiencyConfig].chartColor}
                                    strokeWidth="20" strokeDasharray={`${dash} ${circumference}`}
                                    strokeDashoffset={-currentOffset}
                                    className="transition-all duration-1000 ease-out"
                                />
                            );
                        })}
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{totalSkills}</span>
                        <span className="text-sm text-slate-400">Skills</span>
                    </div>
                </div>
                 <div className="space-y-1.5">
                    {Object.entries(skillStats).map(([proficiency, count]) => (
                         <div key={proficiency} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: proficiencyConfig[proficiency as keyof typeof proficiencyConfig].chartColor }}></div>
                            <span className="text-slate-300">{proficiency}</span>
                            <span className="font-semibold text-slate-100">{count}</span>
                        </div>
                    ))}
                </div>
             </div>
        );
    };

    return (
        <Card>
            <h2 className="text-xl font-bold text-slate-100 mb-4">At a Glance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Roadmap Progress */}
                <div className="flex flex-col items-center">
                    <h3 className="font-semibold text-center text-slate-200 mb-4">Roadmap Progress</h3>
                    {roadmapStats.total > 0 ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative w-36 h-36">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="10" />
                                    <circle 
                                        cx="50" cy="50" r="45" fill="none" stroke="url(#roadmapGradient)" strokeWidth="10"
                                        strokeDasharray={2 * Math.PI * 45}
                                        strokeDashoffset={(2 * Math.PI * 45) - (roadmapStats.completed / roadmapStats.total) * (2 * Math.PI * 45)}
                                        transform="rotate(-90 50 50)"
                                        className="transition-all duration-1000"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="roadmapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#fbbf24" />
                                            <stop offset="100%" stopColor="#f87171" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-amber-300">
                                        {Math.round((roadmapStats.completed / roadmapStats.total) * 100)}%
                                    </span>
                                    <span className="text-xs text-slate-400">Complete</span>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-slate-300">{roadmapStats.completed} of {roadmapStats.total} steps done</p>
                        </div>
                    ) : <p className="text-center text-slate-400 py-8">No roadmap created yet.</p>}
                </div>

                {/* Skill Distribution */}
                <div className="flex flex-col items-center">
                    <h3 className="font-semibold text-center text-slate-200 mb-4">Skill Distribution</h3>
                    {totalSkills > 0 ? <DonutChart /> : <p className="text-center text-slate-400 py-8">No skills added yet.</p>}
                </div>

                {/* Project Status */}
                <div className="flex flex-col">
                    <h3 className="font-semibold text-center text-slate-200 mb-4">Project Status</h3>
                    {totalProjects > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(projectStats).map(([status, count]) => {
                                const colors = {
                                    'Not Started': 'bg-slate-500',
                                    'In Progress': 'bg-sky-500',
                                    'Completed': 'bg-emerald-500'
                                };
                                return (
                                    <div key={status}>
                                        <div className="flex justify-between text-sm font-medium text-slate-300 mb-1">
                                            <span>{status}</span>
                                            <span>{count} / {totalProjects}</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                                            <div 
                                                className={`${colors[status as keyof typeof colors]} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                                                style={{ width: `${(count / totalProjects) * 100}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-8">
                            <ProjectIcon className="w-8 h-8 mx-auto text-slate-500 mb-2"/>
                            No projects to display.
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const xpForNextLevel = (user.level + 1) * 250;
    const [selectedSkill, setSelectedSkill] = useState<SkillGap | null>(null);
    const [relatedItems, setRelatedItems] = useState<{ projects: UserProject[], roadmapSteps: RoadmapStep[] }>({ projects: [], roadmapSteps: [] });

    const handleSkillClick = (skill: SkillGap) => {
        const relatedProjects = (user.projects || []).filter(p => (p.requiredSkills || []).includes(skill.name));
        const relatedRoadmapSteps = (user.roadmap || []).filter(r => (r.skillsToLearn || []).includes(skill.name));
        setRelatedItems({ projects: relatedProjects, roadmapSteps: relatedRoadmapSteps });
        setSelectedSkill(skill);
    };
    
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-100">Welcome back, {user.name}!</h1>
                <p className="text-slate-400 mt-2 text-lg">Your mission today: progress towards your <span className="font-semibold text-teal-300">{user.targetRole}</span> goal! 💪</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <ProgressOverview user={user} xpForNextLevel={xpForNextLevel} />
            </div>

            <DashboardGraphs user={user} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <SkillHeatmap skills={user.skills} onSkillClick={handleSkillClick} />
                <div className="space-y-6">
                    <Integrations githubUrl={user.githubUrl} linkedinUrl={user.linkedinUrl} />
                </div>
            </div>
            
            {selectedSkill && (
                <SkillDetailModal 
                    skill={selectedSkill}
                    relatedProjects={relatedItems.projects}
                    relatedRoadmapSteps={relatedItems.roadmapSteps}
                    onClose={() => setSelectedSkill(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;