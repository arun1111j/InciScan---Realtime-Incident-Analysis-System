

interface AnalysisResult {
    type: string;
    severity: string;
    confidence: number;
    location?: { latitude: number; longitude: number };
}

export const analyzeIncident = (description: string, location?: { latitude: number; longitude: number }): AnalysisResult => {
    const lowerDesc = description.toLowerCase();

    // Default location if not provided (New York City Hall)
    const defaultLoc = location || { latitude: 40.7128, longitude: -74.006 };

    // Enhanced Keyword Matching
    if (lowerDesc.match(/theft|steal|snatch|robbery|burglary|loot/)) {
        return { type: 'Theft', severity: 'critical', confidence: 0.88, location: defaultLoc };
    }
    if (lowerDesc.match(/fight|hit|violence|punch|assault|attack|brawl|weapon|gun|knife/)) {
        return { type: 'Violence', severity: 'high', confidence: 0.92, location: defaultLoc };
    }
    if (lowerDesc.match(/fire|burn|smoke|flame|explosion|blast/)) {
        return { type: 'Fire', severity: 'critical', confidence: 0.99, location: defaultLoc };
    }
    if (lowerDesc.match(/crowd|people|gathering|protest|mob|riot/)) {
        return { type: 'Crowd', severity: 'medium', confidence: 0.75, location: defaultLoc };
    }
    if (lowerDesc.match(/accident|crash|collision/)) {
        return { type: 'Accident', severity: 'high', confidence: 0.85, location: defaultLoc };
    }

    // Default
    return { type: 'Suspicious Activity', severity: 'low', confidence: 0.60, location: defaultLoc };
};

