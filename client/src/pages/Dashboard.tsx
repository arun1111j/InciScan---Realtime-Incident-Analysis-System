import { useEffect, useState } from 'react';
import { BadgeAlert, Users, Activity, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import IncidentModal from '../components/IncidentModal';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface Incident {
    id: number;
    type: string;
    severity: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    status: string;
    description?: string;
    confidence?: number;
    camera_id?: string;
}

interface Stats {
    total: number;
    critical: number;
    resolved: number;
    active: number;
}

const Dashboard = () => {
    const [stats, setStats] = useState<Stats>({
        total: 12,
        critical: 3,
        resolved: 8,
        active: 4
    });

    const [recentIncidents, setRecentIncidents] = useState<Incident[]>([
        { id: 1, type: 'Crowd Hazard', severity: 'High', latitude: 40.7128, longitude: -74.0060, timestamp: '2 mins ago', status: 'Active' },
        { id: 2, type: 'Theft', severity: 'Medium', latitude: 40.7328, longitude: -74.0160, timestamp: '15 mins ago', status: 'Investigation' },
        { id: 3, type: 'Violence Detected', severity: 'Critical', latitude: 40.7228, longitude: -74.0010, timestamp: '32 mins ago', status: 'Resolved' },
    ]);

    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'feed'>('map');

    // Chart Data (Mock for now, could be derived from stats/history)
    const chartData = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
        datasets: [
            {
                label: 'Activity Level',
                data: [12, 19, 3, 5, 2, 3, stats.active + stats.critical],
                fill: true,
                backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red-500
                borderColor: 'rgba(239, 68, 68, 0.8)',
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#9ca3af',
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#9ca3af',
                }
            }
        }
    };

    useEffect(() => {
        // Fetch initial data
        fetch('http://localhost:5000/api/incidents')
            .then(res => res.json())
            .then(data => {
                // Ensure data is array (fallback if error)
                if (Array.isArray(data)) {
                    setRecentIncidents(data);
                    // Recalculate stats based on real data
                    const active = data.filter((i: Incident) => i.status !== 'resolved').length;
                    const critical = data.filter((i: Incident) => i.severity === 'critical').length;
                    const resolved = data.filter((i: Incident) => i.status === 'resolved').length;

                    setStats({
                        total: data.length,
                        active,
                        critical,
                        resolved
                    });
                }
            })
            .catch(err => console.error('Failed to fetch incidents:', err));

        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            console.log('Connected to InciScan socket server');
        });

        socket.on('new_incident', (incident: any) => {
            console.log('New Incident received:', incident);
            // Construct full object to be safe
            const newInc: Incident = {
                id: incident.id,
                type: incident.type,
                severity: incident.severity,
                latitude: incident.latitude,
                longitude: incident.longitude,
                timestamp: incident.timestamp || new Date().toISOString(),
                status: incident.status,
                description: incident.description,
                confidence: incident.confidence,
                camera_id: incident.camera_id
            };

            setRecentIncidents(prev => {
                const updated = [newInc, ...prev];
                // Update stats locally
                setStats(prevStats => ({
                    ...prevStats,
                    total: prevStats.total + 1,
                    active: prevStats.active + 1,
                    critical: newInc.severity === 'critical' ? prevStats.critical + 1 : prevStats.critical
                }));
                return updated.slice(0, 50); // Keep last 50
            });
        });

        socket.on('incident_updated', (updated: any) => {
            setRecentIncidents(prev => prev.map(inc =>
                inc.id === updated.id ? { ...inc, status: updated.status } : inc
            ));

            // Re-fetch stats or update locally (simplified local update)
            setStats(prevStats => ({
                ...prevStats,
                active: prevStats.active - 1,
                resolved: prevStats.resolved + 1
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            {/* Stats & Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats */}
                <div className="lg:col-span-1 space-y-4">
                    <StatCard title="Total Incidents" value={stats.total} icon={<Activity />} color="blue" />
                    <StatCard title="Critical Alerts" value={stats.critical} icon={<BadgeAlert />} color="red" />
                    <StatCard title="Active Crowds" value={stats.active} icon={<Users />} color="yellow" />
                    <StatCard title="Resolved" value={stats.resolved} icon={<MapPin />} color="green" />
                </div>

                {/* Chart */}
                <div className="lg:col-span-3 bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">Incident Activity Trend</h3>
                        <select className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                            <option>Last 24 Hours</option>
                            <option>Last 7 Days</option>
                        </select>
                    </div>
                    <div className="h-[250px] w-full">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map Placeholder */}

                {/* Map Section */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[500px] relative">
                    <div className="absolute top-4 left-4 z-[400] bg-gray-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-gray-300 pointer-events-none">
                        LIVE SYSTEM FEED
                    </div>

                    {/* Toggle / View Switcher (Simple Implementation) */}
                    <div className="absolute top-4 right-4 z-[400] flex space-x-2 items-center">
                        {viewMode === 'feed' && (
                            <div className="flex space-x-2 mr-4">
                                <button
                                    onClick={() => fetch('http://localhost:8000/start_feed', { method: 'POST' }).catch(console.error)}
                                    className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                                >
                                    Start Feed
                                </button>
                                <button
                                    onClick={() => fetch('http://localhost:8000/stop_feed', { method: 'POST' }).catch(console.error)}
                                    className="px-3 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-700"
                                >
                                    Stop Feed
                                </button>
                            </div>
                        )}

                        <button onClick={() => setViewMode('map')} className={`px-3 py-1 text-xs rounded ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Map</button>
                        <button onClick={() => setViewMode('feed')} className={`px-3 py-1 text-xs rounded ${viewMode === 'feed' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Live Camera</button>
                    </div>

                    {viewMode === 'map' ? (
                        <MapContainer
                            center={[40.7128, -74.0060]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            {recentIncidents.map((incident) => (
                                <Marker
                                    key={incident.id}
                                    position={[incident.latitude, incident.longitude]}
                                    eventHandlers={{
                                        click: () => setSelectedIncident(incident)
                                    }}
                                >
                                    <Popup>
                                        <div className="p-1 cursor-pointer" onClick={() => setSelectedIncident(incident)}>
                                            <h3 className="font-bold text-sm">{incident.type}</h3>
                                            <p className="text-xs text-gray-600">{incident.severity} Severity</p>
                                            <p className="text-xs text-blue-500 font-semibold mt-1">Click for details</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            {/* Live ML Feed */}
                            <img
                                src="http://localhost:8000/video_feed?source=0"
                                alt="Live Feed"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    console.log("Video Stream Offline");
                                }}
                            />
                            <div className="absolute bottom-4 left-4 text-white bg-black/50 px-2 py-1 rounded text-xs">
                                Source: Camera 01 (Webcam)
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Recent Alerts */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="font-semibold text-lg">Recent Alerts</h2>
                        <span className="text-xs text-red-400 animate-pulse">● Live Updates</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {recentIncidents.map((incident) => (
                            <div
                                key={incident.id}
                                onClick={() => setSelectedIncident(incident)}
                                className="p-3 bg-gray-700/50 rounded-lg border-l-4 border-red-500 hover:bg-gray-700 transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">{incident.type}</h3>
                                    <span className="text-xs text-gray-400">{incident.timestamp}</span>
                                </div>
                                <div className="mt-1 flex justify-between items-center text-sm">
                                    <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(incident.severity)}`}>
                                        {incident.severity}
                                    </span>
                                    <span className="text-gray-400 text-xs">ID: #{incident.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <IncidentModal
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onResolve={async (id) => {
                    console.log('Resolving incident:', id);
                    try {
                        const response = await fetch(`http://localhost:5000/api/incidents/${id}/resolve`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            throw new Error('Failed to resolve');
                        }

                        // Socket will handle the UI update via 'incident_updated' event
                    } catch (error) {
                        console.error('Failed to resolve:', error);
                    }
                    setSelectedIncident(null);
                }}
            />
        </div>
    );
};

const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
        case 'critical': return 'bg-red-500/20 text-red-400';
        case 'high': return 'bg-orange-500/20 text-orange-400';
        case 'medium': return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-green-500/20 text-green-400';
    }
};

const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-500',
        red: 'bg-red-500/10 text-red-500',
        yellow: 'bg-yellow-500/10 text-yellow-500',
        green: 'bg-green-500/10 text-green-500',
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold mt-1 text-white">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color] || 'bg-gray-700 text-white'}`}>
                {icon}
            </div>
        </div>
    );
};

export default Dashboard;
