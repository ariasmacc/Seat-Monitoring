import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// [INAYOS ANG PATH] Tinitiyak na 'SettingPage' (singular) ang path, base sa file structure mo
import SettingsPage from './pages/SettingPage/SettingsPage.jsx'; 
import './App.css'; 

// [BAGO] Mga import para sa Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy } from "firebase/firestore";

// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
//
// [PINAKA-MAHALAGA]
// Ito na 'yung 'firebaseConfig' na binigay mo. Inilagay ko na.
const firebaseConfig = {
  apiKey: "AIzaSyD6zJgWMo_bNpTi5elMgHIaedCmbOHHJ6o",
  authDomain: "seat-monitoring-project.firebaseapp.com",
  projectId: "seat-monitoring-project",
  storageBucket: "seat-monitoring-project.firebasestorage.app",
  messagingSenderId: "1043241811464",
  appId: "1:1043241811464:web:482ed069e09c49c9089bbd",
  measurementId: "G-JY3FD5QF1M"
};
//
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


// [BAGO] Simulan ang koneksyon sa Firebase
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase initialization error:", e);
  console.error("PAKI-CHECK: Nailagay mo na ba ang 'firebaseConfig' sa App.jsx?");
}


function LiveStatusPage() {
  const [seats, setSeats] = useState([]); // Dito i-store ang data
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) { // Kung 'di gumana 'yung init, huwag nang ituloy
      setError("Error: Hindi ma-initialize ang Firebase. I-check ang 'firebaseConfig' sa code.");
      return;
    }

    // [BINAGO] Ito na ang "real-time" listener ng Firebase
    
    // 1. Sabihin kung saang "koleksyon" (folder) sa database titingin
    const seatsCollectionRef = collection(db, "seats");
    
    // 2. I-order ang mga upuan by ID
    const q = query(seatsCollectionRef, orderBy("id"));

    // 3. 'onSnapshot' ay ang "magic"
    // Ito ay kusang tumatakbo kapag may nagbago sa database
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const seatsData = [];
      querySnapshot.forEach((doc) => {
        // 'doc.data()' ay ang laman ng bawat upuan
        seatsData.push(doc.data());
      });
      
      setSeats(seatsData); // I-update ang state sa nakuha nating data
      setError(null); // Clear ang error
    }, (err) => {
      // Mag-error kung hinarang (e.g., 'Test Mode' ay naka-off)
      console.error("Firebase fetch error:", err);
      setError("Error: Hindi makakonekta sa Firebase database. (Naka 'Test Mode' ka ba?)");
    });

    // Cleanup function: itigil ang "pakikinig" pag-alis sa page
    return () => unsubscribe();
    
  }, []); // [] = i-run lang 'to isang beses

  // Kalkulahin ang available seats (pareho pa rin)
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
          // [INAYOS] Siguraduhin na 'seat.status' ay hindi undefined bago ito gamitin
          const statusClass = seat.status ? seat.status.toLowerCase() : 'waiting';
          
          // [BINAGO] Ang 'last_change_time' galing Firebase ay iba ang format
          let durationInMinutes = 0;
          let timestamp = seat.last_change_time;

          // Check kung 'SERVER_TIMESTAMP' pa lang ito at 'di pa na-process
          if (timestamp && timestamp.seconds) {
             const durationInSeconds = (new Date().getTime() / 1000) - timestamp.seconds;
             durationInMinutes = durationInSeconds / 60;
          } else if (seat.last_change_time_local) { 
             // Fallback sa local time (para sa 'Waiting')
             const durationInSeconds = (new Date().getTime() / 1000) - seat.last_change_time_local;
             durationInMinutes = durationInSeconds / 60;
          }

          return (
            <div key={seat.id} className={`seat-box ${statusClass}`}>
              <div className="seat-id">Seat {seat.id}</div>
              <div className="seat-status">{seat.status || 'Loading...'}</div>
              <div className="seat-timer">
                {seat.status !== 'Waiting' && seat.status ? `${durationInMinutes.toFixed(1)} mins` : 'Nag-aantay...'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Ating Main App (pareho pa rin) ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveStatusPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;