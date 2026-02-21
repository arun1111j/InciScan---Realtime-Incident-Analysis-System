import React, { useState } from 'react';
import { X, Upload, Camera, MapPin, FileText, Loader } from 'lucide-react';

interface ReportIncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({ isOpen, onClose }) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [cameraSource, setCameraSource] = useState<string>('CCTV');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('video/')) {
                setVideoFile(file);
            } else {
                alert('Please upload a video file');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile) {
            alert('Please upload a video file');
            return;
        }

        setAnalyzing(true);

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('source', cameraSource);
        formData.append('location', location);
        formData.append('description', description);

        try {
            const response = await fetch('http://localhost:5000/api/incidents/report', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            setAnalysisResult(result);
        } catch (error) {
            console.error('Error reporting incident:', error);
            alert('Failed to analyze video. Make sure the server is running.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleClose = () => {
        setVideoFile(null);
        setAnalysisResult(null);
        setLocation('');
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Report Incident</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!analysisResult ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Video Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Upload Video Evidence
                                </label>
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                        ? 'border-red-500 bg-red-500/10'
                                        : 'border-gray-600 hover:border-gray-500'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    {videoFile ? (
                                        <div className="space-y-2">
                                            <FileText className="w-12 h-12 mx-auto text-green-500" />
                                            <p className="text-white font-medium">{videoFile.name}</p>
                                            <p className="text-sm text-gray-400">
                                                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setVideoFile(null)}
                                                className="text-sm text-red-400 hover:text-red-300"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-300 mb-2">
                                                Drag and drop video file here, or click to browse
                                            </p>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="video-upload"
                                            />
                                            <label
                                                htmlFor="video-upload"
                                                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-colors"
                                            >
                                                Choose File
                                            </label>
                                            <p className="text-xs text-gray-500 mt-2">
                                                MP4, AVI, MOV (Max 100MB)
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Camera Source */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <Camera className="w-4 h-4 inline mr-2" />
                                    Camera Source
                                </label>
                                <select
                                    value={cameraSource}
                                    onChange={(e) => setCameraSource(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                >
                                    <option value="CCTV">CCTV Camera</option>
                                    <option value="Drone">Drone Camera</option>
                                    <option value="Phone">Phone Camera</option>
                                    <option value="Body Camera">Body Camera</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-2" />
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., Main Gate, Building A"
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide additional details about the incident..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={analyzing || !videoFile}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        <span>Analyzing Video...</span>
                                    </>
                                ) : (
                                    <span>Analyze & Submit Report</span>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Analysis Results */
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                                <h3 className="text-green-400 font-semibold mb-2">✓ Incident Reported Successfully</h3>
                                <p className="text-gray-300 text-sm">
                                    Incident ID: #{analysisResult.incidentId}
                                </p>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-3">Analysis Report</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Frames:</span>
                                        <span className="text-white font-medium">{analysisResult.total_frames || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Detections Found:</span>
                                        <span className="text-white font-medium">{analysisResult.detections?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Incident Type:</span>
                                        <span className="text-white font-medium">{analysisResult.type || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Severity:</span>
                                        <span className={`font-medium ${analysisResult.severity === 'critical' ? 'text-red-400' :
                                            analysisResult.severity === 'high' ? 'text-orange-400' :
                                                'text-yellow-400'
                                            }`}>
                                            {analysisResult.severity || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {analysisResult.detections && analysisResult.detections.length > 0 && (
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    <h4 className="text-sm font-semibold text-white mb-2">Detected Incidents:</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {analysisResult.detections.map((det: any, idx: number) => (
                                            <div key={idx} className="bg-gray-800 p-2 rounded text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-red-400 font-medium">{det.type}</span>
                                                    <span className="text-gray-500">Frame {det.frame}</span>
                                                </div>
                                                <p className="text-gray-400 mt-1">{det.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Video Preview */}
                            {analysisResult.output_video && (
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                    <h3 className="text-lg font-semibold text-white mb-3">Analyzed Video Preview</h3>
                                    <video
                                        src={`http://localhost:8000${analysisResult.output_video}`}
                                        controls
                                        className="w-full rounded-lg"
                                        style={{ maxHeight: '300px' }}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            )}

                            {/* Download Button */}
                            {analysisResult.download_url && (
                                <a
                                    href={`http://localhost:8000${analysisResult.download_url}`}
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <Upload className="w-4 h-4 rotate-180" />
                                    <span>Download Annotated Video</span>
                                </a>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportIncidentModal;
