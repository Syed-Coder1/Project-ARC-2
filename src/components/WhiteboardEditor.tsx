import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MousePointer, 
  Hand, 
  Type, 
  Square, 
  Circle, 
  Triangle, 
  Pen, 
  ArrowRight, 
  StickyNote, 
  Image, 
  ZoomIn, 
  ZoomOut, 
  Share, 
  Star, 
  StarOff, 
  MoreHorizontal, 
  Save, 
  Download, 
  Undo, 
  Redo,
  X,
  Grid
} from 'lucide-react';
import { Whiteboard, WhiteboardElement } from '../types';
import { clsx } from 'clsx';

interface WhiteboardEditorProps {
  whiteboard: Whiteboard;
  onSave: (whiteboard: Whiteboard) => Promise<void>;
  onClose: () => void;
}

type Tool = 'cursor' | 'hand' | 'text' | 'rectangle' | 'circle' | 'triangle' | 'pen' | 'arrow' | 'sticky' | 'image';

export function WhiteboardEditor({ whiteboard, onSave, onClose }: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('cursor');
  const [elements, setElements] = useState<WhiteboardElement[]>(whiteboard.content.elements);
  const [zoom, setZoom] = useState(whiteboard.content.zoom);
  const [pan, setPan] = useState(whiteboard.content.pan);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (autoSaveStatus === 'unsaved') {
        setAutoSaveStatus('saving');
        try {
          await onSave({
            ...whiteboard,
            content: {
              ...whiteboard.content,
              elements,
              zoom,
              pan
            },
            updatedAt: new Date()
          });
          setAutoSaveStatus('saved');
        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus('unsaved');
        }
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [elements, zoom, pan, autoSaveStatus, whiteboard, onSave]);

  // Mark as unsaved when content changes
  useEffect(() => {
    setAutoSaveStatus('unsaved');
  }, [elements, zoom, pan]);

  const handleToolSelect = (tool: Tool) => {
    setCurrentTool(tool);
    setSelectedElement(null);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const addElement = useCallback((type: WhiteboardElement['type'], position: { x: number; y: number }) => {
    const newElement: WhiteboardElement = {
      id: crypto.randomUUID(),
      type,
      position,
      size: { width: 100, height: 100 },
      content: type === 'text' ? 'Double-click to edit' : '',
      style: {
        color: '#000000',
        backgroundColor: type === 'sticky' ? '#fef08a' : 'transparent',
        fontSize: 16,
        strokeWidth: 2,
        opacity: 1
      },
      rotation: 0,
      zIndex: elements.length
    };

    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  }, [elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<WhiteboardElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (currentTool === 'cursor') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    switch (currentTool) {
      case 'text':
        addElement('text', { x, y });
        break;
      case 'rectangle':
        addElement('shape', { x, y });
        break;
      case 'circle':
        addElement('shape', { x, y });
        break;
      case 'triangle':
        addElement('shape', { x, y });
        break;
      case 'sticky':
        addElement('sticky', { x, y });
        break;
    }
  };

  const handleSaveManual = async () => {
    setAutoSaveStatus('saving');
    try {
      await onSave({
        ...whiteboard,
        content: {
          ...whiteboard.content,
          elements,
          zoom,
          pan
        },
        updatedAt: new Date()
      });
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Save failed:', error);
      setAutoSaveStatus('unsaved');
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export whiteboard');
  };

  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Select' },
    { id: 'hand', icon: Hand, label: 'Pan' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
    { id: 'image', icon: Image, label: 'Image' },
  ];

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {whiteboard.name}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {autoSaveStatus === 'saved' && 'All changes saved'}
                {autoSaveStatus === 'saving' && 'Saving...'}
                {autoSaveStatus === 'unsaved' && 'Unsaved changes'}
              </span>
              {autoSaveStatus === 'saving' && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSaveManual}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => {/* TODO: Toggle favorite */}}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {whiteboard.isFavorite ? <Star size={20} className="fill-current text-yellow-500" /> : <StarOff size={20} />}
          </button>
          <button
            onClick={() => {/* TODO: Share */}}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
          >
            <Share size={20} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-500 transition-colors"
          >
            <Download size={20} />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id as Tool)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                currentTool === tool.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              title={tool.label}
            >
              <tool.icon size={20} />
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {/* TODO: Undo */}}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Undo"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={() => {/* TODO: Redo */}}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Redo"
          >
            <Redo size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              showGrid
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
            title="Toggle Grid"
          >
            <Grid size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={canvasRef}
          className="w-full h-full cursor-crosshair relative"
          style={{
            backgroundImage: showGrid 
              ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`
              : 'none',
            backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : 'auto',
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onClick={handleCanvasClick}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Render elements */}
            {elements.map((element) => (
              <div
                key={element.id}
                className={clsx(
                  "absolute border-2 transition-all duration-200",
                  selectedElement === element.id 
                    ? "border-blue-500 shadow-lg" 
                    : "border-transparent hover:border-gray-300"
                )}
                style={{
                  left: element.position.x,
                  top: element.position.y,
                  width: element.size.width,
                  height: element.size.height,
                  backgroundColor: element.style.backgroundColor,
                  color: element.style.color,
                  fontSize: element.style.fontSize,
                  opacity: element.style.opacity,
                  transform: `rotate(${element.rotation || 0}deg)`,
                  zIndex: element.zIndex
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement(element.id);
                }}
              >
                {element.type === 'text' && (
                  <div 
                    className="w-full h-full p-2 outline-none resize-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                  >
                    {element.content}
                  </div>
                )}
                {element.type === 'sticky' && (
                  <div className="w-full h-full p-3 bg-yellow-200 dark:bg-yellow-300 shadow-md">
                    <div 
                      className="w-full h-full outline-none resize-none text-gray-800"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                    >
                      {element.content || 'Type here...'}
                    </div>
                  </div>
                )}
                {element.type === 'shape' && (
                  <div 
                    className="w-full h-full border-2 border-gray-800 dark:border-gray-200"
                    style={{ borderColor: element.style.color }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Element Properties Panel */}
        {selectedElement && (
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-64">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Element Properties</h3>
            <div className="space-y-3">
              <button
                onClick={() => deleteElement(selectedElement)}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Element
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}