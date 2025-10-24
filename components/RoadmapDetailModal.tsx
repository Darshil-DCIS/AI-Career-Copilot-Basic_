import React from 'react';
import type { RoadmapStep } from '../types';
import Card from './common/Card';

interface RoadmapDetailModalProps {
  roadmapStep: RoadmapStep;
  onClose: () => void;
}

const RoadmapDetailModal: React.FC<RoadmapDetailModalProps> = ({ roadmapStep, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content-animate"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-teal-300">{roadmapStep.title}</h2>
                <p className="text-slate-400 font-semibold">{roadmapStep.duration}</p>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">&times;</button>
        </div>

        <div className="mt-6 space-y-6">
            <div>
                <h3 className="font-bold text-lg text-slate-200 mb-2">Skills to Learn</h3>
                <div className="flex flex-wrap gap-2">
                    {roadmapStep.skillsToLearn.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm font-medium rounded-full">{skill}</span>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="font-bold text-lg text-slate-200 mb-2">Suggested Resources</h3>
                <ul className="space-y-2">
                    {roadmapStep.suggestedResources.map(res => (
                        <li key={res.name} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-md">
                           <span className="text-xs font-bold bg-slate-700 px-2 py-0.5 rounded">{res.type}</span>
                           <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-teal-300 transition-colors">
                                {res.name}
                           </a>
                        </li>
                    ))}
                </ul>
            </div>
             <div>
                <h3 className="font-bold text-lg text-slate-200 mb-2">Milestone Project</h3>
                <p className="text-slate-400 bg-slate-900/50 p-3 rounded-md">{roadmapStep.milestoneProject}</p>
            </div>
        </div>

      </Card>
    </div>
  );
};

export default RoadmapDetailModal;
