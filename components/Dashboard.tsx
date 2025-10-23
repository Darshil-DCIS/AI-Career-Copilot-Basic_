import React from 'react';
import type { UserProfile, RoadmapStep, UserProject, SkillGap, FutureTrend } from '../types';
import Card from './common/Card';
import ProgressBar from './common/ProgressBar';
import { ProjectIcon, SparklesIcon, GithubIcon, LinkedInIcon } from './icons';

const groupBy = <T, K extends string | number>(list: T[], getKey: (item: T) => K) =>
  list.reduce((acc, currentItem) => {
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

const StatCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="flex flex-col">
        <h3 className="font-semibold text-slate-300">{title}</h3>
        <div className="mt-2 flex-grow flex flex-col justify-center">{children}</div>
    </Card>
);

const SkillHeatmap: React.FC<{skills: SkillGap[]}> = ({ skills }) => {
    // FIX: Explicitly type `skill` to resolve a type inference issue.
    const groupedSkills = groupBy(skills, (skill: SkillGap) => skill.category);
    
    return (
        <Card>
            <h2 className="text-xl font-bold text-slate-100">Your Skill Heatmap</h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">A visual overview of your skills and identified gaps.</p>
            <div className="space-y-6">
                {Object.entries(groupedSkills).map(([category, skillsInCategory]) => (
                    <div key={category}>
                        <h3 className="font-semibold text-slate-200 mb-3">{category}</h3>
                        <div className="flex flex-wrap gap-2">
                            {/* FIX: Explicitly type callback parameters to resolve type inference issues. */}
                            {skillsInCategory.sort((a: SkillGap, b: SkillGap) => proficiencyConfig[b.proficiency].level - proficiencyConfig[a.proficiency].level).map((skill: SkillGap) => (
                                <div key={skill.name} className={`px-3 py-1.5 text-sm font-medium rounded-full ${proficiencyConfig[skill.proficiency].color} ${proficiencyConfig[skill.proficiency].textColor} relative border border-transparent ${skill.isGap ? 'ring-2 ring-amber-400/80' : ''}`}>
                                    {skill.name}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const FutureTrends: React.FC<{trends: FutureTrend[]}> = ({ trends }) => (
    <Card>
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100"><SparklesIcon /> Future Skill Trends</h2>
        <div className="mt-4 space-y-4">
            {trends.map(trend => (
                <div key={trend.skill} className="p-3 bg-slate-900/40 rounded-lg">
                    <p className="font-semibold text-blue-300">{trend.skill}</p>
                    <p className="text-sm text-slate-400">{trend.reason}</p>
                </div>
            ))}
        </div>
    </Card>
);

const Integrations: React.FC<{ githubUrl?: string; linkedinUrl?: string }> = ({ githubUrl, linkedinUrl }) => (
    <Card>
        <h2 className="text-xl font-bold text-slate-100">Integrations</h2>
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
  onRoadmapToggle: (index: number) => void;
  onProjectStatusChange: (projectTitle: string, status: 'In Progress' | 'Completed') => void;
}

const RoadmapItem: React.FC<{ item: RoadmapStep, index: number, onToggle: (index: number) => void, isLast: boolean }> = ({ item, index, onToggle, isLast }) => (
    <div className="flex items-start gap-4">
        <div className="flex flex-col items-center h-full">
            <button 
                onClick={() => onToggle(index)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.completed ? 'bg-blue-500 border-blue-400' : 'bg-slate-700 border-slate-600 hover:border-blue-500'}`}
            >
                {item.completed && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
            </button>
            {!isLast && <div className="w-0.5 flex-grow bg-slate-700 my-2"></div>}
        </div>
        <div className={`pt-0.5 transition-opacity ${item.completed ? 'opacity-60' : 'opacity-100'}`}>
            <p className={`font-semibold ${item.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>{item.title} <span className="text-xs font-normal text-slate-400 ml-2">{item.duration}</span></p>
            <p className="text-sm text-slate-300 mt-1">{item.milestoneProject}</p>
        </div>
    </div>
);


const ProjectItem: React.FC<{ project: UserProject, onStatusChange: (projectTitle: string, status: 'In Progress' | 'Completed') => void }> = ({ project, onStatusChange }) => (
    <Card className="flex flex-col justify-between hover:border-blue-500/50 transition-colors duration-300">
        <div>
            <h4 className="font-bold text-lg text-slate-100">{project.title}</h4>
            <p className="text-sm text-slate-400 mt-1 mb-3">{project.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
                {project.requiredSkills.map(skill => (
                    <span key={skill} className="px-2.5 py-1 text-xs bg-slate-700/80 text-slate-300 rounded-full">{skill}</span>
                ))}
            </div>
        </div>
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-700/80">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${project.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300' : project.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                {project.difficulty}
            </span>
            <div className="flex gap-2">
                {project.status === 'Not Started' && <button onClick={() => onStatusChange(project.title, 'In Progress')} className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-md transition-colors">Start</button>}
                {project.status === 'In Progress' && <button onClick={() => onStatusChange(project.title, 'Completed')} className="text-sm font-semibold bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-md transition-colors">Complete</button>}
                {project.status === 'Completed' && <span className="text-sm font-semibold text-green-300">Done! +{project.xp} XP</span>}
            </div>
        </div>
    </Card>
);

const Dashboard: React.FC<DashboardProps> = ({ user, onRoadmapToggle, onProjectStatusChange }) => {
    const xpForNextLevel = (user.level + 1) * 250;
    
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-100">Welcome back, {user.name}!</h1>
                <p className="text-slate-400 mt-2 text-lg">Hey champ, let's crush some milestones for your <span className="font-semibold text-blue-300">{user.targetRole}</span> goal today 💪</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Level Progress">
                    <p className="text-4xl font-bold text-blue-400">Level {user.level}</p>
                    <ProgressBar value={user.xp} max={xpForNextLevel} colorClass="bg-blue-500" label="XP" />
                </StatCard>
                <StatCard title="Learning Streak">
                    <p className="text-4xl font-bold text-purple-400">{user.streak} Days 🔥</p>
                    <p className="text-sm text-slate-400 mt-2">Keep it up to unlock new badges!</p>
                </StatCard>
                 <StatCard title="Achievements">
                    <div className="flex flex-wrap gap-4 mt-2">
                        {user.achievements.map(badge => (
                            <span key={badge} title={badge} className="text-4xl filter grayscale hover:grayscale-0 transition-all">{badge}</span>
                        ))}
                         {user.achievements.length === 0 && <p className="text-sm text-slate-400 self-center">Complete projects to earn badges!</p>}
                    </div>
                </StatCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><SparklesIcon className="w-7 h-7 text-purple-400" /> AI-Generated Roadmap</h2>
                        <div className="mt-6 flex flex-col gap-2">
                           {user.roadmap.map((item, index) => (
                                <RoadmapItem key={index} item={item} index={index} onToggle={onRoadmapToggle} isLast={index === user.roadmap.length - 1} />
                           ))}
                        </div>
                    </Card>
                    <SkillHeatmap skills={user.skills} />
                </div>
                
                <div className="space-y-6">
                    <Card>
                         <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><ProjectIcon /> Suggested Projects</h2>
                         <div className="mt-4 space-y-4">
                            {user.projects.map(p => (
                                <ProjectItem key={p.title} project={p} onStatusChange={onProjectStatusChange} />
                            ))}
                         </div>
                    </Card>
                    <FutureTrends trends={user.futureTrends} />
                    <Integrations githubUrl={user.githubUrl} linkedinUrl={user.linkedinUrl} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
