import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Activity, Lock, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            {/* Navbar */}
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                    <span className="text-xl font-bold tracking-wider">InciScan</span>
                </div>
                <div className="space-x-4">
                    {user ? (
                        <Link to="/dashboard" className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Sign In</Link>
                            <Link to="/signup" className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors">Sign Up</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <header className="container mx-auto px-6 py-20 text-center">
                <h1 className="text-5xl md:text-6xl font-bold mb-6">
                    Real-Time <span className="text-red-500">Incident Analysis</span><br />
                    Powered by AI
                </h1>
                <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                    Detect, Analyze, and Respond to security threats instantly with our advanced Machine Learning operation center.
                </p>
                <div className="flex justify-center space-x-4">
                    <Link to="/signup" className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-xl text-lg font-bold transition-transform transform hover:scale-105 shadow-lg shadow-red-500/20">
                        Get Started
                    </Link>
                    <Link to="/about" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-lg font-medium transition-colors">
                        Learn More
                    </Link>
                </div>
            </header>

            {/* Features (About) */}
            <section className="bg-gray-800/50 py-20">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <FeatureCard
                            icon={<Activity className="w-10 h-10 text-blue-400" />}
                            title="Real-Time Detection"
                            description="Instant identification of violence, crowds, and suspicious activities using live video feeds."
                        />
                        <FeatureCard
                            icon={<Globe className="w-10 h-10 text-green-400" />}
                            title="Global Mapping"
                            description="Visualize incidents on an interactive map with precise geolocation and severity tracking."
                        />
                        <FeatureCard
                            icon={<Lock className="w-10 h-10 text-purple-400" />}
                            title="Secure Intelligence"
                            description="Enterprise-grade security for your data with encrypted logs and audit trails."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="container mx-auto px-6 py-10 text-center text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} InciScan Systems. All rights reserved.
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-gray-600 transition-colors">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
);

export default Landing;
