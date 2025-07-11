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
  Grid,
  Eraser,
  Palette,
  Minus,
  Plus,
  Home,
  Users,
  Lightbulb,
  Sparkles,
  Move3D
} from 'lucide-react';
import { Whiteboard, WhiteboardElement } from '../types';
import { clsx } from 'clsx';

interface WhiteboardEditorProps {
  whiteboard: Whiteboard;
  onSave: (whiteboard: Whiteboard) => Promise<void>;
  onClose: () => void;
}

type Tool = 'cursor' | 'hand' | 'text' | 'rectangle' | 'circle' | 'triangle' | 'pen' | 'arrow' | 'sticky' | 'image' | 'eraser';

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'eraser';
}

export function WhiteboardEditor({ whiteboard, onSave, onClose }: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('cursor');
  const [elements, setElements] = useState<WhiteboardElement[]>(whiteboard.content.elements);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [zoom, setZoom] = useState(whiteboard.content.zoom);
  const [pan, setPan] = useState(whiteboard.content.pan);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<{ elements: WhiteboardElement[]; paths: DrawingPath[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Drawing settings
  const [strokeColor, setStrokeColor] = useState('#3B82F6');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
  }, [elements, zoom, pan, drawingPaths]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to full window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw all paths
    drawingPaths.forEach(path => {
      drawPath(ctx, path);
    });

    // Draw current path
    if (currentPath) {
      drawPath(ctx, currentPath);
    }
  }, [drawingPaths, currentPath, showGrid, zoom, pan]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 30 * zoom;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let x = pan.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = pan.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color;
    }

    ctx.lineWidth = path.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);

    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }

    ctx.stroke();
    ctx.restore();
  };

  const getCanvasPoint = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: [...elements], paths: [...drawingPaths] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleToolSelect = (tool: Tool) => {
    setCurrentTool(tool);
    setSelectedElement(null);
    setShowColorPicker(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    setDragStart(point);

    if (currentTool === 'hand') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setIsDrawing(true);
      const newPath: DrawingPath = {
        id: crypto.randomUUID(),
        points: [point],
        color: strokeColor,
        strokeWidth: strokeWidth,
        tool: currentTool
      };
      setCurrentPath(newPath);
      saveToHistory();
      return;
    }

    if (currentTool === 'cursor') {
      // Check if clicking on an element
      const clickedElement = elements.find(el => 
        point.x >= el.position.x && 
        point.x <= el.position.x + el.size.width &&
        point.y >= el.position.y && 
        point.y <= el.position.y + el.size.height
      );
      
      if (clickedElement) {
        setSelectedElement(clickedElement.id);
        setIsDragging(true);
      } else {
        setSelectedElement(null);
      }
      return;
    }

    // Create new elements
    if (['text', 'rectangle', 'circle', 'triangle', 'sticky', 'arrow'].includes(currentTool)) {
      addElement(currentTool as any, point);
      saveToHistory();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing && currentPath) {
      setCurrentPath(prev => prev ? {
        ...prev,
        points: [...prev.points, point]
      } : null);
      return;
    }

    if (isDragging && selectedElement) {
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      setElements(prev => prev.map(el => 
        el.id === selectedElement 
          ? { ...el, position: { x: el.position.x + deltaX, y: el.position.y + deltaY } }
          : el
      ));
      setDragStart(point);
      return;
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath) {
      setDrawingPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }

    setIsDrawing(false);
    setIsPanning(false);
    setIsDragging(false);
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
      size: { 
        width: type === 'text' ? 200 : type === 'sticky' ? 150 : 100, 
        height: type === 'text' ? 50 : type === 'sticky' ? 150 : 100 
      },
      content: type === 'text' ? 'Double-click to edit' : type === 'sticky' ? 'Type here...' : '',
      style: {
        color: strokeColor,
        backgroundColor: type === 'sticky' ? '#FEF08A' : type === 'text' ? 'transparent' : fillColor,
        fontSize: fontSize,
        strokeWidth: strokeWidth,
        opacity: 1
      },
      rotation: 0,
      zIndex: elements.length
    };

    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  }, [elements.length, strokeColor, fillColor, fontSize, strokeWidth]);

  const updateElement = useCallback((id: string, updates: Partial<WhiteboardElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
    saveToHistory();
  }, []);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setElements(prevState.elements);
      setDrawingPaths(prevState.paths);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setElements(nextState.elements);
      setDrawingPaths(nextState.paths);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the entire whiteboard?')) {
      saveToHistory();
      setElements([]);
      setDrawingPaths([]);
      setSelectedElement(null);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${whiteboard.name}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#000000', '#FFFFFF', '#6B7280', '#DC2626', '#059669'
  ];

  const getCursor = () => {
    switch (currentTool) {
      case 'hand': return isPanning ? 'grabbing' : 'grab';
      case 'pen': return 'crosshair';
      case 'eraser': return 'crosshair';
      case 'text': return 'text';
      default: return 'default';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          >
            <X size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <Home size={16} className="text-gray-400" />
            <span className="text-gray-400">/</span>
            <span className="text-white font-medium">{whiteboard.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
            <div className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-medium">
              U
            </div>
            <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-medium">
              M
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Share size={16} />
            Share
          </button>
          <button
            onClick={() => {/* TODO: Toggle favorite */}}
            className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {whiteboard.isFavorite ? <Star size={20} className="fill-current text-yellow-500" /> : <StarOff size={20} />}
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full relative"
          style={{ cursor: getCursor() }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Render SVG elements */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={strokeColor}
                />
              </marker>
            </defs>
            {elements.map((element) => (
              <g key={element.id}>
                {element.type === 'rectangle' && (
                  <rect
                    x={element.position.x}
                    y={element.position.y}
                    width={element.size.width}
                    height={element.size.height}
                    fill={element.style.backgroundColor}
                    stroke={element.style.color}
                    strokeWidth={element.style.strokeWidth}
                    className={clsx(
                      "pointer-events-auto cursor-pointer",
                      selectedElement === element.id && "stroke-blue-400 stroke-2"
                    )}
                  />
                )}
                {element.type === 'circle' && (
                  <ellipse
                    cx={element.position.x + element.size.width / 2}
                    cy={element.position.y + element.size.height / 2}
                    rx={element.size.width / 2}
                    ry={element.size.height / 2}
                    fill={element.style.backgroundColor}
                    stroke={element.style.color}
                    strokeWidth={element.style.strokeWidth}
                    className={clsx(
                      "pointer-events-auto cursor-pointer",
                      selectedElement === element.id && "stroke-blue-400 stroke-2"
                    )}
                  />
                )}
                {element.type === 'triangle' && (
                  <polygon
                    points={`${element.position.x + element.size.width / 2},${element.position.y} ${element.position.x},${element.position.y + element.size.height} ${element.position.x + element.size.width},${element.position.y + element.size.height}`}
                    fill={element.style.backgroundColor}
                    stroke={element.style.color}
                    strokeWidth={element.style.strokeWidth}
                    className={clsx(
                      "pointer-events-auto cursor-pointer",
                      selectedElement === element.id && "stroke-blue-400 stroke-2"
                    )}
                  />
                )}
                {element.type === 'arrow' && (
                  <line
                    x1={element.position.x}
                    y1={element.position.y + element.size.height / 2}
                    x2={element.position.x + element.size.width}
                    y2={element.position.y + element.size.height / 2}
                    stroke={element.style.color}
                    strokeWidth={element.style.strokeWidth}
                    markerEnd="url(#arrowhead)"
                    className="pointer-events-auto cursor-pointer"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Render HTML elements */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {elements.map((element) => (
              <div key={element.id}>
                {(element.type === 'text' || element.type === 'sticky') && (
                  <div
                    className={clsx(
                      "absolute pointer-events-auto cursor-pointer border-2 transition-all duration-200",
                      selectedElement === element.id 
                        ? "border-blue-400 shadow-lg" 
                        : "border-transparent hover:border-gray-500",
                      element.type === 'sticky' && "shadow-lg rounded-lg"
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
                    <div 
                      className="w-full h-full p-2 outline-none resize-none overflow-hidden"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                      style={{ 
                        fontSize: element.style.fontSize,
                        color: element.type === 'sticky' ? '#1f2937' : element.style.color
                      }}
                    >
                      {element.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls - Top Left */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-gray-800 rounded-lg p-2 border border-gray-700">
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-sm min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Element Properties Panel */}
        {selectedElement && (
          <div className="absolute top-4 right-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 w-64">
            <h3 className="font-semibold text-white mb-3">Element Properties</h3>
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

      {/* Bottom Toolbar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center space-x-6">
          {/* Left Section - Navigation Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToolSelect('cursor')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'cursor'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Select"
            >
              <MousePointer size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('hand')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'hand'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Pan"
            >
              <Hand size={20} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Drawing Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToolSelect('pen')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'pen'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Pen"
            >
              <Pen size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('eraser')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'eraser'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Eraser"
            >
              <Eraser size={20} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Shape Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToolSelect('rectangle')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'rectangle'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Rectangle"
            >
              <Square size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('circle')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'circle'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Circle"
            >
              <Circle size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('triangle')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'triangle'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Triangle"
            >
              <Triangle size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('arrow')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'arrow'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Arrow"
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Text & Notes */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToolSelect('text')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'text'
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Text"
            >
              <Type size={20} />
            </button>
            <button
              onClick={() => handleToolSelect('sticky')}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                currentTool === 'sticky'
                  ? "bg-yellow-500 text-gray-900 shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Sticky Note"
            >
              <StickyNote size={20} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div 
                className="w-6 h-6 rounded border-2 border-gray-500"
                style={{ backgroundColor: strokeColor }}
              />
            </button>
            
            {showColorPicker && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                <div className="grid grid-cols-5 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setStrokeColor(color);
                        setShowColorPicker(false);
                      }}
                      className={clsx(
                        "w-8 h-8 rounded border-2 transition-transform hover:scale-110",
                        strokeColor === color ? "border-white" : "border-gray-600"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* History Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo size={20} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo size={20} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Additional Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={clsx(
                "p-3 rounded-lg transition-all duration-200",
                showGrid
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
              title="Toggle Grid"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={clearCanvas}
              className="p-3 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear Canvas"
            >
              <Sparkles size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}