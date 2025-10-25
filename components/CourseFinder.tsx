import React, { useState, useEffect } from 'react';
import { findNearbyCourses, findOnlineCourses } from '../services/geminiService';
import type { Course } from '../types';
import Card from './common/Card';
import { MapPinIcon, SparklesIcon, StarIcon } from './icons';

type SearchType = 'local' | 'online';
type SortKey = 'rating' | 'title';

const CourseFinder: React.FC = () => {
    const [query, setQuery] = useState('Python for Data Science');
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchType, setSearchType] = useState<SearchType>('online');
    const [sortKey, setSortKey] = useState<SortKey>('rating');

    useEffect(() => {
        if (searchType === 'local') {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setError(null);
                },
                (err) => {
                    setError('Could not get your location. Please enable location services to search locally.');
                    console.error(err);
                }
            );
        }
    }, [searchType]);

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a topic to search for.');
            return;
        }
        if (searchType === 'local' && !location) {
            setError('Location not available. Cannot search for nearby courses.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setCourses([]);
        setHasSearched(true);
        try {
            const results = searchType === 'local' 
                ? await findNearbyCourses(query, location!)
                : await findOnlineCourses(query);
            setCourses(results);
        } catch (err) {
            setError('Failed to fetch courses. Please try again.');
            console.error(err);
        }
        setIsLoading(false);
    };
    
    const sortedCourses = [...courses].sort((a, b) => {
        if (sortKey === 'rating') {
            return (b.rating || 0) - (a.rating || 0);
        }
        return a.title.localeCompare(b.title);
    });

    const StarRating: React.FC<{rating?: number}> = ({ rating = 0 }) => (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 text-amber-400" filled={i < Math.round(rating)} />
            ))}
            <span className="text-xs text-slate-400 ml-1.5">({rating.toFixed(1)})</span>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><SparklesIcon className="w-6 h-6 text-teal-400"/> Course Finder</h1>
                <p className="text-slate-400 mt-1">Discover online and local courses to boost your skills.</p>
            </header>

            <Card>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                     <div className="flex-shrink-0 flex items-center gap-1 p-1 bg-slate-900/70 border border-slate-700 rounded-lg">
                        <button onClick={() => setSearchType('online')} className={`w-24 text-sm font-semibold py-1.5 rounded-md transition-colors ${searchType === 'online' ? 'bg-cyan-600' : 'hover:bg-slate-700'}`}>Online</button>
                        <button onClick={() => setSearchType('local')} className={`w-24 text-sm font-semibold py-1.5 rounded-md transition-colors ${searchType === 'local' ? 'bg-cyan-600' : 'hover:bg-slate-700'}`}>Local</button>
                    </div>
                    <div className="w-full flex-grow">
                        <input
                            id="courseQuery"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            placeholder="e.g., Advanced React, Intro to AI"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || (searchType === 'local' && !location)}
                        className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 transition-colors"
                    >
                        Search
                    </button>
                </div>
                 {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </Card>
            
            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Searching for courses...</p>
                </div>
            )}
            
            {!isLoading && hasSearched && (
                <div>
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-200">
                           {courses.length > 0 ? `Found ${courses.length} results` : 'No Courses Found'}
                        </h2>
                        {searchType === 'online' && courses.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-400">Sort by:</span>
                                <button onClick={() => setSortKey('rating')} className={`px-3 py-1 rounded-md ${sortKey === 'rating' ? 'bg-slate-700' : 'bg-slate-800'}`}>Rating</button>
                                <button onClick={() => setSortKey('title')} className={`px-3 py-1 rounded-md ${sortKey === 'title' ? 'bg-slate-700' : 'bg-slate-800'}`}>Title</button>
                            </div>
                        )}
                    </div>
                    {courses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedCourses.map((course, index) => (
                                <Card key={index} className="flex flex-col hover:border-cyan-500/50 transition-colors duration-300">
                                    <h3 className="text-lg font-bold text-cyan-300">{course.title}</h3>
                                    {course.rating && <div className="mt-2"><StarRating rating={course.rating}/></div>}
                                    <p className="text-sm text-slate-400 mt-2 flex-grow line-clamp-3">{course.description}</p>
                                    <a 
                                        href={course.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        {course.type === 'Local' ? 'View on Map' : 'Go to Course'} {course.type === 'Local' && <MapPinIcon className="w-4 h-4"/>}
                                    </a>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 text-slate-400">
                             <MapPinIcon className="w-16 h-16 mx-auto text-slate-600" />
                            <h3 className="text-xl font-semibold mt-4">No Courses Found</h3>
                            <p>Try searching with a different or broader topic.</p>
                        </div>
                    )}
                </div>
             )}

        </div>
    );
};

export default CourseFinder;
