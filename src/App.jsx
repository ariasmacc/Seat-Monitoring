import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// INAYOS ANG IMPORT PATH: Ginawa kong 'SettingsPage' (plural) para tumugma sa
// folder na pinagawa ko sa'yo para sa bagong project.
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx'; 
import './App.css'; // Gagamitin natin 'to para sa styling

// URL ng ating *bagong* Python server
const API_URL = 'http://localhost:5000/status';

// --- Ating Bagong Home Page ---
function LiveStatusPage() {
  const [seats, setSeats] = useState([]); // Dito i-store ang [ {id: 1, status: 'Available', ...}, ... ]
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulan ang timer para mag-fetch
    const intervalId = setInterval(() => {
      fetch(API_URL)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          setSeats(data); // I-update ang state sa nakuha nating data
          setError(null); // Clear ang error kung success
        })
        .catch(error => {
          console.error("Fetch error:", error);
          setError("Error: Hindi makakonekta sa backend. Siguraduhin na tumatakbo ang main_detector.py.");
        });
    }, 1000); // Kumuha ng update bawat 1 segundo

    // Cleanup function: itigil ang timer pag-alis sa page
    return () => clearInterval(intervalId);
  }, []); // [] = i-run lang 'to isang beses (pag-load ng page)

  // Kalkulahin ang available seats
  const availableCount = seats.filter(seat => seat.status === 'Available').length;

  return (
    <div className="live-status-page">
      <header>
        <h1>Seat Occupancy Status</h1>
        <p>Available Seats: <strong>{availableCount} / {seats.length}</strong></p>
        <Link to="/settings" className="settings-link">
          (Admin: Configure Seats)
        </Link>
      </header>
      
      {error && <p className="error-message">{error}</p>}
      
      <div className="seat-map">
        {seats.map((seat) => {
          // Kunin ang status at i-calculate ang timer
          const statusClass = seat.status === 'Occupied' ? 'occupied' : 'available';
          const durationInSeconds = (new Date().getTime() / 1000) - seat.last_change_time;
          const durationInMinutes = durationInSeconds / 60;

          return (
            <div key={seat.id} className={`seat-box ${statusClass}`}>
              <div className="seat-id">Seat {seat.id}</div>
              <div className="seat-status">{seat.status}</div>
              <div className="seat-timer">
                {/* Ipakita lang ang timer kung hindi 'Waiting' */}
                {seat.status !== 'Waiting' ? `${durationInMinutes.toFixed(1)} mins` : 'Nag-aantay...'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Ating Main App ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ang Home Page (/) ay 'yung Live Status na */}
        <Route path="/" element={<LiveStatusPage />} />
        {/* Ang /settings ay 'yung tool natin */}
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;