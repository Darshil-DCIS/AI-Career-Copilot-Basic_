import React, { useState, useMemo } from 'react';
import type { UserProfile, SkillGap, RoadmapStep, UserProject, Achievement, TrackedJobStatus, TrackedJob } from '../types';
import Card from './common/Card';
import ProgressBar from './common/ProgressBar';
import { SparklesIcon, ProjectIcon, StarIcon, TrendingUpIcon, BrainIcon, DownloadIcon } from './icons';
import SkillDetailModal from './SkillDetailModal';


// Helper functions for HTML generation
const h1 = (text: string) => `<h1>${text}</h1>`;
const h2 = (text: string) => `<h2>${text}</h2>`;
const h3 = (text: string) => `<h3>${text}</h3>`;
const p = (text: string) => `<p>${text}</p>`;
const bold = (text: string) => `<strong>${text}</strong>`;
const li = (text: string) => `<li>${text}</li>`;
const ul = (items: string[]) => `<ul>${items.map(li).join('')}</ul>`;

const getStyles = () => `
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
    h2 { color: #0e7490; border-bottom: 1px solid #ccfbf1; padding-bottom: 5px; margin-top: 20px; }
    h3 { color: #155e75; margin-top: 15px; }
    p { margin-bottom: 10px; }
    ul { list-style-type: disc; margin-left: 20px; }
    li { margin-bottom: 5px; }
    strong { color: #0f766e; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary-card { background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .session-summary { padding-left: 20px; border-left: 2px solid #eee; margin-top: 5px; margin-bottom: 15px; }
  </style>
`;

// Main report generation function
const generateJourneyReportHTML = (user: UserProfile): string => {
    let content = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>My AI Career Copilot Journey</title>
            ${getStyles()}
        </head>
        <body>
            <div class="header">
                ${h1('AI Career Copilot Journey Report')}
                ${p(`${bold('Name:')} ${user.name}`)}
                ${p(`${bold('Target Role:')} ${user.targetRole}`)}
                ${p(`<em>Report generated on: ${new Date().toLocaleDateString()}</em>`)}
            </div>
    `;

    // --- Profile Summary ---
    content += h2('Profile Summary');
    content += '<div class="summary-card">';
    content += ul([
        `${bold('Level:')} ${user.level}`,
        `${bold('XP:')} ${user.xp}`,
        `${bold('Current Streak:')} ${user.streak} days`,
    ]);
    content += '</div>';

    // --- Achievements ---
    if (user.achievements?.length > 0) {
        content += h2('Achievements');
        content += ul(user.achievements.map(ach => `${ach.icon} ${bold(ach.name)}: ${ach.description}`));
    }

    // --- Skills & Gaps ---
    if (user.skills?.length > 0) {
        content += h2('Skills Analysis');
        const existingSkills = user.skills.filter(s => !s.isGap);
        const skillGaps = user.skills.filter(s => s.isGap);

        if (existingSkills.length > 0) {
            content += h3('My Skills');
            content += `<table><thead><tr><th>Skill</th><th>Proficiency</th><th>Category</th></tr></thead><tbody>`;
            existingSkills.forEach(skill => {
                content += `<tr><td>${skill.name}</td><td>${skill.proficiency}</td><td>${Array.isArray(skill.category) ? skill.category.join(', ') : skill.category}</td></tr>`;
            });
            content += `</tbody></table>`;
        }

        if (skillGaps.length > 0) {
            content += h3('Identified Skill Gaps');
            content += `<table><thead><tr><th>Skill to Acquire</th><th>Proficiency</th><th>Category</th></tr></thead><tbody>`;
            skillGaps.forEach(skill => {
                content += `<tr><td>${skill.name}</td><td>${skill.proficiency}</td><td>${Array.isArray(skill.category) ? skill.category.join(', ') : skill.category}</td></tr>`;
            });
            content += `</tbody></table>`;
        }
    }

    // --- Roadmap ---
    if (user.roadmap?.length > 0) {
        content += h2('Personalized Roadmap');
        user.roadmap.forEach(step => {
            content += h3(`${step.completed ? '[COMPLETED] ' : ''}${step.title} (${step.duration})`);
            content += p(`${bold('Milestone Project:')} ${step.milestoneProject}`);
            content += p(`${bold('Skills to Learn:')} ${step.skillsToLearn.join(', ')}`);
            content += p(`${bold('Suggested Resources:')}`);
            content += ul(step.suggestedResources.map(res => `<a href="${res.url}">${res.name}</a> (${res.type})`));
        });
    }

    // --- Projects ---
    if (user.projects?.length > 0) {
        content += h2('Project Portfolio');
        user.projects.forEach(project => {
            content += h3(`${project.title} - [${project.status}]`);
            content += p(`${bold('Description:')} ${project.description}`);
            content += p(`${bold('Difficulty:')} ${project.difficulty} (${project.xp} XP)`);
            content += p(`${bold('Required Skills:')} ${project.requiredSkills.join(', ')}`);
        });
    }

    // --- Trend Watcher ---
    if (user.trends?.length > 0) {
        content += h2('Industry Trend Summary');
        const currentTrends = user.trends.filter(t => t.type === 'Current');
        const futureTrends = user.trends.filter(t => t.type === 'Future');
        if (currentTrends.length > 0) {
            content += h3('Current Trends');
            currentTrends.forEach(trend => { content += p(`${bold(trend.title)}: ${trend.summary}`); });
        }
        if (futureTrends.length > 0) {
            content += h3('Future Trends');
            futureTrends.forEach(trend => { content += p(`${bold(trend.title)}: ${trend.summary}`); });
        }
    }

    // --- Job Finder Summary ---
    if (user.trackedJobs?.length > 0) {
        content += h2('Job Finder Kanban Summary');
        const jobsByStatus: { [key in TrackedJobStatus]?: TrackedJob[] } = {};
        user.trackedJobs.forEach(job => {
            if (!jobsByStatus[job.status]) { jobsByStatus[job.status] = []; }
            jobsByStatus[job.status]?.push(job);
        });
        for (const status in jobsByStatus) {
            const jobs = jobsByStatus[status as TrackedJobStatus];
            if (jobs?.length > 0) {
                content += h3(`${status} (${jobs.length})`);
                content += ul(jobs.map(job => `${job.title} at ${job.company}`));
            }
        }
    }
    
    // --- AI Tool Interactions ---
    content += h2('AI Mentor & Coach Summaries');
    content += p("This section summarizes insights from your interactions with the AI tools.");

    if (user.interviewHistory?.length > 0) {
        content += h3('Interview Coach Summaries');
        user.interviewHistory.forEach((session, i) => {
             content += p(`${bold(`Session #${i + 1} on ${new Date(session.date).toLocaleDateString()} for ${session.targetRole}:`)}`);
             content += `<div class="session-summary">${session.feedbackSummary.replace(/\n/g, '<br>')}</div>`;
        });
    }

    if (user.voiceMentorHistory?.length > 0) {
        content += h3('Voice Mentor Summaries');
        user.voiceMentorHistory.forEach((session, i) => {
             content += p(`${bold(`Session #${i + 1} on ${new Date(session.date).toLocaleDateString()}:`)}`);
             content += `<div class="session-summary">${session.keyTakeaways.replace(/\n/g, '<br>')}</div>`;
        });
    }

    if (user.quizHistory?.length > 0) {
        content += h3('Quiz History');
        user.quizHistory.forEach((session, i) => {
             content += p(`${bold(`Quiz #${i + 1} on ${new Date(session.date).toLocaleDateString()} for ${session.targetRole}:`)}`);
             content += ul([`Score: ${session.score}%`, `Topics: ${session.topics.join(', ')}`]);
        });
    }
    
    content += h3('Smart Chat');
    content += p('Suggestions from your general Smart Chat sessions are integrated into your journey and are not logged separately in this report.');

    content += `</body></html>`;
    return content;
};

// A reusable SVG Donut Chart component created from scratch
const DonutChart: React.FC<{ 
    data: { name: string, value: number, color: string }[], 
    title: string 
}> = ({ data, title }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    if (total === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full">
                <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-slate-400">No data available yet.</p>
            </div>
        )
    }
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = -90; // Start from the top

    const segments = data.map(item => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        const startX = 100 + radius * Math.cos(Math.PI * accumulatedAngle / 180);
        const startY = 100 + radius * Math.sin(Math.PI * accumulatedAngle / 180);
        
        accumulatedAngle += angle;
        
        const endX = 100 + radius * Math.cos(Math.PI * accumulatedAngle / 180);
        const endY = 100 + radius * Math.sin(Math.PI * accumulatedAngle / 180);

        return {
            path: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            stroke: item.color,
            strokeDasharray: `${circumference}`,
            strokeDashoffset: `${circumference * (1 - percentage)}`,
        };
    });

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-100 mb-4">{title}</h3>
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="-rotate-90">
                    {data.map((item, index) => {
                         const percentage = item.value / total;
                         const strokeDashoffset = circumference * (1 - percentage);
                         let accumulatedPercentage = 0;
                         for(let i=0; i < index; i++) {
                            accumulatedPercentage += data[i].value / total;
                         }
                         const rotation = accumulatedPercentage * 360;
                        return (
                             <circle
                                key={item.name}
                                cx="100" cy="100" r={radius}
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="20"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                transform={`rotate(${rotation}, 100, 100)`}
                            />
                        )
                    })}
                </svg>
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold">{total}</span>
                    <span className="text-sm text-slate-400">Total</span>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {data.map(item => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-300">{item.name}</span>
                        <span className="text-slate-400 font-medium">({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AchievementsList: React.FC<{ achievements: Achievement[] }> = ({ achievements }) => (
    <Card>
        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100 mb-4">
            <StarIcon className="w-7 h-7 text-amber-400" /> Achievements
        </h2>
        {achievements.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {achievements.map(ach => (
                     <div key={ach.id} className="flex items-center gap-4 p-2 bg-slate-900/50 rounded-lg">
                        <span className="text-3xl">{ach.icon}</span>
                        <div>
                            <h4 className="font-semibold text-slate-200">{ach.name}</h4>
                            <p className="text-xs text-slate-400">{ach.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-center text-slate-400 py-8">Complete projects and roadmap steps to earn achievements!</p>
        )}
    </Card>
);


const Dashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [selectedSkill, setSelectedSkill] = useState<SkillGap | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const nextMilestone = user.roadmap.find(step => !step.completed);
    const inProgressProject = user.projects.find(p => p.status === 'In Progress');
    const xpForNextLevel = 500;
    const currentLevelXp = Number(user.xp) % xpForNextLevel;
    
    const findRelatedItems = (skillName: string) => {
        const relatedRoadmapSteps = user.roadmap.filter(step => step.skillsToLearn.includes(skillName));
        const relatedProjects = user.projects.filter(project => project.requiredSkills.includes(skillName));
        return { relatedRoadmapSteps, relatedProjects };
    };

    const handleSkillClick = (skill: SkillGap) => {
        setSelectedSkill(skill);
    };

    const handleDownloadJourney = () => {
        setIsDownloading(true);
        try {
            const reportHtml = generateJourneyReportHTML(user);
            const blob = new Blob(['\ufeff', reportHtml], {
                type: 'application/msword;charset=utf-8',
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${user.name.replace(/\s+/g, '_')}_Journey_Report.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate or download report:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const skillProficiencyData = useMemo(() => {
        const counts = user.skills.reduce((acc, skill) => {
            acc[skill.proficiency] = (acc[skill.proficiency] || 0) + 1;
            return acc;
        }, {} as Record<SkillGap['proficiency'], number>);
        return [
            { name: 'Beginner', value: counts.Beginner || 0, color: '#3b82f6' },
            { name: 'Intermediate', value: counts.Intermediate || 0, color: '#2dd4bf' },
            { name: 'Advanced', value: counts.Advanced || 0, color: '#a855f7' },
            { name: 'Expert', value: counts.Expert || 0, color: '#f59e0b' },
        ];
    }, [user.skills]);

     const projectStatusData = useMemo(() => {
        const counts = user.projects.reduce((acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            return acc;
        }, {} as Record<UserProject['status'], number>);
        return [
            { name: 'Not Started', value: counts['Not Started'] || 0, color: '#64748b' },
            { name: 'In Progress', value: counts['In Progress'] || 0, color: '#38bdf8' },
            { name: 'Completed', value: counts['Completed'] || 0, color: '#4ade80' },
        ];
    }, [user.projects]);

    const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
        <div className="bg-slate-900/50 p-4 rounded-xl flex items-center gap-4">
            <div className="p-2 bg-slate-700/50 rounded-lg">{icon}</div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-slate-100">Welcome back, {user.name}!</h1>
                    <p className="text-slate-400 mt-2 text-lg">Here's a snapshot of your journey to becoming a <span className="font-semibold text-teal-300">{user.targetRole}</span>.</p>
                </div>
                 <button 
                    onClick={handleDownloadJourney}
                    disabled={isDownloading}
                    className="flex-shrink-0 ml-4 inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-slate-700/80 rounded-lg hover:bg-slate-600/80 disabled:opacity-50 transition-colors shadow-md"
                >
                    <DownloadIcon className="w-5 h-5" />
                    {isDownloading ? 'Generating...' : 'Download My Journey'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Level" value={user.level} icon={<StarIcon className="w-6 h-6 text-amber-400" />} />
                <StatCard label="XP" value={user.xp} icon={<SparklesIcon className="w-6 h-6 text-teal-400" />} />
                <StatCard label="Day Streak" value={user.streak} icon={<TrendingUpIcon className="w-6 h-6 text-green-400" />} />
                <Card className="p-4 flex items-center justify-center">
                    <ProgressBar value={currentLevelXp} max={xpForNextLevel} label={`Level ${user.level}`} />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <Card>
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><SparklesIcon className="w-7 h-7 text-teal-400" /> Next Milestone</h2>
                            {nextMilestone ? (
                                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                                    <h3 className="font-bold text-lg text-teal-300">{nextMilestone.title}</h3>
                                    <p className="text-slate-400 text-sm font-medium mb-2">{nextMilestone.duration}</p>
                                    <p className="text-slate-300">{nextMilestone.milestoneProject}</p>
                                </div>
                            ) : (
                                <p className="mt-4 text-center text-slate-400 py-4">You've completed your roadmap! 🎉</p>
                            )}
                        </Card>
                        <Card>
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><ProjectIcon /> Active Project</h2>
                            {inProgressProject ? (
                                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                                     <h3 className="font-bold text-lg text-teal-300">{inProgressProject.title}</h3>
                                     <p className="text-slate-400 text-sm font-medium mb-2">{inProgressProject.difficulty}</p>
                                     <p className="text-slate-300 line-clamp-2">{inProgressProject.description}</p>
                                </div>
                            ) : (
                                 <p className="mt-4 text-center text-slate-400 py-4">No projects in progress. Start one!</p>
                            )}
                        </Card>
                    </div>
                     <Card>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><BrainIcon /> Your Skills</h2>
                        <p className="text-slate-400 mt-1 mb-4 text-sm">Click a skill to see related projects and roadmap steps.</p>
                        <div className="flex flex-wrap gap-2">
                            {user.skills.map(skill => (
                                <button key={skill.name} onClick={() => handleSkillClick(skill)} className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${skill.isGap ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'}`}>
                                    {skill.name}
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
                <div className="space-y-8">
                     <AchievementsList achievements={user.achievements} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card><DonutChart data={skillProficiencyData} title="Skill Proficiency" /></Card>
                <Card><DonutChart data={projectStatusData} title="Project Status" /></Card>
            </div>

            {selectedSkill && (
                <SkillDetailModal 
                    skill={selectedSkill}
                    onClose={() => setSelectedSkill(null)}
                    {...findRelatedItems(selectedSkill.name)}
                />
            )}
        </div>
    );
};

export default Dashboard;