import React, { useState } from 'react';
import { getResumeFeedback, buildResume } from '../services/geminiService';
import type { ResumeFeedback as ResumeFeedbackType, UserProfile } from '../types';
import Card from './common/Card';
import { SparklesIcon, ResumeIcon } from './icons';
import ResumePreview from './ResumePreview';

const FeedbackSection: React.FC<{section: ResumeFeedbackType['feedbackSections'][0], scoreColor: (score: number) => string}> = ({ section, scoreColor }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-slate-800/70 border border-slate-700 rounded-lg overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <h3 className="text-lg font-semibold text-teal-300">{section.title}</h3>
                <div className="flex items-center gap-4">
                    <p className={`font-bold text-xl ${scoreColor(section.score)}`}>{section.score}/10</p>
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-700">
                    <p className="text-sm text-slate-300 mt-3">{section.feedback}</p>
                    <div className="mt-4">
                        <h4 className="font-semibold text-slate-200">Suggestions:</h4>
                        <ul className="list-disc list-inside mt-2 space-y-1.5 text-sm text-slate-400">
                            {section.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

const ResumeAnalyzer: React.FC = () => {
    const [resumeText, setResumeText] = useState('');
    const [targetRole, setTargetRole] = useState('Junior Software Engineer');
    const [feedback, setFeedback] = useState<ResumeFeedbackType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

    const handleSubmit = async () => {
        if (!resumeText.trim() || !targetRole.trim()) {
            setError('Please paste your resume and specify a target role.');
            return;
        }
        setIsLoading(true);
        setError('');
        setFeedback(null);
        try {
            const result = await getResumeFeedback(resumeText, targetRole);
            setFeedback(result);
        } catch (err) {
            setError('Failed to get feedback from AI. Please try again later.');
            console.error(err);
        }
        setIsLoading(false);
    };

    const scoreColor = (score: number) => {
        if (score >= 8) return 'text-green-400';
        if (score >= 5) return 'text-yellow-400';
        return 'text-red-400';
    }

    return (
        <>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="targetRole" className="block text-sm font-medium text-slate-300">Target Role</label>
                        <input
                            id="targetRole"
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 mt-1 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="e.g., AI/ML Engineer"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                             <label htmlFor="resumeText" className="block text-sm font-medium text-slate-300">Paste your resume here</label>
                             <div className="flex items-center gap-1 p-0.5 bg-slate-900/70 border border-slate-700 rounded-md">
                                <button onClick={() => setViewMode('editor')} className={`px-3 py-1 text-xs rounded ${viewMode === 'editor' ? 'bg-slate-700' : ''}`}>Editor</button>
                                <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-xs rounded ${viewMode === 'preview' ? 'bg-slate-700' : ''}`}>Preview</button>
                             </div>
                        </div>
                        {viewMode === 'editor' ? (
                            <textarea
                                id="resumeText"
                                rows={15}
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Paste your resume content. For best results, use plain text."
                            />
                        ) : (
                            <ResumePreview resumeText={resumeText} />
                        )}
                    </div>
                    <div className="md:col-span-2 text-center">
                         {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg"
                        >
                            <SparklesIcon />
                            {isLoading ? 'Analyzing...' : 'Get AI Feedback'}
                        </button>
                    </div>
                </div>
            </Card>

            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Our AI is scanning your resume... this might take a moment!</p>
                </div>
            )}
            
            {feedback && (
                <Card>
                    <h2 className="text-2xl font-bold mb-4 text-center">Your Feedback Report</h2>
                    <div className="text-center mb-8 bg-slate-900/50 p-6 rounded-xl">
                        <p className="text-slate-300 font-semibold text-lg">Overall Score</p>
                        <p className={`text-7xl font-bold ${scoreColor(feedback.overallScore)}`}>{feedback.overallScore}<span className="text-3xl text-slate-400">/100</span></p>
                        <p className="text-slate-300 mt-3 max-w-2xl mx-auto">{feedback.finalSummary}</p>
                    </div>
                    <div className="space-y-4">
                        {feedback.feedbackSections.map(section => (
                            <FeedbackSection key={section.title} section={section} scoreColor={scoreColor} />
                        ))}
                    </div>

                    {feedback.suggestedBullets && feedback.suggestedBullets.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-4 text-teal-300">
                                <SparklesIcon /> AI-Generated Bullet Points
                            </h3>
                            <div className="p-5 bg-slate-800/70 border border-slate-700 rounded-lg">
                                <p className="text-sm text-slate-400 mb-4">Use these as inspiration for your resume, tailored to the '{targetRole}' role:</p>
                                <ul className="list-disc list-inside space-y-2.5 text-slate-300">
                                    {feedback.suggestedBullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </>
    );
};

const ResumeBuilder: React.FC<{user: UserProfile}> = ({ user }) => {
    const [generatedResume, setGeneratedResume] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [includedSections, setIncludedSections] = useState({
        summary: true,
        skills: true,
        projects: true,
        experience: true,
    });

    const handleSectionToggle = (section: keyof typeof includedSections) => {
        setIncludedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        const resumeMarkdown = await buildResume(user, includedSections);
        setGeneratedResume(resumeMarkdown);
        setIsLoading(false);
    };

    const handleDownload = () => {
        const blob = new Blob([generatedResume], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${user.name.replace(' ', '_')}_Resume.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const SectionCheckbox: React.FC<{ label: string; checked: boolean; onChange: () => void; }> = ({ label, checked, onChange }) => (
        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-700/50">
            <input 
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-teal-500 focus:ring-teal-600 focus:ring-offset-slate-800"
            />
            <span className="text-sm font-medium text-slate-300">{label}</span>
        </label>
    );

    return (
        <Card>
            <p className="text-slate-400 mb-4 text-center">Auto-generate a professional resume using your profile data and completed projects.</p>
            
            <div className="max-w-md mx-auto mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-slate-200 mb-2 text-center">Select sections to include:</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <SectionCheckbox label="Professional Summary" checked={includedSections.summary} onChange={() => handleSectionToggle('summary')} />
                    <SectionCheckbox label="Skills" checked={includedSections.skills} onChange={() => handleSectionToggle('skills')} />
                    <SectionCheckbox label="Projects" checked={includedSections.projects} onChange={() => handleSectionToggle('projects')} />
                    <SectionCheckbox label="Experience (Placeholder)" checked={includedSections.experience} onChange={() => handleSectionToggle('experience')} />
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg"
                >
                    <SparklesIcon />
                    {isLoading ? 'Building...' : 'Generate My Resume'}
                </button>
            </div>

            {isLoading && (
                 <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Crafting your resume based on your journey...</p>
                </div>
            )}
            
            {generatedResume && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">Generated Resume</h3>
                        <button onClick={handleDownload} className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Download .md</button>
                    </div>
                     <textarea
                        rows={20}
                        value={generatedResume}
                        onChange={(e) => setGeneratedResume(e.target.value)}
                        className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono text-sm"
                    />
                </div>
            )}
        </Card>
    );
};


const ResumeFeedback: React.FC<{user: UserProfile}> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'analyzer' | 'builder'>('analyzer');

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><ResumeIcon /> Resume Tools</h1>
                <p className="text-slate-400 mt-1">Analyze an existing resume or build a new one from scratch.</p>
            </header>

            <div className="flex justify-center items-center gap-2 mb-4 p-1 bg-slate-800/70 border border-slate-700 rounded-lg shrink-0 max-w-sm mx-auto">
                <button 
                    onClick={() => setActiveTab('analyzer')} 
                    className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'analyzer' ? 'bg-cyan-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}
                >
                    Feedback Analyzer
                </button>
                <button 
                    onClick={() => setActiveTab('builder')} 
                    className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}
                >
                    AI Resume Builder
                </button>
            </div>

            {activeTab === 'analyzer' ? <ResumeAnalyzer /> : <ResumeBuilder user={user} />}
        </div>
    );
};

export default ResumeFeedback;