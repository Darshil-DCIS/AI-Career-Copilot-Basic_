import React, { useState } from 'react';
import type { UserProfile, RoadmapStep, UserProject, SkillGap, FutureTrend, Achievement } from '../types';
import Card from './common/Card';
import { SparklesIcon, GithubIcon, LinkedInIcon } from './icons';
import SkillDetailModal from './SkillDetailModal';


const groupBy = <T, K extends string | number>(list: T[], getKey: (item: T) => K) =>
  (list || []).reduce((acc, currentItem) => {
    const group = getKey(currentItem);
    (acc[group] = acc[group] || []).push(currentItem);
    return acc;
  }, {} as Record<K, T[]>);

const proficiencyConfig = {
    'Beginner': { color: 'bg-sky-500/30', textColor: 'text-sky-300', level: 1 },
    'Intermediate': { color: 'bg-emerald-500/30', textColor: 'text-emerald-300', level: 2 },
    'Advanced': { color: 'bg-amber-500/30', textColor: 'text-amber-300', level: 3 },
    'Expert': { color: 'bg-purple-500/30', textColor: 'text-purple-300', level: 4 },
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
