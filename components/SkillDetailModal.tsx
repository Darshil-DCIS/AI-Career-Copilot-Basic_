import React from 'react';
import type { SkillGap, RoadmapStep, UserProject } from '../types';
import Card from './common/Card';
import { ProjectIcon } from './icons';

interface SkillDetailModalProps {
  skill: SkillGap;
  relatedRoadmapSteps: RoadmapStep[];
  relatedProjects: UserProject[];
  onClose: () => void;
}

const SkillDetailModal: React.FC<SkillDetailModalProps> = ({ skill, relatedRoadmapSteps, relatedProjects, onClose }) => {
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
                <h2 className="text-2xl font-bold text-teal-300">{skill.name}</h2>
                {/* FIX: Use .join() on the category array to render it as a string and avoid an arithmetic type error. */}
                <p className="text-slate-400 font-semibold">{(Array.isArray(skill.category) ? skill.category.join(' / ') : skill.category) || 'Uncategorized'} - {skill.proficiency}</p>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">&times;</button>
        </div>

        <div className="mt-6 space-y-6">
            
            {relatedRoadmapSteps.length > 0 && (
                <div>
                    <h3 className="font-bold text-lg text-slate-200 mb-2">Related Roadmap Steps</h3>
                    <ul className="space-y-2">
                        {relatedRoadmapSteps.map(step => (
                            <li key={step.title} className="p-3 bg-slate-900/50 rounded-md">
                               <p className="font-semibold text-slate-100">{step.title}</p>
                               <p className="text-sm text-slate-400">{step.milestoneProject}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {relatedProjects.length > 0 && (
                 <div>
                    <h3 className="font-bold text-lg text-slate-200 mb-2 flex items-center gap-2"><ProjectIcon className="w-5 h-5"/> Related Projects</h3>
                    <ul className="space-y-2">
                        {relatedProjects.map(project => (
                             <li key={project.title} className="p-3 bg-slate-900/50 rounded-md">
                               <p className="font-semibold text-slate-100">{project.title} <span className="text-xs font-normal text-slate-500">({project.difficulty})</span></p>
                               <p className="text-sm text-slate-400 line-clamp-1">{project.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {relatedRoadmapSteps.length === 0 && relatedProjects.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-slate-400">No projects or roadmap steps are directly associated with this skill yet.</p>
                </div>
            )}
            
        </div>
      </Card>
    </div>
  );
};

export default SkillDetailModal;