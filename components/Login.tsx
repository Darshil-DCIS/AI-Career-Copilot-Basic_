import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SparklesIcon } from './icons';

const Login: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showResend, setShowResend] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        setShowResend(false);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (error) throw error;
                // If signUp is successful and email confirmation is required, `data.session` will be null.
                // If email confirmation is disabled, a session will be returned and onAuthStateChange will handle navigation.
                if (!data.session) {
                    setMessage("Success! We've sent a confirmation link to your email. Please click it to activate your account.");
                    setShowResend(true);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // The onAuthStateChange listener in App.tsx will handle the redirect.
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (!email) {
            setError("Please enter your email address to resend confirmation.");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (error) throw error;
            setMessage("Confirmation email sent again. Please check your inbox (and spam folder).");
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <div className="w-full max-w-sm mx-auto text-center">
                <div className="inline-block p-4 bg-slate-800/80 border border-slate-700 rounded-full mb-6">
                    <SparklesIcon className="w-12 h-12 text-teal-400" />
                </div>
                <h1 className="text-4xl font-bold text-white">AI Career Copilot</h1>
                <p className="text-slate-400 mt-3 text-lg">Your personalized career journey awaits.</p>

                <div className="mt-8 bg-slate-800/60 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-lg p-8">
                    <form onSubmit={handleLogin}>
                        {isSignUp && (
                            <div className="mb-4">
                                <label htmlFor="fullName" className="text-left block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="text-left block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="password"className="text-left block text-sm font-medium text-slate-300 mb-1">Password</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
                        {message && (
                            <div className="text-cyan-300 text-sm mt-4 text-left p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
                                <p>{message}</p>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full mt-6 px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
                            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </button>
                    </form>

                    {showResend && (
                        <div className="mt-4">
                            <button onClick={handleResendConfirmation} disabled={loading} className="text-sm font-semibold text-teal-400 hover:text-teal-300 disabled:opacity-50">
                                Didn't receive an email? Resend confirmation
                            </button>
                        </div>
                    )}

                     <p className="text-sm text-slate-400 mt-6">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); setShowResend(false); }} className="font-semibold text-teal-400 hover:text-teal-300 ml-2">
                           {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;