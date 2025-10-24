import React, { useState } from 'react';
import type { UserProfile, RoadmapStep, UserProject } from '../types';
import Card from './common/Card';
import { ProjectIcon, SparklesIcon, ReloadIcon } from './icons';
import RoadmapDetailModal from './RoadmapDetailModal';
import ProjectDetailModal from './ProjectDetailModal';

interface MyJourneyProps {
  user: UserProfile;
  onRoadmapToggle: (index: number) => void;
  onUpdateProject: (updatedProject: UserProject) => void;
  onRegenerateRoadmap: (prompt: string) => Promise<void>;
  onRegenerateProjects: (prompt: string) => Promise<void>;
}

const RoadmapItem: React.FC<{ item: RoadmapStep, index: number, onToggle: (index: number) => void, onSelect: () => void, isLast: boolean }> = ({ item, index, onToggle, onSelect, isLast }) => (
    <div className="flex items-start gap-4 group">
        <div className="flex flex-col items-center h-full">
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(index); }}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.completed ? 'bg-teal-600 border-teal-500' : 'bg-slate-700 border-slate-600 group-hover:border-teal-500'}`}
                aria-label={item.completed ? `Mark ${item.title} as incomplete` : `Mark ${item.title} as complete`}
            >
                {item.completed && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
            </button>
            {!isLast && <div className="w-0.5 flex-grow bg-slate-700 my-2 group-hover:bg-teal-800 transition-colors"></div>}
        </div>
        <div onClick={onSelect} className={`pt-0.5 transition-opacity cursor-pointer w-full ${item.completed ? 'opacity-60' : 'opacity-100'}`}>
            <p className={`font-semibold group-hover:text-teal-300 transition-colors ${item.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>{item.title} <span className="text-xs font-normal text-slate-400 ml-2">{item.duration}</span></p>
            <p className="text-sm text-slate-300 mt-1">{item.milestoneProject}</p>
        </div>
    </div>
);


const ProjectItem: React.FC<{ project: UserProject, onSelect: () => void }> = ({ project, onSelect }) => (
    <Card className="flex flex-col justify-between hover:border-teal-500/50 transition-colors duration-300 cursor-pointer" onClick={onSelect}>
        <div>
            <h4 className="font-bold text-lg text-slate-100">{project.title}</h4>
            <p className="text-sm text-slate-400 mt-1 mb-3 line-clamp-2">{project.description}</p>
        </div>
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-700/80">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${project.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300' : project.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                {project.difficulty}
            </span>
            <span className="text-sm font-semibold text-slate-300">View Journey &rarr;</span>
        </div>
    </Card>
);

const RefineInput: React.FC<{ onRefine: (prompt: string) => void, placeholder: string }> = ({ onRefine, placeholder }) => {
    const [prompt, setPrompt] = useState('');
    const handleRefine = () => {
        if (!prompt.trim()) return;
        onRefine(prompt);
        setPrompt('');
    };
    return (
        <div className="flex items-center gap-2 mt-1">
            <input 
                type="text" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
                placeholder={placeholder}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
            <button onClick={handleRefine} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><ReloadIcon className="w-5 h-5"/></button>
        </div>
    );
};

const MyJourney: React.FC<MyJourneyProps> = ({ user, onRoadmapToggle, onUpdateProject, onRegenerateRoadmap, onRegenerateProjects }) => {
    const [selectedRoadmapStep, setSelectedRoadmapStep] = useState<RoadmapStep | null>(null);
    const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-100">My Journey</h1>
                <p className="text-slate-400 mt-2 text-lg">This is your personalized path to becoming a <span className="font-semibold text-teal-300">{user.targetRole}</span>.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><SparklesIcon className="w-7 h-7 text-teal-400" /> AI-Generated Roadmap</h2>
                    <RefineInput onRefine={onRegenerateRoadmap} placeholder="e.g., focus more on backend skills..." />
                    <div className="mt-6 flex flex-col gap-2">
                        {(user.roadmap || []).map((item, index) => (
                            <RoadmapItem key={index} item={item} index={index} onToggle={onRoadmapToggle} isLast={index === (user.roadmap || []).length - 1} onSelect={() => setSelectedRoadmapStep(item)}/>
                        ))}
                         {(user.roadmap || []).length === 0 && <p className="text-center text-slate-400 py-4">No roadmap steps generated yet.</p>}
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100"><ProjectIcon /> Suggested Projects</h2>
                    <RefineInput onRefine={onRegenerateProjects} placeholder="e.g., suggest projects using React..." />
                    <div className="mt-4 space-y-4">
                        {(user.projects || []).map(p => (
                            <ProjectItem key={p.title} project={p} onSelect={() => setSelectedProject(p)} />
                        ))}
                         {(user.projects || []).length === 0 && <p className="text-center text-slate-400 py-4">No projects suggested yet.</p>}
                    </div>
                </Card>
            </div>
            
            {selectedRoadmapStep && (
                <RoadmapDetailModal roadmapStep={selectedRoadmapStep} onClose={() => setSelectedRoadmapStep(null)} />
            )}
            {selectedProject && (
                <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} onUpdateProject={onUpdateProject} />
            )}
        </div>
    );
};

export default MyJourney;
