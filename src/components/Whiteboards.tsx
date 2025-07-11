import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  StarOff, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  Share,
  Grid,
  FileText,
  Calendar,
  MapPin,
  Filter
} from 'lucide-react';
import { useWhiteboards } from '../hooks/useWhiteboards';
import { WhiteboardEditor } from './WhiteboardEditor';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export function Whiteboards() {
  const { 
    whiteboards, 
    templates, 
    createWhiteboard, 
    updateWhiteboard, 
    deleteWhiteboard, 
    toggleFavorite,
    loading 
  } = useWhiteboards();
  
  const [currentView, setCurrentView] = useState<'management' | 'editor'>('management');
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'favorites' | 'recent' | 'mine'>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreateWhiteboard = async (templateId?: string) => {
    try {
      const template = templateId ? templates.find(t => t.id === templateId) : null;
      const newWhiteboard = await createWhiteboard({
        name: template ? `${template.name} - ${new Date().toLocaleDateString()}` : 'Untitled Whiteboard',
        location: 'My Whiteboards',
        template: templateId,
        content: template?.content || {
          elements: [],
          canvasSize: { width: 2000, height: 1500 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        }
      });
      
      setSelectedWhiteboard(newWhiteboard.id);
      setCurrentView('editor');
      setShowTemplates(false);
    } catch (error) {
      console.error('Error creating whiteboard:', error);
    }
  };

  const handleOpenWhiteboard = async (whiteboardId: string) => {
    setSelectedWhiteboard(whiteboardId);
    setCurrentView('editor');
    
    // Update last viewed timestamp
    const whiteboard = whiteboards.find(w => w.id === whiteboardId);
    if (whiteboard) {
      await updateWhiteboard({
        ...whiteboard,
        lastViewedAt: new Date()
      });
    }
  };

  const handleDeleteWhiteboard = async (whiteboardId: string) => {
    if (confirm('Are you sure you want to delete this whiteboard?')) {
      try {
        await deleteWhiteboard(whiteboardId);
      } catch (error) {
        console.error('Error deleting whiteboard:', error);
      }
    }
  };

  const filteredWhiteboards = whiteboards.filter(whiteboard => {
    const matchesSearch = !searchTerm || 
      whiteboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      whiteboard.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterBy === 'all' ||
      (filterBy === 'favorites' && whiteboard.isFavorite) ||
      (filterBy === 'recent' && new Date().getTime() - whiteboard.lastViewedAt.getTime() < 7 * 24 * 60 * 60 * 1000) ||
      (filterBy === 'mine' && whiteboard.createdBy === 'current-user'); // Replace with actual user ID
    
    return matchesSearch && matchesFilter;
  });

  const recentWhiteboards = whiteboards
    .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())
    .slice(0, 4);

  const favoriteWhiteboards = whiteboards.filter(w => w.isFavorite).slice(0, 4);

  if (currentView === 'editor' && selectedWhiteboard) {
    const whiteboard = whiteboards.find(w => w.id === selectedWhiteboard);
    if (whiteboard) {
      return (
        <WhiteboardEditor
          whiteboard={whiteboard}
          onSave={updateWhiteboard}
          onClose={() => {
            setCurrentView('management');
            setSelectedWhiteboard(null);
          }}
        />
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Whiteboards</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Grid size={20} />
            Templates
          </button>
          <button
            onClick={() => handleCreateWhiteboard()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            New Whiteboard
          </button>
        </div>
      </div>

      {/* Quick Access Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent</h3>
          <div className="space-y-3">
            {recentWhiteboards.map(whiteboard => (
              <div
                key={whiteboard.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOpenWhiteboard(whiteboard.id)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{whiteboard.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(whiteboard.lastViewedAt, 'MMM dd, yyyy')}
                  </p>
                </div>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
            ))}
            {recentWhiteboards.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent whiteboards</p>
            )}
          </div>
        </div>

        {/* Favorites */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Favorites</h3>
          <div className="space-y-3">
            {favoriteWhiteboards.map(whiteboard => (
              <div
                key={whiteboard.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOpenWhiteboard(whiteboard.id)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{whiteboard.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{whiteboard.location}</p>
                </div>
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              </div>
            ))}
            {favoriteWhiteboards.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No favorite whiteboards</p>
            )}
          </div>
        </div>

        {/* Created by Me */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Created by Me</h3>
          <div className="space-y-3">
            {whiteboards.filter(w => w.createdBy === 'current-user').slice(0, 4).map(whiteboard => (
              <div
                key={whiteboard.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOpenWhiteboard(whiteboard.id)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{whiteboard.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(whiteboard.createdAt, 'MMM dd, yyyy')}
                  </p>
                </div>
                <Edit className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search whiteboards..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Whiteboards</option>
                <option value="favorites">Favorites</option>
                <option value="recent">Recent</option>
                <option value="mine">Created by Me</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Whiteboards Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Viewed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredWhiteboards.map((whiteboard) => (
                <tr key={whiteboard.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {whiteboard.name}
                        </div>
                        {whiteboard.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-white">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      {whiteboard.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(whiteboard.updatedAt, 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(whiteboard.createdAt, 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(whiteboard.lastViewedAt, 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenWhiteboard(whiteboard.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Open Whiteboard"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleFavorite(whiteboard.id)}
                        className={clsx(
                          "hover:scale-110 transition-transform",
                          whiteboard.isFavorite 
                            ? "text-yellow-500" 
                            : "text-gray-400 hover:text-yellow-500"
                        )}
                        title={whiteboard.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        {whiteboard.isFavorite ? <Star size={16} className="fill-current" /> : <StarOff size={16} />}
                      </button>
                      <button
                        onClick={() => {/* TODO: Implement share */}}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        title="Share Whiteboard"
                      >
                        <Share size={16} />
                      </button>
                      <button
                        onClick={() => {/* TODO: Implement download */}}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                        title="Download Whiteboard"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteWhiteboard(whiteboard.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete Whiteboard"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose a Template</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCreateWhiteboard(template.id)}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <img 
                      src={template.thumbnail} 
                      alt={template.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-gray-400">
                      <Grid size={48} />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTemplates(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}