import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface OnboardingProps {
  onComplete: (interests: string, resume: string, targetRole: string, githubUrl: string, linkedinUrl: string) => void;
  isLoading: boolean;
}

const StepIndicator: React.FC<{step: number, currentStep: number}> = ({ step, currentStep }) => (
    <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${currentStep >= step ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            {step}
        </div>
    </div>
);


const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isLoading }) => {
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState('');
  const [targetRole, setTargetRole] = useState('Marketing Manager');
  const [resume, setResume] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onComplete(interests, resume, targetRole, githubUrl, linkedinUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
            <div className="inline-block p-3 bg-slate-800/80 border border-slate-700 rounded-full mb-4">
                 <SparklesIcon className="w-10 h-10 text-teal-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Welcome to AI Career Copilot</h1>
            <p className="text-slate-400 mt-2 text-lg">Let's set up your profile and craft your personalized career path.</p>
        </div>
        
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-lg p-8">
            <div className="flex justify-center items-center gap-4 mb-8">
                <StepIndicator step={1} currentStep={step} />
                <div className="flex-1 h-0.5 bg-slate-700">
                    <div className="h-full bg-cyan-600 transition-all duration-300" style={{ width: step === 1 ? '0%' : '100%' }}></div>
                </div>
                <StepIndicator step={2} currentStep={step} />
            </div>
            
            <form onSubmit={handleSubmit}>
                <div style={{ display: step === 1 ? 'block' : 'none' }}>
                    <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Step 1: Your Interests & Goals</h2>
                    <p className="text-slate-400 mb-6">What are you passionate about? What role are you aiming for?</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="targetRole" className="block text-sm font-medium text-slate-300 mb-1">What's your target job title?</label>
                            <input
                                id="targetRole"
                                type="text"
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                placeholder="e.g., Product Manager, UX Researcher, Financial Analyst"
                            />
                        </div>
                         <div>
                            <label htmlFor="interests" className="block text-sm font-medium text-slate-300 mb-1">List your professional interests (comma-separated).</label>
                            <input
                                id="interests"
                                type="text"
                                value={interests}
                                onChange={(e) => setInterests(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                placeholder="e.g., Sustainable Finance, Brand Strategy, Data Visualization"
                            />
                        </div>
                        <div>
                            <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300 mb-1">Portfolio/GitHub Link (Optional)</label>
                            <input
                                id="githubUrl"
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                placeholder="https://github.com/username or https://behance.net/username"
                            />
                        </div>
                         <div>
                            <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-300 mb-1">LinkedIn Profile (Optional)</label>
                            <input
                                id="linkedinUrl"
                                type="url"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                placeholder="https://linkedin.com/in/username"
                            />
                        </div>
                    </div>
                    <button type="button" onClick={() => setStep(2)} className="w-full mt-8 px-6 py-3 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors shadow-md">
                        Next Step
                    </button>
                </div>
                
                <div style={{ display: step === 2 ? 'block' : 'none' }}>
                     <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Step 2: Your Experience</h2>
                     <p className="text-slate-400 mb-6">Paste your resume or describe your projects and skills for the AI to analyze.</p>
                     
                     <textarea
                        rows={12}
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                        className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-3 mt-1 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        placeholder="Paste your resume here, or list your skills, projects, and work experience..."
                    />
                    <div className="flex gap-4 mt-8">
                        <button type="button" onClick={() => setStep(1)} className="w-full px-6 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                            Back
                        </button>
                        <button type="submit" disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                            <SparklesIcon />
                            {isLoading ? 'Building Your Profile...' : 'Generate My Career Plan'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;