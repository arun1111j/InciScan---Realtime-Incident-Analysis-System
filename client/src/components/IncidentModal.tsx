import { X, AlertTriangle, CheckCircle, Camera } from 'lucide-react';

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

interface IncidentModalProps {
    incident: Incident | null;
    onClose: () => void;
    onResolve: (id: number) => void;
}

const IncidentModal = ({ incident, onClose, onResolve }: IncidentModalProps) => {
    if (!incident) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${getSeverityBg(incident.severity)}`}>
                            <AlertTriangle className={`w-6 h-6 ${getSeverityColor(incident.severity)}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none">{incident.type}</h2>
                            <p className="text-sm text-gray-400 mt-1">ID: #{incident.id} • {incident.timestamp}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Confidence Score</p>
                            <p className="text-lg font-mono text-white mt-1">
                                {incident.confidence ? (incident.confidence * 100).toFixed(1) + '%' : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Camera Source</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Camera size={16} className="text-gray-400" />
                                <span className="text-lg font-mono text-white">{incident.camera_id || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Analysis Report</h3>
                        <p className="text-gray-400 text-sm leading-relaxed bg-gray-900/30 p-4 rounded-lg border border-gray-700/30">
                            {incident.description || "No detailed analysis available for this incident."}
                        </p>
                    </div>

                    {/* Location */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Location Data</h3>
                        <p className="text-gray-400 text-sm font-mono">
                            Lat: {incident.latitude.toFixed(6)}, Long: {incident.longitude.toFixed(6)}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-800/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                    {incident.status !== 'resolved' && (
                        <button
                            onClick={() => onResolve(incident.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <CheckCircle size={16} />
                            Mark Resolved
                        </button>
                    )}
                    {incident.status === 'resolved' && (
                        <button
                            disabled
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-900/30 text-green-500 flex items-center gap-2 cursor-not-allowed border border-green-900/50"
                        >
                            <CheckCircle size={16} />
                            Resolved
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for colors (duplicated from Dashboard for simplicity, or move to utils)
const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
        case 'critical': return 'text-red-400';
        case 'high': return 'text-orange-400';
        case 'medium': return 'text-yellow-400';
        default: return 'text-green-400';
    }
};

const getSeverityBg = (severity: string): string => {
    switch (severity.toLowerCase()) {
        case 'critical': return 'bg-red-500/20';
        case 'high': return 'bg-orange-500/20';
        case 'medium': return 'bg-yellow-500/20';
        default: return 'bg-green-500/20';
    }
};

export default IncidentModal;
