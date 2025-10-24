import React, { useState } from 'react';
import type { UserProfile, SkillGap } from '../types';
import Card from './common/Card';
import { UserIcon, PlusIcon, TrashIcon, PencilIcon } from './icons';

interface ProfileEditorProps {
    user: UserProfile;
    onUpdateProfile: (profileData: Partial<UserProfile>) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onUpdateProfile }) => {
    const [name, setName] = useState(user.name);
    const [targetRole, setTargetRole] = useState(user.targetRole);
    const [githubUrl, setGithubUrl] = useState(user.githubUrl || '');
    const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '');
    const [skills, setSkills] = useState<SkillGap[]>(user.skills || []);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');
        try {
            await onUpdateProfile({
                name,
                targetRole,
                githubUrl,
                linkedinUrl,
                skills
            });
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000); // Clear message after 3s
        } catch (error) {
            setMessage('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddSkill = () => {
        setSkills([...skills, { name: 'New Skill', proficiency: 'Beginner', category: 'General', isGap: true }]);
    };
    
    const handleRemoveSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    const handleSkillChange = (index: number, field: keyof SkillGap, value: string) => {
        const newSkills = [...skills];
        (newSkills[index] as any)[field] = value;
        setSkills(newSkills);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3"><UserIcon /> Your Profile</h1>
                <p className="text-slate-400 mt-2 text-lg">Keep your information up to date to get the best recommendations.</p>
            </header>
            <Card>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                    </div>
                     <div>
                        <label htmlFor="targetRole" className="block text-sm font-medium text-slate-300 mb-1">Target Role</label>
                        <input id="targetRole" type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                    </div>
                     <div>
                        <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300 mb-1">GitHub / Portfolio URL</label>
                        <input id="githubUrl" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="https://github.com/your-username"/>
                    </div>
                     <div>
                        <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-300 mb-1">LinkedIn URL</label>
                        <input id="linkedinUrl" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="https://linkedin.com/in/your-profile" />
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">My Skills</h3>
                        <div className="space-y-3">
                            {skills.map((skill, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                                    <input type="text" value={skill.name} onChange={(e) => handleSkillChange(index, 'name', e.target.value)} className="md:col-span-3 w-full bg-slate-800/70 border border-slate-600 rounded-md p-2 text-sm" placeholder="Skill Name" />
                                    <input type="text" value={skill.category} onChange={(e) => handleSkillChange(index, 'category', e.target.value)} className="md:col-span-2 w-full bg-slate-800/70 border border-slate-600 rounded-md p-2 text-sm" placeholder="Category" />
                                    <select value={skill.proficiency} onChange={(e) => handleSkillChange(index, 'proficiency', e.target.value)} className="md:col-span-2 w-full bg-slate-800/70 border border-slate-600 rounded-md p-2 text-sm">
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                        <option>Expert</option>
                                    </select>
                                    <button type="button" onClick={() => handleRemoveSkill(index)} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5 mx-auto"/></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={handleAddSkill} className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                            <PlusIcon className="w-4 h-4" /> Add Skill
                        </button>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                         <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {message && <p className="text-sm text-green-400">{message}</p>}
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ProfileEditor;
