import React, { useState } from 'react';
import type { UserProfile } from '../types';
import Card from './common/Card';
import { ToolboxIcon, SparklesIcon } from './icons';
import { generateProfessionalEmail, generateElevatorPitch, generateCoverLetter, optimizeLinkedInSummary } from '../services/geminiService';

interface AiToolboxProps {
    user: UserProfile;
}

const tools = [
    { id: 'email', name: 'Professional Email Writer', description: 'Draft emails for networking, interviews, and more.' },
    { id: 'pitch', name: 'Elevator Pitch Generator', description: 'Craft a compelling 30-second introduction.' },
    { id: 'cover-letter', name: 'Cover Letter Helper', description: 'Generate a cover letter based on a job description.' },
    { id: 'linkedin', name: 'LinkedIn Optimizer', description: 'Get suggestions to improve your profile summary.' },
];

// Helper to create a user summary for prompts
const createUserSummary = (user: UserProfile): string => {
    const skills = user.skills.map(s => `${s.name} (${s.proficiency})`).join(', ');
    const projects = user.projects.filter(p => p.status === 'Completed').map(p => p.title).join(', ');
    return `
Name: ${user.name}
Target Role: ${user.targetRole}
Skills: ${skills}
Completed Projects: ${projects}
LinkedIn: ${user.linkedinUrl || 'Not provided'}
GitHub: ${user.githubUrl || 'Not provided'}
    `.trim();
};


interface ToolComponentProps {
    user: UserProfile;
    onResult: (result: string) => void;
}

const EmailWriter: React.FC<ToolComponentProps> = ({ user, onResult }) => {
    const [recipientRole, setRecipientRole] = useState('');
    const [goal, setGoal] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!recipientRole || !goal || !keyPoints) return;
        setIsLoading(true);
        onResult(''); // Clear previous result
        const generatedEmail = await generateProfessionalEmail(recipientRole, goal, keyPoints);
        onResult(generatedEmail);
        setIsLoading(false);
    };
    
    return (
        <div className="space-y-4">
            <input type="text" value={recipientRole} onChange={e => setRecipientRole(e.target.value)} placeholder="Recipient's Role (e.g., Hiring Manager)" className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
            <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Your Goal (e.g., Thank you for the interview)" className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
            <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder="Key points to include (one per line)..." rows={4} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors">
                <SparklesIcon/> {isLoading ? 'Drafting...' : 'Generate Email'}
            </button>
        </div>
    );
};

const PitchGenerator: React.FC<ToolComponentProps> = ({ user, onResult }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        onResult(''); // Clear previous result
        const pitch = await generateElevatorPitch(user);
        onResult(pitch);
        setIsLoading(false);
    };

    return (
        <div>
            <p className="text-slate-400 mb-4 text-center">Generate a concise and powerful elevator pitch based on your profile.</p>
             <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors">
                <SparklesIcon/> {isLoading ? 'Crafting...' : 'Generate My Pitch'}
            </button>
        </div>
    );
};

const CoverLetterHelper: React.FC<ToolComponentProps> = ({ user, onResult }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [userInfo, setUserInfo] = useState(createUserSummary(user));
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!jobDescription || !userInfo) return;
        setIsLoading(true);
        onResult('');
        const letter = await generateCoverLetter(jobDescription, userInfo, user);
        onResult(letter);
        setIsLoading(false);
    };

    return (
         <div className="space-y-4">
            <h4 className="font-semibold text-slate-300 text-sm">Your Information (auto-filled from profile)</h4>
            <textarea value={userInfo} onChange={e => setUserInfo(e.target.value)} placeholder="Your skills, projects, experience..." rows={6} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
             <h4 className="font-semibold text-slate-300 text-sm">Job Description</h4>
            <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={6} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
            <button onClick={handleGenerate} disabled={isLoading || !jobDescription} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors">
                <SparklesIcon/> {isLoading ? 'Writing...' : 'Generate Cover Letter'}
            </button>
        </div>
    );
};

const LinkedInOptimizer: React.FC<ToolComponentProps> = ({ user, onResult }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        onResult('');
        const optimizedSummary = await optimizeLinkedInSummary(summary, user);
        onResult(optimizedSummary);
        setIsLoading(false);
    };
    
    return (
        <div className="space-y-4">
            <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Paste your current LinkedIn summary here (or leave blank to generate a new one)..." rows={8} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
            <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors">
                <SparklesIcon/> {isLoading ? 'Optimizing...' : 'Optimize My Summary'}
            </button>
        </div>
    );
};


const AiToolbox: React.FC<AiToolboxProps> = ({ user }) => {
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [result, setResult] = useState('');

    const renderTool = () => {
        if (!activeTool) return null;
        const props = { user, onResult: setResult };
        switch(activeTool) {
            case 'email': return <EmailWriter {...props} />;
            case 'pitch': return <PitchGenerator {...props} />;
            case 'cover-letter': return <CoverLetterHelper {...props} />;
            case 'linkedin': return <LinkedInOptimizer {...props} />;
            default: return null;
        }
    };
    
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><ToolboxIcon /> AI Toolbox</h1>
                <p className="text-slate-400 mt-1">Your suite of AI-powered tools for professional communication and career growth.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tools.map(tool => (
                    <Card 
                        key={tool.id} 
                        onClick={() => {
                            setActiveTool(tool.id);
                            setResult(''); // Clear result when switching tools
                        }}
                        className={`text-center cursor-pointer ${activeTool === tool.id ? 'border-teal-500' : ''}`}
                    >
                        <h2 className="text-xl font-bold text-slate-100">{tool.name}</h2>
                        <p className="text-sm text-slate-400 mt-2">{tool.description}</p>
                    </Card>
                ))}
            </div>

            {activeTool && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-2xl font-bold text-teal-300">{tools.find(t => t.id === activeTool)?.name}</h2>
                         <button onClick={() => { setActiveTool(null); setResult(''); }} className="text-2xl text-slate-400 hover:text-white">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            {renderTool()}
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 min-h-[200px]">
                            <h3 className="font-semibold text-slate-300 mb-2">Result:</h3>
                            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans">
                                {result || "Your AI-generated content will appear here..."}
                            </pre>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AiToolbox;