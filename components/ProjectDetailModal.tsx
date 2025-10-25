import React, { useState, useEffect } from 'react';
import type { UserProject, ProjectStep } from '../types';
import Card from './common/Card';
import { generateProjectPlan } from '../services/geminiService';
import { SparklesIcon } from './icons';

interface ProjectDetailModalProps {
  project: UserProject;
  onClose: () => void;
  onUpdateProject: (updatedProject: UserProject) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose, onUpdateProject }) => {
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [notes, setNotes] = useState(project.notes || '');

    useEffect(() => {
        setNotes(project.notes || '');
    }, [project.notes]);

    const handleGeneratePlan = async () => {
        setIsGeneratingPlan(true);
        const plan = await generateProjectPlan(project.title, project.description);
        onUpdateProject({ ...project, projectPlan: plan, notes });
        setIsGeneratingPlan(false);
    };
    
    const handleStepToggle = (index: number) => {
        if (!project.projectPlan) return;
        const newPlan = [...project.projectPlan];
        newPlan[index].completed = !newPlan[index].completed;
        onUpdateProject({ ...project, projectPlan: newPlan, notes });
    };

    const handleStatusChange = (status: UserProject['status']) => {
        onUpdateProject({ ...project, status, notes });
    };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto modal-content-animate"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-teal-300">{project.title}</h2>
                <div className="flex items-center gap-4 mt-1">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${project.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300' : project.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                        {project.difficulty}
                    </span>
                    <span className="text-amber-400 font-bold">{project.xp} XP</span>
                </div>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">&times;</button>
        </div>

        <p className="text-slate-300 mt-4">{project.description}</p>
        
        <div className="mt-6 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-200">Project Status</h3>
            <div className="flex items-center gap-1 p-1 bg-slate-900/60 rounded-lg border border-slate-700">
                {(['Not Started', 'In Progress', 'Completed'] as const).map(status => (
                    <button 
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${project.status === status ? 'bg-teal-600' : 'hover:bg-slate-700/50'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        <div className="mt-6">
            <h3 className="font-bold text-lg text-slate-200 mb-2">Project Journey</h3>
            {!project.projectPlan || project.projectPlan.length === 0 ? (
                <div className="text-center p-6 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 mb-4">Generate a step-by-step plan to tackle this project using AI.</p>
                    <button 
                        onClick={handleGeneratePlan}
                        disabled={isGeneratingPlan}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                       <SparklesIcon/> {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {project.projectPlan.map((step, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-md">
                           <input 
                                type="checkbox" 
                                checked={step.completed} 
                                onChange={() => handleStepToggle(index)}
                                className="mt-1.5 w-5 h-5 bg-slate-700 border-slate-600 rounded text-teal-500 focus:ring-teal-600"
                            />
                            <div>
                                <p className={`font-semibold ${step.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>{step.title}</p>
                                <p className="text-sm text-slate-400">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="mt-6">
            <h3 className="font-bold text-lg text-slate-200 mb-2">Project Notes</h3>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Add notes, ideas, or reflections here..."
            />
            <button 
                onClick={() => onUpdateProject({ ...project, notes })}
                className="mt-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
                Save Notes
            </button>
        </div>

      </Card>
    </div>
  );
};

export default ProjectDetailModal;