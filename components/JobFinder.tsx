import React, { useState, useEffect } from 'react';
import type { JobPosting, UserProfile } from '../types';
import { findJobs } from '../services/geminiService';
import Card from './common/Card';
import { BriefcaseIcon } from './icons';

interface JobFinderProps {
  user: UserProfile;
}

const JobFinder: React.FC<JobFinderProps> = ({ user }) => {
    const [roleQuery, setRoleQuery] = useState(user.targetRole);
    const [locationQuery, setLocationQuery] = useState('');
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

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

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><BriefcaseIcon /> Job Finder</h1>
                <p className="text-slate-400 mt-1">Discover your next career opportunity.</p>
            </header>

            <Card>
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
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-cyan-300">{job.title}</h3>
                                            <p className="text-slate-200 font-semibold">{job.company}</p>
                                            <p className="text-sm text-slate-400">{job.location}</p>
                                        </div>
                                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0">
                                            Apply
                                        </a>
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
        </div>
    );
};

export default JobFinder;
