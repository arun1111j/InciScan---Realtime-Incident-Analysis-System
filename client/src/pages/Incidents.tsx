import React, { useEffect, useState } from 'react';

const Incidents = () => {
    const [incidents, setIncidents] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/incidents')
            .then(res => res.json())
            .then(data => setIncidents(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Incident History</h1>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Severity</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {incidents.map((incident) => (
                            <tr key={incident.id} className="hover:bg-gray-750">
                                <td className="px-6 py-4">#{incident.id}</td>
                                <td className="px-6 py-4 font-medium text-white">{incident.type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs ${incident.severity === 'critical' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                        {incident.severity}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(incident.timestamp).toLocaleTimeString()}</td>
                                <td className="px-6 py-4 capitalize">{incident.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Incidents;
