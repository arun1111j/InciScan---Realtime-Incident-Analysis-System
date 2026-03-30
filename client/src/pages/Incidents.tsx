import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Incidents = () => {
    const [incidents, setIncidents] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/incidents')
            .then(res => res.json())
            .then(data => setIncidents(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    }, []);

    const handleDownloadReport = () => {
        if (incidents.length === 0) {
            alert("No incidents to report.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Incident History Report', 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
        doc.text(`Total Incidents: ${incidents.length}`, 14, 38);

        const tableData = incidents.map((incident) => [
            `#${incident.id}`,
            incident.type,
            incident.severity,
            new Date(incident.timestamp).toLocaleString(),
            incident.status
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['ID', 'Type', 'Severity', 'Time', 'Status']],
            body: tableData,
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [220, 38, 38] } // Red Theme
        });

        doc.save(`InciScan_History_${Date.now()}.pdf`);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Incident History</h1>
                <button
                    onClick={handleDownloadReport}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Report</span>
                </button>
            </div>
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
