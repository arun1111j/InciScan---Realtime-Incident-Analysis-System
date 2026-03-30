import React, { useState } from 'react';
import { Play, Square, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LiveFeeds = () => {
    const [isFeeding, setIsFeeding] = useState(false);
    const [detectorType, setDetectorType] = useState('crowd');

    const handleStartFeed = async () => {
        try {
            await fetch(`/ml/start_feed?type=${detectorType}`, {
                method: 'POST'
            });
            setIsFeeding(true);
        } catch (error) {
            console.error('Failed to start feed:', error);
        }
    };

    const handleStopFeed = async () => {
        try {
            await fetch('/ml/stop_feed', { method: 'POST' });
            setIsFeeding(false);
        } catch (error) {
            console.error('Failed to stop feed:', error);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const response = await fetch('/ml/session_report');
            const data = await response.json();

            let dbIncidentId = 'N/A';
            let savedToDb = false;

            if (data.detections && data.detections.length > 0) {
                try {
                    const types = data.detections.map((d: any) => d.type).filter(Boolean);
                    const counts = types.reduce((acc: any, val: any) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
                    const mainType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, types[0] || 'Unknown');
                    
                    const confidences = data.detections.map((d: any) => d.confidence || 0);
                    const maxConfidence = confidences.length > 0 ? Math.max(...confidences) : 1.0;
                    const calculatedSeverity = maxConfidence > 0.8 ? 'critical' : (maxConfidence > 0.6 ? 'high' : 'medium');

                    const dbRes = await fetch('/api/incidents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            description: `Aggregated Session Report: ${data.detections.length} detections recorded. Primary type: ${mainType}.`,
                            latitude: 40.7128,
                            longitude: -74.006,
                            camera_id: 'Main Gate',
                            type: mainType,
                            severity: calculatedSeverity,
                            confidence: maxConfidence
                        })
                    });

                    if (dbRes.ok) {
                        const newIncident = await dbRes.json();
                        dbIncidentId = newIncident.id;
                        savedToDb = true;
                    }
                } catch (dbError) {
                    console.error("Failed to persist session incident to DB:", dbError);
                }
            }

            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text('Live Feed Incident Report', 14, 22);

            doc.setFontSize(11);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Detector Type: ${detectorType}`, 14, 36);
            doc.text(`Camera Location: Main Gate`, 14, 42);
            
            if (savedToDb) {
                doc.setTextColor(220, 38, 38);
                doc.text(`Saved to Database - Incident ID: #${dbIncidentId}`, 14, 48);
                doc.setTextColor(0);
            } else {
                doc.text(`Status: Local Only (No incidents saved)`, 14, 48);
            }

            let startYforTable = 55;

            if (data.snapshot_url) {
                try {
                    const imgResponse = await fetch(data.snapshot_url);
                    const imgBlob = await imgResponse.blob();
                    
                    const base64data = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(imgBlob);
                    });

                    const imgWidth = 140;
                    const imgHeight = 105; 
                    const x = (210 - imgWidth) / 2; 
                    const y = 55;

                    doc.addImage(base64data, 'JPEG', x, y, imgWidth, imgHeight);
                    
                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text(`Incident Snapshot (${detectorType} - Main Gate)`, 210 / 2, y + imgHeight + 6, { align: 'center' });
                    doc.setTextColor(0);

                    startYforTable = y + imgHeight + 15;
                } catch (imgError) {
                    console.error("Failed to fetch/embed snapshot image:", imgError);
                }
            }

            const tableData = data.detections.map((d: any) => [
                d.timestamp || new Date().toLocaleString(),
                d.type || 'Detection',
                d.description || '',
                d.confidence ? `${(d.confidence * 100).toFixed(1)}%` : 'N/A'
            ]);

            autoTable(doc, {
                startY: startYforTable,
                head: [['Time', 'Incident Type', 'Description', 'Confidence']],
                body: tableData,
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [220, 38, 38] } // Red Theme
            });

            doc.save(`InciScan_Report_${Date.now()}.pdf`);
        } catch (error) {
            console.error('Failed to download report:', error);
            alert('Failed to fetch session report. Make sure ML service is running.');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Live Feed Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-white">Live Camera Feeds</h1>
                    <div className="flex space-x-2 items-center">
                        <select
                            value={detectorType}
                            onChange={(e) => setDetectorType(e.target.value)}
                            disabled={isFeeding}
                            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <option value="crowd">Crowd Detection</option>
                            <option value="violence">Violence Detection</option>
                            <option value="suspicious">Suspicious Activity</option>
                            <option value="audio">Audio Analysis</option>
                            <option value="monitor">Monitor Mode (All Visual)</option>
                        </select>
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
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            title="Download session report"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Report (PDF)</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden h-96 relative group flex items-center justify-center">
                        {isFeeding ? (
                            <img
                                src={`/ml/video_feed?t=${Date.now()}`}
                                alt="Camera 1"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="text-center space-y-3">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto border border-gray-700">
                                    <Square className="w-8 h-8 text-gray-600" />
                                </div>
                                <p className="text-gray-500 font-medium">Feed Offline</p>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-sm">Main Gate</div>
                        {isFeeding && (
                            <div className="absolute top-4 right-4 bg-red-600 px-2 py-1 rounded text-white text-xs animate-pulse">LIVE</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveFeeds;
