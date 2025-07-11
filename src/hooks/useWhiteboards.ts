import { useState, useEffect } from 'react';
import { Whiteboard, WhiteboardTemplate } from '../types';
import { db } from '../services/database';

export function useWhiteboards() {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [templates, setTemplates] = useState<WhiteboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize templates
  useEffect(() => {
    const defaultTemplates: WhiteboardTemplate[] = [
      {
        id: 'concept-map',
        name: 'Concept Map',
        description: 'Visualize relationships between concepts and ideas',
        thumbnail: '/api/placeholder/300/200',
        content: {
          elements: [
            {
              id: '1',
              type: 'text',
              position: { x: 100, y: 100 },
              size: { width: 120, height: 60 },
              content: 'Main Concept',
              style: {
                color: '#000000',
                backgroundColor: '#e3f2fd',
                fontSize: 16
              },
              zIndex: 1
            },
            {
              id: '2',
              type: 'text',
              position: { x: 300, y: 50 },
              size: { width: 100, height: 50 },
              content: 'Sub-concept 1',
              style: {
                color: '#000000',
                backgroundColor: '#f3e5f5',
                fontSize: 14
              },
              zIndex: 1
            },
            {
              id: '3',
              type: 'text',
              position: { x: 300, y: 150 },
              size: { width: 100, height: 50 },
              content: 'Sub-concept 2',
              style: {
                color: '#000000',
                backgroundColor: '#f3e5f5',
                fontSize: 14
              },
              zIndex: 1
            }
          ],
          canvasSize: { width: 2000, height: 1500 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        }
      },
      {
        id: 'data-flow',
        name: 'Data Flow Diagram',
        description: 'Map data flow through systems and processes',
        thumbnail: '/api/placeholder/300/200',
        content: {
          elements: [
            {
              id: '1',
              type: 'shape',
              position: { x: 100, y: 100 },
              size: { width: 100, height: 100 },
              content: 'Process 1',
              style: {
                color: '#1976d2',
                backgroundColor: 'transparent',
                strokeWidth: 2
              },
              zIndex: 1
            },
            {
              id: '2',
              type: 'shape',
              position: { x: 300, y: 100 },
              size: { width: 100, height: 100 },
              content: 'Process 2',
              style: {
                color: '#1976d2',
                backgroundColor: 'transparent',
                strokeWidth: 2
              },
              zIndex: 1
            },
            {
              id: '3',
              type: 'arrow',
              position: { x: 200, y: 140 },
              size: { width: 100, height: 20 },
              content: '',
              style: {
                color: '#1976d2',
                backgroundColor: 'transparent',
                strokeWidth: 2
              },
              zIndex: 1
            }
          ],
          canvasSize: { width: 2000, height: 1500 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        }
      },
      {
        id: 'eisenhower-matrix',
        name: 'Eisenhower Matrix',
        description: 'Prioritize tasks by urgency and importance',
        thumbnail: '/api/placeholder/300/200',
        content: {
          elements: [
            {
              id: '1',
              type: 'shape',
              position: { x: 50, y: 50 },
              size: { width: 200, height: 150 },
              content: 'Urgent & Important\n(Do First)',
              style: {
                color: '#d32f2f',
                backgroundColor: '#ffebee',
                fontSize: 14
              },
              zIndex: 1
            },
            {
              id: '2',
              type: 'shape',
              position: { x: 250, y: 50 },
              size: { width: 200, height: 150 },
              content: 'Not Urgent & Important\n(Schedule)',
              style: {
                color: '#1976d2',
                backgroundColor: '#e3f2fd',
                fontSize: 14
              },
              zIndex: 1
            },
            {
              id: '3',
              type: 'shape',
              position: { x: 50, y: 200 },
              size: { width: 200, height: 150 },
              content: 'Urgent & Not Important\n(Delegate)',
              style: {
                color: '#f57c00',
                backgroundColor: '#fff3e0',
                fontSize: 14
              },
              zIndex: 1
            },
            {
              id: '4',
              type: 'shape',
              position: { x: 250, y: 200 },
              size: { width: 200, height: 150 },
              content: 'Not Urgent & Not Important\n(Eliminate)',
              style: {
                color: '#388e3c',
                backgroundColor: '#e8f5e8',
                fontSize: 14
              },
              zIndex: 1
            }
          ],
          canvasSize: { width: 2000, height: 1500 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        }
      }
    ];
    
    setTemplates(defaultTemplates);
  }, []);

  const fetchWhiteboards = async () => {
    try {
      const data = await db.getAllWhiteboards();
      setWhiteboards(data);
    } catch (error) {
      console.error('Error fetching whiteboards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhiteboards();
  }, []);

  const createWhiteboard = async (whiteboardData: Omit<Whiteboard, 'id' | 'createdAt' | 'updatedAt' | 'lastViewedAt' | 'createdBy'>) => {
    try {
      const newWhiteboard = await db.createWhiteboard({
        ...whiteboardData,
        isFavorite: false,
        createdBy: 'current-user' // Replace with actual user ID
      });
      setWhiteboards(prev => [...prev, newWhiteboard]);
      return newWhiteboard;
    } catch (error) {
      console.error('Error creating whiteboard:', error);
      throw error;
    }
  };

  const updateWhiteboard = async (whiteboard: Whiteboard) => {
    try {
      await db.updateWhiteboard(whiteboard);
      setWhiteboards(prev => prev.map(w => w.id === whiteboard.id ? whiteboard : w));
    } catch (error) {
      console.error('Error updating whiteboard:', error);
      throw error;
    }
  };

  const deleteWhiteboard = async (id: string) => {
    try {
      await db.deleteWhiteboard(id);
      setWhiteboards(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      throw error;
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const whiteboard = whiteboards.find(w => w.id === id);
      if (whiteboard) {
        const updated = { ...whiteboard, isFavorite: !whiteboard.isFavorite };
        await updateWhiteboard(updated);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  return {
    whiteboards,
    templates,
    loading,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    toggleFavorite,
    refetch: fetchWhiteboards
  };
}