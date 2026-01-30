import { Router } from 'express';
import prisma from '../lib/prisma';
import { analyzeIncident } from '../services/analysis';
import { io } from '../index';

const router = Router();

// GET all incidents
router.get('/', async (req, res) => {
    try {
        const incidents = await prisma.incident.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(incidents);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        // Return mock data if DB fails
        res.json([
            { id: 1, type: 'Crowd', severity: 'high', latitude: 40.7128, longitude: -74.006, status: 'verified', timestamp: new Date() },
            { id: 2, type: 'Theft', severity: 'critical', latitude: 40.7328, longitude: -74.016, status: 'pending', timestamp: new Date() },
        ]);
    }
});

// POST report incident
router.post('/', async (req, res) => {
    try {
        const { description, latitude, longitude, camera_id, type, severity, confidence } = req.body;

        // Use provided analysis (ML) or simulate (Manual)
        const analysis = (type && severity) ? { type, severity, confidence: confidence || 1.0 } : analyzeIncident(description || '');

        let incident;
        try {
            incident = await prisma.incident.create({
                data: {
                    description: description || '',
                    latitude: parseFloat(latitude) || 40.7128,
                    longitude: parseFloat(longitude) || -74.006,
                    camera_id: camera_id || 'MANUAL',
                    type: analysis.type,
                    severity: analysis.severity,
                    confidence: analysis.confidence,
                    status: 'verified',
                }
            });
        } catch (dbError) {
            console.warn('DB Create failed, using mock:', dbError);
            incident = {
                id: Date.now(),
                type: analysis.type,
                severity: analysis.severity,
                confidence: analysis.confidence,
                latitude: parseFloat(latitude) || 40.7128,
                longitude: parseFloat(longitude) || -74.006,
                status: 'verified',
                timestamp: new Date()
            };
        }

        // Emit real-time event
        io.emit('new_incident', incident);

        res.json(incident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// PATCH resolve incident
router.patch('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const incidentId = parseInt(id);

        let incident;
        try {
            incident = await prisma.incident.update({
                where: { id: incidentId },
                data: { status: 'resolved' }
            });
        } catch (dbError) {
            console.warn('DB Update failed, using mock:', dbError);
            // Return mock
            incident = { id: incidentId, status: 'resolved' };
        }

        io.emit('incident_updated', incident);
        res.json(incident);
    } catch (error) {
        console.error('Error resolving incident:', error);
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});

export default router;
