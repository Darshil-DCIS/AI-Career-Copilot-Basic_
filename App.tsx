import React, { useState, useCallback } from 'react';
import type { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import SmartChat from './components/AiMentorChat';
import ResumeFeedback from './components/ResumeFeedback';
import Onboarding from './components/Onboarding';
import InterviewCoach from './components/InterviewCoach';
import VoiceMentor from './components/VoiceMentor';
import CourseFinder from './components/CourseFinder';
import { DashboardIcon, ChatIcon, ResumeIcon, SparklesIcon, InterviewIcon, MicrophoneIcon, MapPinIcon } from './components/icons';
import { generateSkillMap, generateRoadmap, generateProjectSuggestions, getFutureSkillTrends } from './services/geminiService';

type View = 'dashboard' | 'chat' | 'resume' | 'interview' | 'voice' | 'courses';

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [view, setView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(false);

    const handleOnboardingComplete = useCallback(async (interests: string, resume: string, targetRole: string, githubUrl: string, linkedinUrl: string) => {
        setIsLoading(true);
        try {
            const skills = await generateSkillMap(interests, resume, targetRole, githubUrl, linkedinUrl);
            const [roadmap, projects, trends] = await Promise.all([
                generateRoadmap(skills, targetRole),
                generateProjectSuggestions(skills),
                getFutureSkillTrends(targetRole)
            ]);

            const initialUser: UserProfile = {
                name: "Alex",
                targetRole,
                xp: 0,
                level: 1,
                streak: 1,
                skills,
                roadmap,
                projects: projects.map(p => ({ ...p, status: 'Not Started' })),
                achievements: [],
                futureTrends: trends,
                githubUrl: githubUrl || undefined,
                linkedinUrl: linkedinUrl || undefined
            };
            setUser(initialUser);
        } catch (error) {
            console.error("Onboarding failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleRoadmapToggle = (index: number) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const newRoadmap = [...prevUser.roadmap];
            const item = newRoadmap[index];
            const wasCompleted = item.completed;
            item.completed = !item.completed;
            
            const xpChange = wasCompleted ? -150 : 150;
            const newXp = Math.max(0, prevUser.xp + xpChange);
            const newLevel = Math.floor(newXp / 250) + 1;

            return { ...prevUser, roadmap: newRoadmap, xp: newXp, level: newLevel };
        });
    };
    
    const handleProjectStatusChange = (projectTitle: string, status: 'In Progress' | 'Completed') => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const newProjects = prevUser.projects.map(p => p.title === projectTitle ? { ...p, status } : p);
            let xpChange = 0;
            let newAchievements = [...prevUser.achievements];
            if (status === 'Completed') {
                const project = newProjects.find(p => p.title === projectTitle);
                if (project) {
                    xpChange = project.xp;
                    if(project.difficulty === 'Hard' && !newAchievements.includes('🏆')) newAchievements.push('🏆');
                    if(project.difficulty === 'Medium' && !newAchievements.includes('🏅')) newAchievements.push('🏅');
                    if(project.difficulty === 'Easy' && !newAchievements.includes('🥉')) newAchievements.push('🥉');
                }
            }
            const newXp = prevUser.xp + xpChange;
            const newLevel = Math.floor(newXp / 250) + 1;
            return { ...prevUser, projects: newProjects, xp: newXp, level: newLevel, achievements: newAchievements };
        });
    };

    if (!user) {
        return <Onboarding onComplete={handleOnboardingComplete} isLoading={isLoading} />;
    }

    const views: Record<View, React.ReactNode> = {
        dashboard: <Dashboard user={user} onRoadmapToggle={handleRoadmapToggle} onProjectStatusChange={handleProjectStatusChange} />,
        chat: <SmartChat user={user} />,
        resume: <ResumeFeedback />,
        interview: <InterviewCoach user={user} />,
        voice: <VoiceMentor user={user} />,
        courses: <CourseFinder />
    }

    return (
        <div className="flex h-screen w-full">
            <nav className="hidden md:flex flex-col w-64 bg-slate-900/80 border-r border-slate-800 p-4 shrink-0">
                <div className="p-3 text-purple-400 flex items-center gap-3 mb-6">
                   <SparklesIcon className="w-9 h-9" />
                   <span className="font-bold text-2xl text-slate-100">Copilot</span>
                </div>
                <div className="flex flex-col gap-2">
                    <NavItem icon={<DashboardIcon />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                    <NavItem icon={<ChatIcon />} label="Smart Chat" active={view === 'chat'} onClick={() => setView('chat')} />
                    <NavItem icon={<MicrophoneIcon />} label="Voice Mentor" active={view === 'voice'} onClick={() => setView('voice')} />
                    <NavItem icon={<ResumeIcon />} label="Resume" active={view === 'resume'} onClick={() => setView('resume')} />
                    <NavItem icon={<InterviewIcon />} label="Interview" active={view === 'interview'} onClick={() => setView('interview')} />
                    <NavItem icon={<MapPinIcon />} label="Courses" active={view === 'courses'} onClick={() => setView('courses')} />
                </div>
            </nav>
            <main className="flex-1 overflow-y-auto h-screen">
                {views[view]}
            </main>
             {/* Bottom Nav for Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 flex justify-around p-2">
                <NavItemMobile icon={<DashboardIcon />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                <NavItemMobile icon={<ChatIcon />} active={view === 'chat'} onClick={() => setView('chat')} />
                <NavItemMobile icon={<MicrophoneIcon />} active={view === 'voice'} onClick={() => setView('voice')} />
                <NavItemMobile icon={<ResumeIcon />} active={view === 'resume'} onClick={() => setView('resume')} />
                <NavItemMobile icon={<InterviewIcon />} active={view === 'interview'} onClick={() => setView('interview')} />
                <NavItemMobile icon={<MapPinIcon />} active={view === 'courses'} onClick={() => setView('courses')} />
            </nav>
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-4 w-full p-3 rounded-lg transition-all duration-200 text-left ${active ? 'bg-blue-600/90 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}
    >
        {icon}
        <span className="font-semibold">{label}</span>
    </button>
);

const NavItemMobile: React.FC<Omit<NavItemProps, 'label'>> = ({ icon, active, onClick }) => (
     <button 
        onClick={onClick} 
        className={`p-3 rounded-full transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
    >
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    </button>
);

export default App;