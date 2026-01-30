import React, { useState } from 'react';
import { Play, Square, Upload, Download } from 'lucide-react';

const LiveFeeds = () => {
    const [isFeeding, setIsFeeding] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleStartFeed = async () => {
        try {
            await fetch('http://localhost:8000/start_feed', { method: 'POST' });
            setIsFeeding(true);
        } catch (error) {
            console.error('Failed to start feed:', error);
        }
    };

    const handleStopFeed = async () => {
        try {
            await fetch('http://localhost:8000/stop_feed', { method: 'POST' });
            setIsFeeding(false);
        } catch (error) {
            console.error('Failed to stop feed:', error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
            setAnalysisResult(null);
        }
    };

    const handleAnalyzeVideo = async () => {
        if (!uploadedFile) return;

        setProcessing(true);
        const formData = new FormData();
        formData.append('video', uploadedFile);

        try {
            const response = await fetch('http://localhost:8000/analyze_video', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            setAnalysisResult(result);
        } catch (error) {
            console.error('Video analysis failed:', error);
            alert('Failed to analyze video. Make sure ML service is running.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Live Feed Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-white">Live Camera Feeds</h1>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleStartFeed}
                            disabled={isFeeding}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${isFeeding
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                        >
                            <Play className="w-4 h-4" />
                            <span>Start Feed</span>
                        </button>
                        <button
                            onClick={handleStopFeed}
                            disabled={!isFeeding}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${!isFeeding
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                        >
                            <Square className="w-4 h-4" />
                            <span>Stop Feed</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-96 relative group">
                        <img
                            src="http://localhost:8000/video_feed"
                            alt="Camera 1"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-sm">Main Gate</div>
                        {isFeeding && (
                            <div className="absolute top-4 right-4 bg-red-600 px-2 py-1 rounded text-white text-xs animate-pulse">LIVE</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Analysis Section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Video Analysis Tool</h2>
                <p className="text-gray-400 text-sm mb-4">
                    Upload a video to analyze for incidents (violence, crowds, suspicious activity).
                    The system will highlight detections with bounding boxes and provide a detailed report.
                </p>

                <div className="space-y-4">
                    {/* File Upload */}
                    <div className="flex items-center space-x-4">
                        <label className="flex-1">
                            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                                <div className="text-center">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-400">
                                        {uploadedFile ? uploadedFile.name : 'Click to upload video (MP4, AVI, MOV)'}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Analyze Button */}
                    {uploadedFile && (
                        <button
                            onClick={handleAnalyzeVideo}
                            disabled={processing}
                            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${processing
                                    ? 'bg-gray-600 text-gray-400 cursor-wait'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            <span>{processing ? 'Analyzing Video...' : 'Analyze Video'}</span>
                        </button>
                    )}

                    {/* Results */}
                    {analysisResult && (
                        <div className="mt-6 space-y-4">
                            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-3">Analysis Report</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Frames Processed:</span>
                                        <span className="text-white font-medium">{analysisResult.total_frames || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Detections Found:</span>
                                        <span className="text-white font-medium">{analysisResult.detections?.length || 0}</span>
                                    </div>
                                </div>

                                {analysisResult.detections && analysisResult.detections.length > 0 && (
                                    <div className="mt-4">
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
                            </div>

                            {analysisResult.output_video && (
                                <a
                                    href={`http://localhost:8000${analysisResult.output_video}`}
                                    download
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Annotated Video</span>
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveFeeds;
