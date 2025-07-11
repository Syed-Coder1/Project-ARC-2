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
  Plus
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
  const [showGrid, setShowGrid] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<{ elements: WhiteboardElement[]; paths: DrawingPath[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Drawing settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);
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

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

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

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20 * zoom;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

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
        width: type === 'text' ? 200 : 100, 
        height: type === 'text' ? 50 : 100 
      },
      content: type === 'text' ? 'Double-click to edit' : type === 'sticky' ? 'Type here...' : '',
      style: {
        color: strokeColor,
        backgroundColor: type === 'sticky' ? '#fef08a' : fillColor,
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

  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Select' },
    { id: 'hand', icon: Hand, label: 'Pan' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
    { id: 'image', icon: Image, label: 'Image' },
  ];

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ffc0cb', '#a52a2a', '#808080', '#000080', '#008000'
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

        <div className="flex items-center space-x-4">
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Palette size={16} />
              <div 
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: strokeColor }}
              />
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setStrokeColor(color);
                        setShowColorPicker(false);
                      }}
                      className={clsx(
                        "w-8 h-8 rounded border-2 transition-transform hover:scale-110",
                        strokeColor === color ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
              className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[30px] text-center">
              {strokeWidth}px
            </span>
            <button
              onClick={() => setStrokeWidth(Math.min(20, strokeWidth + 1))}
              className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* History Controls */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo size={20} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Grid Toggle */}
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

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Zoom Controls */}
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

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Clear Canvas */}
          <button
            onClick={clearCanvas}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Clear Canvas"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-900">
        <div
          ref={containerRef}
          className="w-full h-full relative"
          style={{ cursor: currentTool === 'hand' ? 'grab' : currentTool === 'pen' ? 'crosshair' : 'default' }}
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
                      selectedElement === element.id && "stroke-blue-500 stroke-2"
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
                      selectedElement === element.id && "stroke-blue-500 stroke-2"
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
                      selectedElement === element.id && "stroke-blue-500 stroke-2"
                    )}
                  />
                )}
                {element.type === 'arrow' && (
                  <g>
                    <line
                      x1={element.position.x}
                      y1={element.position.y + element.size.height / 2}
                      x2={element.position.x + element.size.width - 10}
                      y2={element.position.y + element.size.height / 2}
                      stroke={element.style.color}
                      strokeWidth={element.style.strokeWidth}
                      markerEnd="url(#arrowhead)"
                      className="pointer-events-auto cursor-pointer"
                    />
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
                          fill={element.style.color}
                        />
                      </marker>
                    </defs>
                  </g>
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
                        ? "border-blue-500 shadow-lg" 
                        : "border-transparent hover:border-gray-300",
                      element.type === 'sticky' && "bg-yellow-200 dark:bg-yellow-300 shadow-md rounded-lg"
                    )}
                    style={{
                      left: element.position.x,
                      top: element.position.y,
                      width: element.size.width,
                      height: element.size.height,
                      backgroundColor: element.type === 'text' ? 'transparent' : element.style.backgroundColor,
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