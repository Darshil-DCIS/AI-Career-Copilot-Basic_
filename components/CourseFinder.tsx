import React, { useState, useEffect } from 'react';
import { findNearbyCourses } from '../services/geminiService';
import type { Course } from '../types';
import Card from './common/Card';
import { MapPinIcon } from './icons';

const CourseFinder: React.FC = () => {
    const [query, setQuery] = useState('Python for Data Science');
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setError(null);
            },
            (err) => {
                setError('Could not get your location. Please enable location services in your browser.');
                console.error(err);
            }
        );
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a topic to search for.');
            return;
        }
        if (!location) {
            setError('Location not available. Cannot search for nearby courses.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setCourses([]);
        setHasSearched(true);
        try {
            const results = await findNearbyCourses(query, location);
            setCourses(results);
        } catch (err) {
            setError('Failed to fetch courses. Please try again.');
            console.error(err);
        }
        setIsLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><MapPinIcon /> Nearby Course Finder</h1>
                <p className="text-slate-400 mt-1">Discover local workshops, bootcamps, and courses powered by Google Maps.</p>
            </header>

            <Card>
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="w-full">
                        <label htmlFor="courseQuery" className="block text-sm font-medium text-slate-300">Course Topic</label>
                        <input
                            id="courseQuery"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                             onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g., Advanced React, Intro to AI"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !location}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-600 transition-colors"
                    >
                        Search
                    </button>
                </div>
                 {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </Card>
            
            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Searching for courses near you...</p>
                </div>
            )}

            {!isLoading && courses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, index) => (
                        <Card key={index} className="flex flex-col hover:border-blue-500/50 transition-colors duration-300">
                            <h3 className="text-lg font-bold text-blue-300">{course.title}</h3>
                            <p className="text-sm text-slate-400 mt-2 flex-grow">{course.description}</p>
                            <a 
                                href={course.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                View on Map <MapPinIcon className="w-4 h-4"/>
                            </a>
                        </Card>
                    ))}
                </div>
            )}

             {!isLoading && hasSearched && courses.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                     <MapPinIcon className="w-16 h-16 mx-auto text-slate-600" />
                    <h3 className="text-xl font-semibold mt-4">No Courses Found</h3>
                    <p>Try searching with a different or broader topic.</p>
                </div>
             )}

             {!isLoading && !hasSearched && !error && (
                <div className="text-center py-16 text-slate-500">
                    <p>Enter a topic and click search to find courses in your area.</p>
                </div>
             )}

        </div>
    );
};

export default CourseFinder;