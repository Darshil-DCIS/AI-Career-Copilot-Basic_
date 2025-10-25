import React, { useState, useEffect } from 'react';
import type { JobPosting, UserProfile, TrackedJob, TrackedJobStatus } from '../types';
import { findJobs } from '../services/geminiService';
import Card from './common/Card';
import { BriefcaseIcon, PlusIcon } from './icons';

interface JobFinderProps {
  user: UserProfile;
  onTrackJob: (job: JobPosting) => void;
  onUpdateTrackedJobStatus: (jobUrl: string, status: TrackedJobStatus) => void;
}

const KANBAN_COLUMNS: TrackedJobStatus[] = ['Applied', 'Interviewing', 'Offered', 'Rejected', 'Tentative'];

const JobCard: React.FC<{ job: TrackedJob, onDragStart: (e: React.DragEvent<HTMLDivElement>, jobUrl: string) => void }> = ({ job, onDragStart }) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, job.url)}
        className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 cursor-grab active:cursor-grabbing min-h-[4rem]"
    >
        <p className="font-bold text-slate-100 text-sm leading-tight">{job.title}</p>
        <p className="text-xs text-slate-400 mt-1 truncate">{job.company}</p>
    </div>
);

const KanbanColumn: React.FC<{ 
    status: TrackedJobStatus, 
    jobs: TrackedJob[], 
    onDragStart: (e: React.DragEvent<HTMLDivElement>, jobUrl: string) => void,
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: TrackedJobStatus) => void,
}> = ({ status, jobs, onDragStart, onDrop }) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        setIsOver(false);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        onDrop(e, status);
        setIsOver(false);
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-64 flex-shrink-0 bg-slate-900/50 p-3 rounded-xl transition-colors ${isOver ? 'bg-slate-700/50' : ''}`}
        >
            <h3 className="font-semibold text-center text-slate-300 mb-3">{status} ({jobs.length})</h3>
            <div className="space-y-2 h-64 overflow-y-auto px-1">
                {jobs.map(job => <JobCard key={job.url} job={job} onDragStart={onDragStart} />)}
            </div>
        </div>
    );
};

const AddJobModal: React.FC<{ onClose: () => void, onAddJob: (job: JobPosting) => void }> = ({ onClose, onAddJob }) => {
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [location, setLocation] = useState('');
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!title || !company || !url) return;
        
        onAddJob({
            title,
            company,
            location,
            url,
            description: "Manually added job posting."
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <Card className="w-full max-w-md modal-content-animate" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add a Job</h2>
                    <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                        <input id="jobTitle" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                    </div>
                     <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-300 mb-1">Company</label>
                        <input id="company" type="text" value={company} onChange={e => setCompany(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                    </div>
                    <div>
                        <label htmlFor="jobUrl" className="block text-sm font-medium text-slate-300 mb-1">Job Posting URL</label>
                        <input id="jobUrl" type="url" value={url} onChange={e => setUrl(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                    </div>
                     <div>
                        <label htmlFor="jobLocation" className="block text-sm font-medium text-slate-300 mb-1">Location (Optional)</label>
                        <input id="jobLocation" type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                    </div>
                    <button type="submit" className="w-full px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors">Add Job</button>
                </form>
            </Card>
        </div>
    );
};


const JobFinder: React.FC<JobFinderProps> = ({ user, onTrackJob, onUpdateTrackedJobStatus }) => {
    const [roleQuery, setRoleQuery] = useState(user.targetRole);
    const [locationQuery, setLocationQuery] = useState('');
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [showAddJobModal, setShowAddJobModal] = useState(false);

    const handleSearch = async () => {
        if (!roleQuery.trim()) {
            setError('Please enter a role to search for.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setJobs([]);
        setHasSearched(true);

        try {
            const results = await findJobs(roleQuery, locationQuery);
            setJobs(results);
        } catch (err) {
            setError('Failed to fetch job postings. Please try again later.');
            console.error(err);
        }
        setIsLoading(false);
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobUrl: string) => {
        e.dataTransfer.setData("jobUrl", jobUrl);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TrackedJobStatus) => {
        const jobUrl = e.dataTransfer.getData("jobUrl");
        if(jobUrl) {
            onUpdateTrackedJobStatus(jobUrl, newStatus);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><BriefcaseIcon /> Job Finder</h1>
                <p className="text-slate-400 mt-1">Discover opportunities and track your application progress.</p>
            </header>

            <Card>
                <h2 className="text-xl font-bold mb-4">Search for Jobs</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="roleQuery" className="block text-sm font-medium text-slate-300 mb-1">Job Role</label>
                            <input
                                id="roleQuery"
                                type="text"
                                value={roleQuery}
                                onChange={(e) => setRoleQuery(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="locationQuery" className="block text-sm font-medium text-slate-300 mb-1">Location (Optional)</label>
                            <input
                                id="locationQuery"
                                type="text"
                                value={locationQuery}
                                onChange={(e) => setLocationQuery(e.target.value)}
                                placeholder="e.g., San Francisco, CA or Remote"
                                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors"
                    >
                       {isLoading ? 'Searching...' : 'Find Jobs'}
                    </button>
                 </div>
                 {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </Card>

            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Scanning job boards for you...</p>
                </div>
            )}
            
            {hasSearched && !isLoading && (
                <div>
                    {jobs.length > 0 ? (
                        <div className="space-y-4">
                            {jobs.map((job, index) => (
                                <Card key={index} className="hover:border-cyan-500/50 transition-colors duration-300">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-cyan-300">{job.title}</h3>
                                            <p className="text-slate-200 font-semibold">{job.company}</p>
                                            <p className="text-sm text-slate-400">{job.location}</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => onTrackJob(job)} className="px-3 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"><PlusIcon className="w-4 h-4"/></button>
                                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                                                Apply
                                            </a>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-3 pt-3 border-t border-slate-700/60">{job.description}</p>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 text-slate-400">
                             <BriefcaseIcon className="w-16 h-16 mx-auto text-slate-600" />
                            <h3 className="text-xl font-semibold mt-4">No Jobs Found</h3>
                            <p>Try broadening your search terms or checking back later.</p>
                        </div>
                    )}
                </div>
            )}

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">My Job Search Board</h2>
                    <button onClick={() => setShowAddJobModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                        <PlusIcon className="w-4 h-4" /> Add Job
                    </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {KANBAN_COLUMNS.map(status => (
                        <KanbanColumn 
                            key={status}
                            status={status}
                            jobs={(user.trackedJobs || []).filter(j => j.status === status)}
                            onDragStart={handleDragStart}
                            onDrop={handleDrop}
                        />
                    ))}
                </div>
            </Card>

            {showAddJobModal && <AddJobModal onClose={() => setShowAddJobModal(false)} onAddJob={onTrackJob} />}
        </div>
    );
};

export default JobFinder;