import React, { useState, useCallback, useEffect } from 'react';
import type { UserProfile, InterviewSession, VoiceSession, UserProject, Achievement, SkillGap } from './types';
import Dashboard from './components/Dashboard';
import SmartChat from './components/AiMentorChat';
import ResumeFeedback from './components/ResumeFeedback';
import Onboarding from './components/Onboarding';
import InterviewCoach from './components/InterviewCoach';
import VoiceMentor from './components/VoiceMentor';
import CourseFinder from './components/CourseFinder';
import Login from './components/Login';
import MyJourney from './components/MyJourney';
import ProfileEditor from './components/ProfileEditor';
import JobFinder from './components/JobFinder';
import TrendWatcher from './components/TrendWatcher';
import { DashboardIcon, ChatIcon, ResumeIcon, SparklesIcon, InterviewIcon, MicrophoneIcon, MapPinIcon, LogoutIcon, ProjectIcon, UserIcon, BriefcaseIcon, TrendingUpIcon } from './components/icons';
import { generateSkillMap, generateRoadmap, generateProjectSuggestions, getFutureSkillTrends } from './services/geminiService';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';


type View = 'dashboard' | 'journey' | 'chat' | 'resume' | 'interview' | 'voice' | 'courses' | 'jobs' | 'trends' | 'profile';

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [view, setView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [appError, setAppError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if(session){
                await fetchProfile(session.user.id);
            } else {
                setIsProfileLoading(false);
            }
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setUser(null);
                setIsProfileLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);
    
    const fetchProfile = async (userId: string) => {
        setIsProfileLoading(true);
        setAppError(null);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error fetching profile:', JSON.stringify(error, null, 2));
            setAppError(`Could not load your profile. Please refresh the page. Details: ${error.message}`);
        } else if (data) {
            setUser(data);
        }
        setIsProfileLoading(false);
    };
    
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
             console.error("Error logging out:", JSON.stringify(error, null, 2));
             setAppError(`Could not log out. Please refresh the page. Details: ${error.message}`);
        } else {
            setUser(null);
            setView('dashboard');
        }
    };

    const handleOnboardingComplete = useCallback(async (interests: string, resume: string, targetRole: string, githubUrl: string, linkedinUrl:string) => {
        if (!session) return;
        setIsLoading(true);
        setAppError(null);
        try {
            const skills = await generateSkillMap(interests, resume, targetRole, githubUrl, linkedinUrl);
            const [roadmap, projects, trends] = await Promise.all([
                generateRoadmap(skills, targetRole),
                generateProjectSuggestions(skills),
                getFutureSkillTrends(targetRole)
            ]);

            const profileData: UserProfile = {
                id: session.user.id,
                name: session.user.user_metadata.full_name || "User",
                targetRole,
                xp: 0,
                level: 1,
                streak: 1,
                skills,
                roadmap,
                projects: (projects || []).map(p => ({ ...p, status: 'Not Started' })),
                achievements: [],
                futureTrends: trends,
                githubUrl: githubUrl || undefined,
                linkedinUrl: linkedinUrl || undefined,
                interviewHistory: [],
                voiceMentorHistory: [],
            };

            const { error } = await supabase.from('profiles').upsert(profileData, {
                onConflict: 'id'
            });
            if (error) throw error;
            
            setUser(profileData);
        } catch (error: any) {
            console.error("Onboarding failed:", JSON.stringify(error, null, 2));
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'An unknown error occurred.';
            setAppError(`Failed to create your profile. Please try again. Details: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [session]);
    
    const updateUserInDatabase = async (profileData: UserProfile) => {
         const { error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', profileData.id);
        
        if (error) {
            console.error("Failed to update profile:", JSON.stringify(error, null, 2));
            setAppError(`Failed to save your changes. Your data might be out of sync. Please refresh. Details: ${error.message}`);
            // Revert optimistic update on error is handled by not setting the user state until success
            throw error;
        }
    }

    const handleUpdateProfile = async (profileUpdate: Partial<UserProfile>) => {
        if (!user) return;
        
        const oldTargetRole = user.targetRole;
        const newTargetRole = profileUpdate.targetRole;

        // Optimistically update for snappy UI feel
        const optimisticUser = { ...user, ...profileUpdate };
        setUser(optimisticUser);
        setAppError(null);

        try {
            if (newTargetRole && newTargetRole !== oldTargetRole) {
                 if(!window.confirm("Changing your target role will regenerate your roadmap and project suggestions. Are you sure you want to proceed?")) {
                    setUser(user); // Revert if cancelled
                    return;
                }
                setIsLoading(true);
                const [newRoadmap, newProjects, newTrends] = await Promise.all([
                    generateRoadmap(optimisticUser.skills, newTargetRole),
                    generateProjectSuggestions(optimisticUser.skills),
                    getFutureSkillTrends(newTargetRole)
                ]);
                const regeneratedUser = { 
                    ...optimisticUser, 
                    roadmap: newRoadmap, 
                    projects: (newProjects || []).map(p => ({ ...p, status: 'Not Started' })),
                    futureTrends: newTrends
                };
                await updateUserInDatabase(regeneratedUser);
                setUser(regeneratedUser); // Set final state
            } else {
                 await updateUserInDatabase(optimisticUser);
                 // User is already set optimistically
            }
        } catch(error) {
            setUser(user); // Revert on any error
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoadmapToggle = (index: number) => {
        if(!user) return;
        const currentUser = user;
        const newRoadmap = [...(currentUser.roadmap || [])];
        const item = newRoadmap[index];
        const wasCompleted = item.completed;
        item.completed = !item.completed;
        
        let newAchievements = [...(currentUser.achievements || [])];
        const allCompleted = newRoadmap.every(i => i.completed);
        if (allCompleted && !newAchievements.some(a => a.name === 'Roadmap Complete')) {
            newAchievements.push({ name: 'Roadmap Complete', icon: '🗺️', description: 'Completed all steps in your learning roadmap.' });
        }

        const xpChange = wasCompleted ? -150 : 150;
        const newXp = Math.max(0, currentUser.xp + xpChange);
        const newLevel = Math.floor(newXp / 500) + 1;
        
        handleUpdateProfile({ roadmap: newRoadmap, xp: newXp, level: newLevel, achievements: newAchievements });
    };

    const handleUpdateProject = (updatedProject: UserProject) => {
        if(!user) return;
        const currentUser = user;
        const newProjects = (currentUser.projects || []).map(p => p.title === updatedProject.title ? updatedProject : p);
        let xpChange = 0;
        let newAchievements = [...(currentUser.achievements || [])];
        
        const oldProject = (currentUser.projects || []).find(p => p.title === updatedProject.title);
        if(oldProject?.status !== 'Completed' && updatedProject.status === 'Completed') {
             xpChange = updatedProject.xp;
             const achievementMap: Record<UserProject['difficulty'], Achievement> = {
                'Easy': { name: 'First Easy Project', icon: '🥉', description: 'Completed your first Easy project.' },
                'Medium': { name: 'First Medium Project', icon: '🏅', description: 'Completed your first Medium project.' },
                'Hard': { name: 'First Hard Project', icon: '🏆', description: 'Completed your first Hard project.' },
             };
             const achievement = achievementMap[updatedProject.difficulty];
             if (achievement && !newAchievements.some(a => a.name === achievement.name)) {
                newAchievements.push(achievement);
             }
        } else if (oldProject?.status === 'Completed' && updatedProject.status !== 'Completed') {
            xpChange = -updatedProject.xp;
        }

        const newXp = Math.max(0, currentUser.xp + xpChange);
        const newLevel = Math.floor(newXp / 500) + 1;
        handleUpdateProfile({ projects: newProjects, xp: newXp, level: newLevel, achievements: newAchievements });
    };

    const handleRegenerateRoadmap = async (prompt: string) => {
        if (!user) return;
        setIsLoading(true);
        const newRoadmap = await generateRoadmap(user.skills || [], user.targetRole, prompt);
        await handleUpdateProfile({ roadmap: newRoadmap });
        setIsLoading(false);
    };

    const handleRegenerateProjects = async (prompt: string) => {
        if (!user) return;
        setIsLoading(true);
        const newProjects = await generateProjectSuggestions(user.skills || [], prompt);
        await handleUpdateProfile({ projects: (newProjects || []).map(p => ({ ...p, status: 'Not Started' })) });
        setIsLoading(false);
    };

    const handleSaveInterview = (sessionData: InterviewSession) => {
        if(!user) return;
        handleUpdateProfile({ interviewHistory: [sessionData, ...(user.interviewHistory || [])] });
    };

    const handleSaveVoiceSession = (sessionData: VoiceSession) => {
        if(!user) return;
        handleUpdateProfile({ voiceMentorHistory: [sessionData, ...(user.voiceMentorHistory || [])] });
    };
    
    if (appError) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-center p-6">
                <div className="bg-slate-800/60 border border-red-500/50 p-8 rounded-2xl max-w-lg">
                    <h2 className="text-2xl font-bold text-red-400">An Error Occurred</h2>
                    <p className="text-slate-300 mt-2">{appError}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-5 py-2.5 bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    if (isProfileLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    if (!user || !user.targetRole) { // Check if onboarding is complete
        return <Onboarding onComplete={handleOnboardingComplete} isLoading={isLoading} />;
    }

    const views: Record<View, React.ReactNode> = {
        dashboard: <Dashboard user={user} />,
        journey: <MyJourney user={user} onRoadmapToggle={handleRoadmapToggle} onUpdateProject={handleUpdateProject} onRegenerateRoadmap={handleRegenerateRoadmap} onRegenerateProjects={handleRegenerateProjects} />,
        chat: <SmartChat user={user} />,
        resume: <ResumeFeedback />,
        interview: <InterviewCoach user={user} onSaveInterview={handleSaveInterview} />,
        voice: <VoiceMentor user={user} onSaveSession={handleSaveVoiceSession} />,
        courses: <CourseFinder />,
        jobs: <JobFinder user={user} />,
        trends: <TrendWatcher user={user} />,
        profile: <ProfileEditor user={user} onUpdateProfile={handleUpdateProfile} />
    }

    return (
        <div className="flex h-screen w-full">
            <nav className="hidden md:flex flex-col w-64 bg-slate-900/80 border-r border-slate-800 p-4 shrink-0">
                <div className="p-3 text-teal-400 flex items-center gap-3 mb-6">
                   <SparklesIcon className="w-9 h-9" />
                   <span className="font-bold text-2xl text-slate-100">Copilot</span>
                </div>
                <div className="flex flex-col gap-2 flex-grow">
                    <NavItem icon={<DashboardIcon />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                    <NavItem icon={<ProjectIcon />} label="My Journey" active={view === 'journey'} onClick={() => setView('journey')} />
                    <NavItem icon={<ChatIcon />} label="Smart Chat" active={view === 'chat'} onClick={() => setView('chat')} />
                    <NavItem icon={<MicrophoneIcon />} label="Voice Mentor" active={view === 'voice'} onClick={() => setView('voice')} />
                    <NavItem icon={<ResumeIcon />} label="Resume" active={view === 'resume'} onClick={() => setView('resume')} />
                    <NavItem icon={<InterviewIcon />} label="Interview" active={view === 'interview'} onClick={() => setView('interview')} />
                    <NavItem icon={<MapPinIcon />} label="Courses" active={view === 'courses'} onClick={() => setView('courses')} />
                    <NavItem icon={<BriefcaseIcon />} label="Job Finder" active={view === 'jobs'} onClick={() => setView('jobs')} />
                    <NavItem icon={<TrendingUpIcon />} label="Trend Watcher" active={view === 'trends'} onClick={() => setView('trends')} />
                </div>
                 <div className="mt-auto flex flex-col gap-2">
                    <NavItem icon={<UserIcon />} label="Profile" active={view === 'profile'} onClick={() => setView('profile')} />
                    <NavItem icon={<LogoutIcon />} label="Logout" active={false} onClick={handleLogout} />
                </div>
            </nav>
            <main className="flex-1 overflow-y-auto h-screen relative">
                 {isLoading && <div className="absolute top-4 right-4 bg-teal-600/80 text-white px-4 py-2 rounded-lg text-sm z-50 animate-pulse">Processing...</div>}
                <div key={view} className="fade-in">
                  {views[view]}
                </div>
            </main>
             {/* Bottom Nav for Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 flex justify-around p-2">
                <NavItemMobile icon={<DashboardIcon />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                <NavItemMobile icon={<ProjectIcon />} active={view === 'journey'} onClick={() => setView('journey')} />
                <NavItemMobile icon={<ChatIcon />} active={view === 'chat'} onClick={() => setView('chat')} />
                <NavItemMobile icon={<BriefcaseIcon />} active={view === 'jobs'} onClick={() => setView('jobs')} />
                <NavItemMobile icon={<UserIcon />} active={view === 'profile'} onClick={() => setView('profile')} />
            </nav>
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-4 w-full p-3 rounded-lg transition-all duration-200 text-left ${active ? 'bg-teal-600/90 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}
    >
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        <span className="font-semibold">{label}</span>
    </button>
);

const NavItemMobile: React.FC<Omit<NavItemProps, 'label'>> = ({ icon, active, onClick }) => (
     <button 
        onClick={onClick} 
        className={`p-3 rounded-full transition-colors ${active ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
    >
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </button>
);

export default App;
