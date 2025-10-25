
import React, { useState } from 'react';
import type { UserProfile, SkillGap } from '../types';
import Card from './common/Card';
import { UserIcon, GithubIcon, LinkedInIcon, TrashIcon, PlusIcon } from './icons';

interface ProfileEditorProps {
    user: UserProfile;
    onUpdateProfile: (profileUpdate: Partial<UserProfile>) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onUpdateProfile }) => {
    const [name, setName] = useState(user.name);
    const [targetRole, setTargetRole] = useState(user.targetRole);
    const [githubUrl, setGithubUrl] = useState(user.githubUrl || '');
    const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '');
    const [skills, setSkills] = useState<SkillGap[]>(user.skills);
    
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillProficiency, setNewSkillProficiency] = useState<SkillGap['proficiency']>('Beginner');

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSkillProficiencyChange = (index: number, proficiency: SkillGap['proficiency']) => {
        const updatedSkills = [...skills];
        updatedSkills[index].proficiency = proficiency;
        setSkills(updatedSkills);
    };

    const handleDeleteSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    const handleAddSkill = () => {
        if (newSkillName.trim() && !skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
            const newSkill: SkillGap = {
                name: newSkillName.trim(),
                proficiency: newSkillProficiency,
                category: ['Custom'], // Default category
                isGap: false // Assume it's not a gap if manually added
            };
            setSkills([...skills, newSkill]);
            setNewSkillName('');
            setNewSkillProficiency('Beginner');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSuccessMessage('');
        const isRoleChanging = targetRole !== user.targetRole;

        try {
            await onUpdateProfile({
                name,
                targetRole,
                githubUrl,
                linkedinUrl,
                skills,
            });
            setSuccessMessage(isRoleChanging ? 'Profile saved! Your journey has been regenerated with your new role.' : 'Profile saved successfully!');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
             console.error("Failed to save profile:", error);
             setSuccessMessage('Error: Could not save profile.');
             setTimeout(() => setSuccessMessage(''), 5000);
        } finally {
            setIsSaving(false);
        }
    };
    
    const hasChanges = name !== user.name || 
                       targetRole !== user.targetRole || 
                       githubUrl !== (user.githubUrl || '') || 
                       linkedinUrl !== (user.linkedinUrl || '') ||
                       JSON.stringify(skills) !== JSON.stringify(user.skills);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><UserIcon /> Edit Profile</h1>
                <p className="text-slate-400 mt-1">Keep your career goals and personal information up to date.</p>
            </header>

            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                            </div>
                            <div>
                                <label htmlFor="targetRole" className="block text-sm font-medium text-slate-300 mb-1">Target Role</label>
                                <input id="targetRole" type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                                <p className="text-xs text-slate-500 mt-1">Warning: Changing this will regenerate your roadmap and projects.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300 mb-1">GitHub URL</label>
                                <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><GithubIcon className="w-5 h-5 text-slate-400"/></span><input id="githubUrl" type="url" value={githubUrl} placeholder="https://github.com/username" onChange={(e) => setGithubUrl(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 pl-10 focus:ring-2 focus:ring-teal-500 focus:outline-none" /></div>
                            </div>
                            <div>
                                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-300 mb-1">LinkedIn URL</label>
                                <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><LinkedInIcon className="w-5 h-5 text-slate-400"/></span><input id="linkedinUrl" type="url" value={linkedinUrl} placeholder="https://linkedin.com/in/username" onChange={(e) => setLinkedinUrl(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 pl-10 focus:ring-2 focus:ring-teal-500 focus:outline-none" /></div>
                            </div>
                        </div>
                    </div>
                </Card>
                
                <Card className="mt-8">
                    <h3 className="text-xl font-bold text-slate-100 mb-4">Manage Skills</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {skills.map((skill, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                                <span className="flex-grow font-medium text-slate-200">{skill.name}</span>
                                <select value={skill.proficiency} onChange={(e) => handleSkillProficiencyChange(index, e.target.value as SkillGap['proficiency'])} className="bg-slate-700 border-slate-600 rounded-md p-1.5 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none">
                                    <option>Beginner</option>
                                    <option>Intermediate</option>
                                    <option>Advanced</option>
                                    <option>Expert</option>
                                </select>
                                <button type="button" onClick={() => handleDeleteSkill(index)} className="p-2 text-slate-400 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="font-semibold text-slate-200 mb-2">Add New Skill</h4>
                        <div className="flex items-center gap-2">
                            <input type="text" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="Skill name (e.g., Python)" className="flex-grow bg-slate-900/70 border border-slate-700 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                            <select value={newSkillProficiency} onChange={e => setNewSkillProficiency(e.target.value as SkillGap['proficiency'])} className="bg-slate-700 border-slate-600 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none">
                                <option>Beginner</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                                <option>Expert</option>
                            </select>
                            <button type="button" onClick={handleAddSkill} className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-md"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </Card>

                <div className="mt-8 text-right">
                    {successMessage && <p className="text-green-400 text-sm mb-3 text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">{successMessage}</p>}
                    <button type="submit" disabled={!hasChanges || isSaving} className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileEditor;
