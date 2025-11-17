import React, { useState, useRef } from 'react';
import './SettingsPage.css'; // Gagamitin natin 'yung dating CSS

// URL ng backend server mo
const BACKEND_URL = 'http://localhost:5000';

function SettingsPage() {
  const [totalSeats, setTotalSeats] = useState(10);
  const [rois, setRois] = useState([]);
  
  // --- [BINAGO] Ito na ang mga bago nating states para sa drawing ---
  const [startPoint, setStartPoint] = useState(null); // Itatago ang {x, y} ng Click #1
  const [currentBoxPreview, setCurrentBoxPreview] = useState(null); // Itatago ang {x1, y1, x2, y2} habang gumagalaw ang mouse
  
  const videoRef = useRef(null); 
  const containerRef = useRef(null);

  // Function para kunin ang coordinates (walang pagbabago dito)
  const getCoords = (e) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // --- [BINAGO] Ito na ang ating "Two-Click" logic ---
  const handleMouseDown = (e) => {
    e.preventDefault();
    if (e.button !== 0) return; // Para sa left-click lang

    if (rois.length >= totalSeats) {
      alert(`Naabot mo na ang ${totalSeats} na upuan. Pindutin ang 'Reset' para mag-clear.`);
      return;
    }
    
    const { x, y } = getCoords(e);

    if (!startPoint) {
      // --- CLICK #1: Simulan ang pag-drawing ---
      setStartPoint({ x, y });
      setCurrentBoxPreview({ x1: x, y1: y, x2: x, y2: y });
    } else {
      // --- CLICK #2: I-finalize ang box ---
      const newBox = {
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        w: Math.abs(startPoint.x - x),
        h: Math.abs(startPoint.y - y),
      };

      // Huwag i-save kung sobrang liit
      if (newBox.w > 5 && newBox.h > 5) {
        setRois((prevRois) => [...prevRois, newBox]);
      }
      
      // I-reset ang drawing states
      setStartPoint(null);
      setCurrentBoxPreview(null);
    }
  };

  // --- [BINAGO] Ito ay gagalaw lang kung nagsimula na tayo (may Click #1) ---
  const handleMouseMove = (e) => {
    if (!startPoint) return; // Kung wala pang Click #1, "free" ang cursor
    
    // I-update ang itsura ng preview box habang gumagalaw ang mouse
    const { x, y } = getCoords(e);
    setCurrentBoxPreview((prev) => ({ ...prev, x2: x, y2: y }));
  };

  // --- [BAGO] Para i-cancel ang drawing gamit ang Right-Click ---
  const handleContextMenu = (e) => {
    e.preventDefault(); // Para hindi lumabas 'yung menu
    // I-cancel ang drawing
    setStartPoint(null);
    setCurrentBoxPreview(null);
  };

  const handleSave = async () => {
    // ... (Walang pagbabago sa save logic) ...
    if (rois.length === 0) {
      alert("Wala pang na-drawing na upuan.");
      return;
    }
    if (rois.length !== totalSeats) {
        alert(`Kailangan mong mag-drawing ng ${totalSeats} na upuan. May ${rois.length} ka pa lang.`);
        return;
    }
    console.log("Saving seats:", rois);
    try {
      const response = await fetch(`${BACKEND_URL}/save_seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rois), 
      });
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
      } else {
        alert('Failed to save seats. Tignan ang console.');
      }
    } catch (error) {
      console.error('Error saving seats:', error);
      alert('Error: Hindi makakonekta sa backend. Siguraduhin na tumatakbo ang server.py.');
    }
  };
  
  // Helper para i-render ang box (Walang pagbabago)
  const renderBox = (box, index, type = 'saved') => {
    const style = {
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      borderColor: type === 'saved' ? 'lime' : 'blue',
    };
    return (
      <div key={index} className="roi-box" style={style}>
        {type === 'saved' ? `Seat ${index + 1}` : ''}
      </div>
    );
  };

  // --- [BINAGO] Gumagamit na ng 'currentBoxPreview' ---
  const renderCurrentBox = () => {
    if (!currentBoxPreview) return null;
    const box = {
      x: Math.min(currentBoxPreview.x1, currentBoxPreview.x2),
      y: Math.min(currentBoxPreview.y1, currentBoxPreview.y2),
      w: Math.abs(currentBoxPreview.x1 - currentBoxPreview.x2),
      h: Math.abs(currentBoxPreview.y1 - currentBoxPreview.y2),
    };
    return renderBox(box, 'current', 'drawing');
  };

  return (
    <div className="settings-page">
      <h2>Configuration ng Upuan (Two-Click)</h2>
      <div className="controls">
        <label>
          Ilang upuan ang iko-configure mo?
          <input
            type="number"
            value={totalSeats}
            onChange={(e) => setTotalSeats(parseInt(e.target.value, 10))}
            min="1"
          />
        </label>
        <button onClick={handleSave}>I-SAVE ANG {rois.length} / {totalSeats} NA UPUAN</button>
        {/* [BINAGO] 'Yung Reset button ay dapat i-clear din ang drawing state */}
        <button onClick={() => { 
            setRois([]); 
            setStartPoint(null); 
            setCurrentBoxPreview(null); 
          }}>
          I-RESET LAHAT
        </button>
      </div>
      <p style={{marginTop: 0, color: '#555'}}>
        <b>Paano gamitin:</b> (1) I-click para simulan ang box. (2) I-click ulit para tapusin. (3) I-right-click para i-cancel.
      </p>

      <div
        className="video-container"
        ref={containerRef}
        // --- [BINAGO] Ito na ang mga bago nating event listeners ---
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu} // Para sa Right-Click cancel
        onMouseLeave={() => { // I-cancel din pag umalis ang mouse
            setStartPoint(null);
            setCurrentBoxPreview(null);
        }}
      >
        <img
          ref={videoRef}
          src={`${BACKEND_URL}/video_feed`}
          alt="Live Stream Mula sa Python"
          draggable="false"
        />
        {/* I-render ang mga na-save na */}
        {rois.map((box, i) => renderBox(box, i, 'saved'))}
        {/* I-render ang kasalukuyang dini-drawing */}
        {currentBoxPreview && renderCurrentBox()}
      </div>
    </div>
  );
}

export default SettingsPage;