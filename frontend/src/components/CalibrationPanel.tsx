import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Plus, Save, RotateCcw, Video, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Seat } from '../App';

const BACKEND_URL = 'http://localhost:5000';

interface CalibrationPanelProps {
  seats: Seat[];
  setSeats: (seats: Seat[]) => void;
}

export function CalibrationPanel({ seats, setSeats }: CalibrationPanelProps) {
  const [numSeats, setNumSeats] = useState<number>(6);
  const [placementMode, setPlacementMode] = useState(false);
  const [tempSeats, setTempSeats] = useState<Seat[]>([...seats]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging States
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  useEffect(() => {
    setTempSeats([...seats]);
  }, [seats]);

  const getCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!placementMode) return;
    if (tempSeats.length >= numSeats) {
        toast.error('Maximum number of seats reached');
        setPlacementMode(false);
        return;
    }
    setIsDrawing(true);
    const coords = getCoords(e);
    setStartPoint(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !placementMode) return;
    const current = getCoords(e);
    
    const width = Math.abs(current.x - startPoint.x);
    const height = Math.abs(current.y - startPoint.y);
    const left = Math.min(current.x, startPoint.x);
    const top = Math.min(current.y, startPoint.y);
    setCurrentRect({ x: left, y: top, w: width, h: height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !placementMode) return;
    setIsDrawing(false);
    
    if (currentRect.w > 1 && currentRect.h > 1) {
      const newSeat: Seat = {
        id: `seat-${Date.now()}`,
        x: currentRect.x,
        y: currentRect.y,
        // @ts-ignore
        w: currentRect.w, h: currentRect.h,
        status: 'available',
        availableMinutes: 0, occupiedMinutes: 0,
        lastStatusChange: new Date(), occupancyHistory: []
      };
      setTempSeats([...tempSeats, newSeat]);
      toast.success(`Seat ${tempSeats.length + 1} placed`);
    }
    setStartPoint(null);
    setCurrentRect(null);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/save_seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSeats),
      });

      if (response.ok) {
        setSeats(tempSeats);
        toast.success("Configuration saved!");
        setPlacementMode(false);
      }
    } catch (error) {
      toast.error("Error saving to backend.");
    }
  };

  return (
    // SIDE-BY-SIDE LAYOUT (Fixed)
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT SIDE: VIDEO (9 cols) */}
      <div className="lg:col-span-9">
        <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur">
          
          {/* Header na kamukha ng Monitoring Panel (Green Icon) */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-green-400" />
              <h3 className="text-white font-medium text-sm">Live Calibration Stream</h3>
            </div>
            {placementMode ? (
               <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full animate-pulse">
                 Drawing Mode Active
               </span>
            ) : (
               <span className="text-[10px] text-green-400 bg-green-400/10 px-2 rounded">LIVE</span>
            )}
          </div>
          
          {/* Video Container (Ginamitan ko ng aspect-video para siguradong may height!) */}
          <div className="relative w-full aspect-video bg-black">
            <div 
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${placementMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={() => setIsDrawing(false)}
            >
                {/* Video Image */}
                <img 
                  src={`${BACKEND_URL}/video_feed`}
                  className="w-full h-full object-contain pointer-events-none select-none" 
                  alt="Camera Feed" 
                />
                
                {/* Boxes Overlay */}
                {tempSeats.map((seat, i) => (
                <div key={i} className="absolute border-2 border-green-500/80 bg-green-500/10"
                    style={{ 
                      left: `${seat.x}%`, top: `${seat.y}%`, 
                      width: `${seat.w}%`, height: `${seat.h}%` 
                    }}>
                    <span className="absolute -top-6 left-0 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm"> 
                      {i+1} 
                    </span>
                </div>
                ))}

                {/* Active Drawing Box */}
                {currentRect && (
                <div className="absolute border-2 border-blue-400 bg-blue-400/20"
                    style={{ 
                      left: `${currentRect.x}%`, top: `${currentRect.y}%`, 
                      width: `${currentRect.w}%`, height: `${currentRect.h}%` 
                    }} 
                />
                )}
            </div>
          </div>
          
          <div className="p-2 bg-black/20 text-center border-t border-white/5">
             <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                {placementMode ? "Click & Drag to draw seat boundaries" : "Click 'Start Drawing' to begin"}
             </p>
          </div>
        </Card>
      </div>

      {/* RIGHT SIDE: CONTROLS (3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="bg-white/5 border-white/10 p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
            <MousePointer2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Config</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Target Seats</Label>
              <Input 
                  type="number" 
                  value={numSeats} 
                  onChange={(e) => setNumSeats(parseInt(e.target.value) || 0)} 
                  className="bg-black/20 border-white/10 text-white" 
              />
            </div>

            <div className="p-4 rounded-lg bg-slate-900/50 border border-white/5 text-center">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Seats Drawn</span>
                <div className="text-2xl font-bold text-white">
                    {tempSeats.length} <span className="text-base text-slate-600 font-normal">/ {numSeats}</span>
                </div>
            </div>

            <Button 
                onClick={() => {setTempSeats([]); setPlacementMode(true); toast.info('Start drawing...');}} 
                disabled={placementMode} 
                className="w-full bg-blue-600 hover:bg-blue-700"
            >
                <Plus className="w-4 h-4 mr-2" /> Start Drawing
            </Button>
            
            <Button 
                onClick={handleSave} 
                disabled={tempSeats.length === 0} 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
                <Save className="w-4 h-4 mr-2" /> Save Config
            </Button>
            
            <Button 
                onClick={() => {setTempSeats([]); setSeats([]); setPlacementMode(false);}} 
                variant="outline" 
                className="w-full text-red-400 border-red-500/20 hover:bg-red-500/10"
            >
                <RotateCcw className="w-4 h-4 mr-2" /> Clear All
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}