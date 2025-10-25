import React, { useState, useEffect } from 'react';
import type { Trend, UserProfile, TrendType } from '../types';
import Card from './common/Card';
import { TrendingUpIcon, SparklesIcon } from './icons';

interface TrendWatcherProps {
  user: UserProfile;
  onUpdateTrends: () => Promise<void>;
}

const TrendWatcher: React.FC<TrendWatcherProps> = ({ user, onUpdateTrends }) => {
    const [trends, setTrends] = useState<Trend[]>(user.trends || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TrendType>('Current');

    const fetchTrends = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onUpdateTrends();
        } catch (err) {
            setError('Failed to fetch the latest trends. Please try again.');
            console.error(err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!user.trends || user.trends.length === 0) {
            fetchTrends();
        } else {
            setTrends(user.trends);
        }
    }, [user.trends]);

    const filteredTrends = trends.filter(t => t.type === activeTab);

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><TrendingUpIcon /> Trend Watcher</h1>
                <p className="text-slate-400 mt-1">Stay ahead of the curve with AI-powered insights for the <span className="font-semibold text-teal-300">{user.targetRole}</span> role.</p>
            </header>
            
            <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center items-center gap-2 p-1 bg-slate-800/70 border border-slate-700 rounded-lg">
                    <button onClick={() => setActiveTab('Current')} className={`w-32 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'Current' ? 'bg-cyan-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}>
                        Current Buzz
                    </button>
                    <button onClick={() => setActiveTab('Future')} className={`w-32 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'Future' ? 'bg-cyan-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}>
                        Future Forecast
                    </button>
                </div>
                <button
                    onClick={fetchTrends}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Analyzing...' : 'Refresh Trends'}
                </button>
                 {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </div>

            {isLoading && trends.length === 0 && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Analyzing the future of your career...</p>
                </div>
            )}

            {!isLoading && filteredTrends.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                     <TrendingUpIcon className="w-16 h-16 mx-auto text-slate-600" />
                    <h3 className="text-xl font-semibold mt-4">No Trends Found</h3>
                    <p>There was an issue fetching trends for this category. Please try refreshing.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                 {filteredTrends.map((trend, index) => (
                    <Card key={index} className="hover:border-teal-500/50 transition-colors duration-300">
                        <h3 className="text-xl font-bold text-teal-300 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> {trend.title}</h3>
                        <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">{trend.summary}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TrendWatcher;