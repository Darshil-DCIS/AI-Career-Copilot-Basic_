import React, { useState, useCallback, useEffect } from 'react';
import type { UserProfile, InterviewSession, VoiceSession, UserProject, Achievement, SkillGap, JobPosting, TrackedJob, TrackedJobStatus, QuizSession, ChatSession, ChatMessage } from './types';
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
import AiToolbox from './components/AiToolbox';
import { DashboardIcon, ChatIcon, ResumeIcon, SparklesIcon, InterviewIcon, MicrophoneIcon, MapPinIcon, LogoutIcon, ProjectIcon, UserIcon, BriefcaseIcon, TrendingUpIcon, ToolboxIcon, MenuIcon } from './components/icons';
import { generateSkillMap, generateRoadmap, generateProjectSuggestions, getIndustryTrends } from './services/geminiService';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { checkAndAwardAchievements } from './utils/achievementUtils';


type View = 'dashboard' | 'journey' | 'chat' | 'resume' | 'interview' | 'voice' | 'courses' | 'jobs' | 'trends' | 'profile' | 'toolbox';

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [view, setView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [appError, setAppError] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const handleOnboardingComplete = useCallback(async (interests: string, resume: string, targetRole: string, githubUrl: string, linkedinUrl:string, age: number, profession: string, educationLevel: string) => {
        if (!session) return;
        setIsLoading(true);
        setAppError(null);
        try {
            const skills = await generateSkillMap(interests, resume, targetRole, githubUrl, linkedinUrl, age, profession, educationLevel);
            
            // Create a temporary user object to pass to content generation functions
            const tempUser: UserProfile = {
                id: session.user.id,
                name: session.user.user_metadata.full_name || "User",
                targetRole,
                age,
                profession,
                educationLevel,
                xp: 0,
                level: 1,
                streak: 1,
                skills,
                roadmap: [],
                projects: [],
                achievements: [],
                trends: [],
                trackedJobs: [],
                githubUrl: githubUrl || undefined,
                linkedinUrl: linkedinUrl || undefined,
                interviewHistory: [],
                voiceMentorHistory: [],
                quizHistory: [],
                smartChatHistory: [],
            };

            const [roadmap, projects, trends] = await Promise.all([
                generateRoadmap(tempUser),
                generateProjectSuggestions(tempUser),
                getIndustryTrends(targetRole)
            ]);

            const profileData: UserProfile = {
                ...tempUser,
                roadmap,
                // FIX: Use 'as const' to prevent TypeScript from widening the 'Not Started' literal to a generic 'string' type.
                projects: (projects || []).map(p => ({ ...p, status: 'Not Started' as const })),
                trends: trends,
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
        // The id is optional in the type, but required for an update.
        if (!profileData.id) {
            const errMsg = "Cannot update profile without a user ID.";
            console.error(errMsg);
            setAppError(`Failed to save changes: ${errMsg}`);
            throw new Error(errMsg);
        }

        // FIX: Destructure the id from the rest of the data.
        // Supabase expects the primary key in the filter (.eq), not the update payload.
        // Including it in the payload can cause a "Failed to fetch" error.
        const { id, ...updateData } = profileData;

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id);
        
        if (error) {
            console.error("Failed to update profile:", JSON.stringify(error, null, 2));
            setAppError(`Failed to save your changes. Your data might be out of sync. Please refresh. Details: ${error.message}`);
            throw error;
        }
    }

    const handleUpdateProfile = async (profileUpdate: Partial<UserProfile>) => {
        if (!user) return;
        
        const oldTargetRole = user.targetRole;
        const newTargetRole = profileUpdate.targetRole;

        // Optimistically update for snappy UI feel, including achievements
        let optimisticUser = { ...user, ...profileUpdate };
        const newAchievements = checkAndAwardAchievements(optimisticUser);
        optimisticUser = { ...optimisticUser, achievements: newAchievements };

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
                    generateRoadmap(optimisticUser),
                    generateProjectSuggestions(optimisticUser),
                    getIndustryTrends(newTargetRole)
                ]);
                let regeneratedUser = { 
                    ...optimisticUser, 
                    roadmap: newRoadmap, 
                    // FIX: Use 'as const' to prevent TypeScript from widening the 'Not Started' literal to a generic 'string' type.
                    projects: (newProjects || []).map(p => ({ ...p, status: 'Not Started' as const })),
                    trends: newTrends
                };
                // Re-check achievements after regeneration
                const finalAchievements = checkAndAwardAchievements(regeneratedUser);
                regeneratedUser = { ...regeneratedUser, achievements: finalAchievements };

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
        
        const xpChange = wasCompleted ? -150 : 150;
        const newXp = Math.max(0, currentUser.xp + xpChange);
        const newLevel = Math.floor(newXp / 500) + 1;
        
        handleUpdateProfile({ roadmap: newRoadmap, xp: newXp, level: newLevel });
    };

    const handleUpdateProject = (updatedProject: UserProject) => {
        if(!user) return;
        const currentUser = user;
        const newProjects = (currentUser.projects || []).map(p => p.title === updatedProject.title ? updatedProject : p);
        let xpChange = 0;
        
        const oldProject = (currentUser.projects || []).find(p => p.title === updatedProject.title);
        if(oldProject?.status !== 'Completed' && updatedProject.status === 'Completed') {
             xpChange = updatedProject.xp;
        } else if (oldProject?.status === 'Completed' && updatedProject.status !== 'Completed') {
            xpChange = -updatedProject.xp;
        }

        const newXp = Math.max(0, currentUser.xp + xpChange);
        const newLevel = Math.floor(newXp / 500) + 1;
        handleUpdateProfile({ projects: newProjects, xp: newXp, level: newLevel });
    };

    const handleRegenerateRoadmap = async (prompt: string) => {
        if (!user) return;
        setIsLoading(true);
        const newRoadmap = await generateRoadmap(user, prompt);
        await handleUpdateProfile({ roadmap: newRoadmap });
        setIsLoading(false);
    };

    const handleRegenerateProjects = async (prompt: string) => {
        if (!user) return;
        setIsLoading(true);
        const newProjects = await generateProjectSuggestions(user, prompt);
        // FIX: Use 'as const' to prevent TypeScript from widening the 'Not Started' literal to a generic 'string' type.
        await handleUpdateProfile({ projects: (newProjects || []).map(p => ({ ...p, status: 'Not Started' as const })) });
        setIsLoading(false);
    };

    const handleSaveInterview = (sessionData: InterviewSession) => {
        if(!user) return;
        handleUpdateProfile({ interviewHistory: [sessionData, ...(user.interviewHistory || [])] });
    };
    
    const handleSaveQuiz = (sessionData: QuizSession) => {
        if(!user) return;
        handleUpdateProfile({ quizHistory: [sessionData, ...(user.quizHistory || [])] });
    };

    const handleSaveVoiceSession = (sessionData: VoiceSession) => {
        if(!user) return;
        handleUpdateProfile({ voiceMentorHistory: [sessionData, ...(user.voiceMentorHistory || [])] });
    };

    const handleSaveSmartChatHistory = (session: ChatSession) => {
        if(!user) return;
        const updatedHistory = [...(user.smartChatHistory || []), session];
        // Keep only the last 20 sessions to prevent data bloat
        if (updatedHistory.length > 20) {
            updatedHistory.shift();
        }
        handleUpdateProfile({ smartChatHistory: updatedHistory });
    };

    const handleTrackJob = (jobToTrack: JobPosting) => {
        if (!user) return;
        const currentTrackedJobs = user.trackedJobs || [];
        if (currentTrackedJobs.some(j => j.url === jobToTrack.url)) {
            alert("This job is already on your board.");
            return;
        }
        const newTrackedJob: TrackedJob = { ...jobToTrack, status: 'Applied' };
        handleUpdateProfile({ trackedJobs: [...currentTrackedJobs, newTrackedJob] });
    };

    const handleUpdateTrackedJobStatus = (jobUrl: string, newStatus: TrackedJobStatus) => {
        if (!user) return;
        const updatedJobs = (user.trackedJobs || []).map(job => 
            job.url === jobUrl ? { ...job, status: newStatus } : job
        );
        handleUpdateProfile({ trackedJobs: updatedJobs });
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
        journey: <MyJourney user={user} onRoadmapToggle={handleRoadmapToggle} onUpdateProject={handleUpdateProject} onRegenerateRoadmap={handleRegenerateRoadmap} onRegenerateProjects={handleRegenerateProjects} onTrackJob={handleTrackJob} />,
        chat: <SmartChat user={user} onSaveHistory={handleSaveSmartChatHistory} />,
        resume: <ResumeFeedback user={user} />,
        interview: <InterviewCoach user={user} onSaveInterview={handleSaveInterview} onSaveQuiz={handleSaveQuiz} />,
        voice: <VoiceMentor user={user} onSaveSession={handleSaveVoiceSession} />,
        courses: <CourseFinder />,
        jobs: <JobFinder user={user} onTrackJob={handleTrackJob} onUpdateTrackedJobStatus={handleUpdateTrackedJobStatus} />,
        trends: <TrendWatcher user={user} onUpdateTrends={async () => handleUpdateProfile({ trends: await getIndustryTrends(user.targetRole) })} />,
        profile: <ProfileEditor user={user} onUpdateProfile={handleUpdateProfile} />,
        toolbox: <AiToolbox user={user} />
    }
    
    const MobileMenu: React.FC<{
        currentView: View;
        onNavigate: (view: View) => void;
        onClose: () => void;
        onLogout: () => void;
    }> = ({ currentView, onNavigate, onClose, onLogout }) => {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden" onClick={onClose}>
                <div 
                    className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-slate-900 shadow-2xl p-4 flex flex-col animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3 text-teal-400 flex items-center gap-3 mb-6">
                       <SparklesIcon className="w-9 h-9" />
                       <span className="font-bold text-2xl text-slate-100">Copilot Menu</span>
                    </div>
                    <div className="flex flex-col gap-2 flex-grow overflow-y-auto">
                        <NavItem icon={<DashboardIcon />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
                        <NavItem icon={<ProjectIcon />} label="My Journey" active={currentView === 'journey'} onClick={() => onNavigate('journey')} />
                        <NavItem icon={<ChatIcon />} label="Smart Chat" active={currentView === 'chat'} onClick={() => onNavigate('chat')} />
                        <NavItem icon={<ToolboxIcon />} label="AI Toolbox" active={currentView === 'toolbox'} onClick={() => onNavigate('toolbox')} />
                        <NavItem icon={<ResumeIcon />} label="Resume" active={currentView === 'resume'} onClick={() => onNavigate('resume')} />
                        <NavItem icon={<InterviewIcon />} label="Interview" active={currentView === 'interview'} onClick={() => onNavigate('interview')} />
                        <NavItem icon={<MicrophoneIcon />} label="Voice Mentor" active={currentView === 'voice'} onClick={() => onNavigate('voice')} />
                        <NavItem icon={<MapPinIcon />} label="Courses" active={currentView === 'courses'} onClick={() => onNavigate('courses')} />
                        <NavItem icon={<BriefcaseIcon />} label="Job Finder" active={currentView === 'jobs'} onClick={() => onNavigate('jobs')} />
                        <NavItem icon={<TrendingUpIcon />} label="Trend Watcher" active={currentView === 'trends'} onClick={() => onNavigate('trends')} />
                    </div>
                     <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-800">
                        <NavItem icon={<UserIcon />} label="Profile" active={currentView === 'profile'} onClick={() => onNavigate('profile')} />
                        <NavItem icon={<LogoutIcon />} label="Logout" active={false} onClick={onLogout} />
                    </div>
                </div>
            </div>
        );
    };

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
                    <NavItem icon={<ToolboxIcon />} label="AI Toolbox" active={view === 'toolbox'} onClick={() => setView('toolbox')} />
                    <NavItem icon={<ResumeIcon />} label="Resume" active={view === 'resume'} onClick={() => setView('resume')} />
                    <NavItem icon={<InterviewIcon />} label="Interview" active={view === 'interview'} onClick={() => setView('interview')} />
                    <NavItem icon={<MicrophoneIcon />} label="Voice Mentor" active={view === 'voice'} onClick={() => setView('voice')} />
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
                <NavItemMobile icon={<ToolboxIcon />} active={view === 'toolbox'} onClick={() => setView('toolbox')} />
                <NavItemMobile icon={<MenuIcon />} active={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)} />
            </nav>
            {isMobileMenuOpen && (
                <MobileMenu
                    currentView={view}
                    onNavigate={(newView) => {
                        setView(newView);
                        setIsMobileMenuOpen(false);
                    }}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onLogout={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                    }}
                />
            )}
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