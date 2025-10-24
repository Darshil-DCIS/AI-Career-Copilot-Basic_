import React, { useState } from 'react';
import { getResumeFeedback } from '../services/geminiService';
import type { ResumeFeedback as ResumeFeedbackType } from '../types';
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


const ResumeFeedback: React.FC = () => {
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
        <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><ResumeIcon /> Resume Feedback</h1>
                <p className="text-slate-400 mt-1">Get instant, AI-powered feedback to improve your resume.</p>
            </header>

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
                        <p className={`text-7xl font-bold ${scoreColor(feedback.overallScore/10)}`}>{feedback.overallScore}<span className="text-3xl text-slate-400">/100</span></p>
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

        </div>
    );
};

export default ResumeFeedback;