import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Trash2,
  X,
  Grid,
  Square,
  PanelRight,
  Layers,
  MousePointer
} from 'lucide-react';

interface StrokePoint {
  x: number;
  y: number;
}

interface StrokeItem {
  tool: string;
  color: string;
  width: number;
  points: StrokePoint[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questionKey?: any;
  onModeChange?: (mode: string) => void;
}

const PEN_COLORS = [
  { id: 'black', hex: '#0f172a', label: 'Hitam' },
  { id: 'red', hex: '#ef4444', label: 'Merah' },
  { id: 'blue', hex: '#2563eb', label: 'Biru' },
  { id: 'green', hex: '#059669', label: 'Hijau' },
];

function drawStrokeList(
  ctx: CanvasRenderingContext2D,
  strokes: StrokeItem[],
  activeStroke: any,
  cssWidth: number,
  cssHeight: number
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const listToDraw = activeStroke ? [...strokes, activeStroke] : strokes;

  for (const stroke of listToDraw) {
    if (!stroke.points) continue;
    if (stroke.points.length === 0) continue;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.width;
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    }

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export default function HybridWhiteboard({ isOpen, onClose, questionKey, onModeChange }: Props) {
  // 'board' = Panel Samping Whiteboard, 'overlay' = Coret Langsung di Atas Soal
  const [mode, setMode] = useState<string>('board');
  const [tool, setTool] = useState<string>('pen');
  const [color, setColor] = useState<string>('#0f172a');
  const [penSize, setPenSize] = useState<number>(3);
  const [eraserSize, setEraserSize] = useState<number>(26);
  const [highlighterSize, setHighlighterSize] = useState<number>(20);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const [boardStrokes, setBoardStrokes] = useState<StrokeItem[]>([]);
  const [overlayStrokes, setOverlayStrokes] = useState<StrokeItem[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<any>(null);

  const currentStrokes = mode === 'board' ? boardStrokes : overlayStrokes;

  useEffect(() => {
    if (onModeChange) {
      onModeChange(isOpen ? mode : 'closed');
    }
  }, [isOpen, mode, onModeChange]);

  // Bersihkan coretan otomatis setiap kali tentor berpindah ke nomor soal lain
  useEffect(() => {
    setBoardStrokes([]);
    setOverlayStrokes([]);
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
  }, [questionKey]);

  // Saat berpindah ke mode board, pastikan alat tidak tertinggal di mode 'cursor'
  useEffect(() => {
    if (mode === 'board' && tool === 'cursor') {
      setTool('pen');
    }
  }, [mode, tool]);

  // Sembunyikan kursor lingkaran penghapus saat alat bukan eraser atau whiteboard ditutup
  useEffect(() => {
    const hideEraser = !isOpen ? true : tool !== 'eraser';
    if (hideEraser && eraserCursorRef.current) {
      eraserCursorRef.current.style.opacity = '0';
    }
  }, [isOpen, tool]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio ?? 1;
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== targetW ? true : canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStrokeList(ctx, currentStrokes, activeStrokeRef.current, rect.width, rect.height);
  }, [currentStrokes]);

  useEffect(() => {
    if (!isOpen) return;
    const frameId = requestAnimationFrame(redraw);

    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, mode, redraw]);

  const handleUndo = useCallback(() => {
    if (mode === 'board') {
      setBoardStrokes((prev) => prev.slice(0, -1));
    } else {
      setOverlayStrokes((prev) => prev.slice(0, -1));
    }
  }, [mode]);

  const handleClear = useCallback(() => {
    if (mode === 'board') {
      setBoardStrokes([]);
    } else {
      setOverlayStrokes([]);
    }
    activeStrokeRef.current = null;
  }, [mode]);

  // Pintasan keyboard: Ctrl+Z untuk Undo, Escape untuk menutup Whiteboard
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey ? true : e.metaKey;
      if (isModifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleUndo, onClose]);

  const updateEraserCursorPosition = (clientX: number, clientY: number) => {
    if (tool !== 'eraser') return;
    const el = eraserCursorRef.current;
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = `translate3d(${clientX - eraserSize / 2}px, ${clientY - eraserSize / 2}px, 0)`;
  };

  const hideEraserCursor = () => {
    if (eraserCursorRef.current) {
      eraserCursorRef.current.style.opacity = '0';
    }
  };

  const getPointerPosition = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'cursor') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    updateEraserCursorPosition(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getPointerPosition(e);

    const strokeColor = tool === 'highlighter' ? '#facc15' : color;
    const strokeWidth =
      tool === 'eraser'
        ? eraserSize
        : tool === 'highlighter'
          ? highlighterSize
          : penSize;

    isDrawingRef.current = true;
    activeStrokeRef.current = {
      tool,
      color: strokeColor,
      width: strokeWidth,
      points: [pt],
    };

    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateEraserCursorPosition(e.clientX, e.clientY);

    if (!isDrawingRef.current) return;
    if (!activeStrokeRef.current) return;

    const pt = getPointerPosition(e);
    activeStrokeRef.current.points.push(pt);
    redraw();
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;

    if (finished && finished.points.length > 0) {
      if (mode === 'board') {
        setBoardStrokes((prev) => [...prev, finished]);
      } else {
        setOverlayStrokes((prev) => [...prev, finished]);
      }
    }
  };

  // Konfigurasi slider dinamis sesuai alat yang sedang dipilih
  const isEraserActive = tool === 'eraser';
  const isHighlighterActive = tool === 'highlighter';
  const activeSliderMin = isEraserActive ? 10 : isHighlighterActive ? 12 : 1;
  const activeSliderMax = isEraserActive ? 64 : isHighlighterActive ? 40 : 14;
  const activeSliderStep = isEraserActive ? 2 : isHighlighterActive ? 2 : 0.5;
  const activeSliderValue = isEraserActive ? eraserSize : isHighlighterActive ? highlighterSize : penSize;
  const activeSliderLabel = isEraserActive ? 'Hapus' : isHighlighterActive ? 'Stabilo' : 'Pena';

  const handleSizeSliderChange = (rawValue: string) => {
    const val = Number(rawValue);
    if (Number.isNaN(val)) return;
    if (isEraserActive) {
      setEraserSize(val);
    } else if (isHighlighterActive) {
      setHighlighterSize(val);
    } else {
      setPenSize(val);
    }
  };

  // Ukuran titik pratinjau di sebelah slider (dibatasi maksimal 18px agar toolbar rapi)
  const previewDotSize = Math.max(4, Math.min(18, isEraserActive ? Math.round(eraserSize * 0.35) : Math.round(activeSliderValue)));

  const isOverlay = mode === 'overlay';
  const isCursorPassthrough = isOverlay && tool === 'cursor';

  const gridBgStyle = showGrid
    ? {
        backgroundImage:
          'linear-gradient(to right, rgba(148, 163, 184, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.18) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* KURSOR LINGKARAN PRESISI KHUSUS PENGHAPUS (UKURAN 1:1 DENGAN DIAMETER HAPUS) */}
          <div
            ref={eraserCursorRef}
            style={{
              width: `${eraserSize}px`,
              height: `${eraserSize}px`,
              opacity: 0,
            }}
            className="fixed top-0 left-0 z-[45] pointer-events-none rounded-full border-2 border-slate-700 bg-rose-500/15 ring-1 ring-white/90 shadow-sm will-change-transform"
          />

          {/* MODE 1: CORET LANGSUNG DI ATAS SOAL (TRANSPARENT OVERLAY) */}
          {isOverlay && (
            <div
              className={`fixed inset-0 z-40 ${
                isCursorPassthrough ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerCancel={finishStroke}
                onPointerLeave={hideEraserCursor}
                className={`w-full h-full touch-none block ${
                  isCursorPassthrough
                    ? 'cursor-default'
                    : isEraserActive
                      ? 'cursor-none'
                      : 'cursor-crosshair'
                }`}
              />
            </div>
          )}

          {/* MODE 2: PANEL SAMPING WHITEBOARD (SPLIT-SCREEN DRAWER) */}
          {!isOverlay && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-40 w-full md:w-[46%] lg:w-[44%] bg-white shadow-2xl border-l border-slate-200 flex flex-col"
            >
              {/* Header Whiteboard */}
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Whiteboard</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMode('overlay')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    title="Beralih ke mode coret langsung di atas teks/gambar soal"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Coret Soal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showGrid ? 'bg-slate-700 text-amber-300' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={showGrid ? 'Ganti ke Latar Polos' : 'Aktifkan Grid Matematika'}
                  >
                    {showGrid ? <Grid className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                    title="Tutup Whiteboard (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Toolbar Alat Panel Samping */}
              <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                {/* Pilihan Alat */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTool('pen')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      tool === 'pen' ? 'bg-[#1e3a8a] text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title="Pena"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('highlighter')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      tool === 'highlighter' ? 'bg-amber-400 text-slate-900' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title="Stabilo"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('eraser')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      tool === 'eraser' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title="Penghapus"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>

                {/* Pilihan Warna */}
                <div className="flex items-center gap-1.5">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setColor(c.hex);
                        if (tool !== 'pen') setTool('pen');
                      }}
                      title={c.label}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c.hex && tool === 'pen'
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>

                {/* Slider Ketebalan Dinamis (Pena / Stabilo / Penghapus) */}
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <span
                      style={{
                        width: `${previewDotSize}px`,
                        height: `${previewDotSize}px`,
                        backgroundColor: isEraserActive
                          ? 'rgba(244, 63, 94, 0.2)'
                          : isHighlighterActive
                            ? '#facc15'
                            : color,
                      }}
                      className={`rounded-full inline-block ${
                        isEraserActive ? 'border border-slate-700' : ''
                      }`}
                    />
                  </div>
                  <input
                    type="range"
                    min={activeSliderMin}
                    max={activeSliderMax}
                    step={activeSliderStep}
                    value={activeSliderValue}
                    onChange={(e) => handleSizeSliderChange(e.target.value)}
                    aria-label={`Ukuran ${activeSliderLabel}`}
                    className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e3a8a]"
                  />
                  <span className="text-[10px] font-bold text-slate-500 w-7 text-right font-mono">
                    {activeSliderValue}
                  </span>
                </div>

                {/* Aksi Undo & Bersihkan */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={boardStrokes.length === 0}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={boardStrokes.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-40 text-xs font-bold transition-colors"
                    title="Hapus Semua Coretan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              {/* Area Kanvas Panel Samping */}
              <div className="flex-1 relative bg-white overflow-hidden" style={gridBgStyle}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  onPointerLeave={hideEraserCursor}
                  className={`w-full h-full touch-none block ${
                    isEraserActive ? 'cursor-none' : 'cursor-crosshair'
                  }`}
                />
              </div>
            </motion.div>
          )}

          {/* TOOLBAR MELAYANG KHUSUS MODE CORET SOAL (TRANSPARENT OVERLAY) */}
          {isOverlay && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-center gap-2 max-w-[95vw]"
            >
              {/* Pindah ke Panel Samping Whiteboard */}
              <button
                type="button"
                onClick={() => setMode('board')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                title="Buka Whiteboard"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Whiteboard</span>
              </button>

              <div className="w-px h-5 bg-slate-700" />

              {/* Alat Coret Soal + Mode Kursor/Scroll */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTool('cursor')}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    tool === 'cursor' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Mode Kursor (Untuk klik tombol atau gulir soal tanpa menutup coretan)"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Kursor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`p-1.5 rounded-xl transition-colors ${
                    tool === 'pen' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Pena Coret Soal"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTool('highlighter')}
                  className={`p-1.5 rounded-xl transition-colors ${
                    tool === 'highlighter' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Stabilo Kata Kunci"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`p-1.5 rounded-xl transition-colors ${
                    tool === 'eraser' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Penghapus Coretan"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-5 bg-slate-700" />

              {/* Warna Pena */}
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setColor(c.hex);
                      setTool('pen');
                    }}
                    title={c.label}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full border border-white/40 transition-transform ${
                      color === c.hex && tool === 'pen' ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              {/* Slider Ketebalan Dinamis (Tampil saat Pena, Stabilo, atau Penghapus aktif) */}
              {tool !== 'cursor' && (
                <>
                  <div className="w-px h-5 bg-slate-700" />
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">
                      {activeSliderLabel}
                    </span>
                    <input
                      type="range"
                      min={activeSliderMin}
                      max={activeSliderMax}
                      step={activeSliderStep}
                      value={activeSliderValue}
                      onChange={(e) => handleSizeSliderChange(e.target.value)}
                      aria-label={`Ukuran ${activeSliderLabel}`}
                      className="w-16 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-[10px] font-mono text-slate-300 w-6 text-right">
                      {activeSliderValue}
                    </span>
                  </div>
                </>
              )}

              <div className="w-px h-5 bg-slate-700" />

              {/* Undo, Hapus Semua, & Tutup */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={overlayStrokes.length === 0}
                  className="p-1.5 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-35 transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={overlayStrokes.length === 0}
                  className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-600 hover:text-white disabled:opacity-35 transition-colors"
                  title="Hapus Semua Coretan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-bold transition-colors ml-1"
                  title="Tutup Whiteboard (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
