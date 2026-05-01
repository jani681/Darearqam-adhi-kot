import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- MOBILE FRIENDLY: No Import needed for html5-qrcode ---

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lon: 71.8037100 };
const ALLOWED_DISTANCE = 0.5; // 500 Meters
const QR_SECRET = "ALICAMPUS-STAFF-2026";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  const [classStats, setClassStats] = useState({});
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [isMarkedToday, setIsMarkedToday] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  // Helper for Distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  // --- UPDATED SCANNER LOGIC FOR MOBILE ---
  const startScanner = () => {
    setView('qr_scanner');
    // We check if the library is loaded from the script tag
    if (window.Html5QrcodeScanner) {
      setTimeout(() => {
        const scanner = new window.Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        scanner.render((decodedText) => {
          if (decodedText === QR_SECRET) {
            scanner.clear(); // Stop camera
            handleAttendanceLogic();
          } else {
            alert("Ghalat QR Code hai!");
          }
        }, (err) => {});
      }, 500);
    } else {
      alert("Scanner library load ho rahi hai, please 2 second baad dobara koshish karein.");
    }
  };

  const handleAttendanceLogic = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistance(latitude, longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lon);

        if (distance <= ALLOWED_DISTANCE) {
          try {
            await addDoc(collection(db, "staff_attendance"), {
              name: staffName,
              date: today,
              time: new Date().toLocaleTimeString(),
              status: "Present",
              timestamp: serverTimestamp()
            });
            setAttendanceSuccess(true);
            setIsMarkedToday(true);
            setView('dashboard');
          } catch (e) { alert("Database Error!"); }
        } else {
          alert(`Aap school se ${(distance * 1000).toFixed(0)}m door hain. 500m ke andar hona zaroori hai.`);
          setView('dashboard');
        }
      }, (err) => alert("Location access allow karein!"), { enableHighAccuracy: true });
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (isLoggedIn && userRole === 'staff') {
        const q = query(collection(db, "staff_attendance"), where("name", "==", staffName), where("date", "==", today));
        const snap = await getDocs(q);
        if (!snap.empty) setIsMarkedToday(true);
      }
    };
    checkStatus();
  }, [isLoggedIn, staffName, today]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setStaffName(snap.docs[0].data().name);
        setUserRole('staff'); setIsLoggedIn(true);
      } else { alert("Ghalat Password!"); }
    } catch (e) { alert("Login Error"); }
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
  };
  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const fetchRecordsByClass = async (target, cls) => {
    setFilterClass(cls);
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView(target);
  };

  const getNavStyle = (v) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#ffffff', color: '#1a4a8e',
    boxShadow: view === v ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px', marginBottom:'20px' }} />
      <h3 style={{marginBottom:'20px'}}>Ali Campus Management</h3>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', borderRadius:'8px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        {userRole === 'staff' && <div style={{ color:'white', marginTop:'5px' }}>Teacher: {staffName}</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px', marginTop:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* STAFF PANEL */}
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'white', padding:'20px', borderRadius:'12px', textAlign:'center', marginBottom:'15px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
            {isMarkedToday ? (
              <div style={{ color: '#28a745', fontWeight: 'bold', fontSize:'18px' }}>✅ Attendance Marked!</div>
            ) : (
              <>
                <p style={{marginBottom:'15px'}}>Pehle QR scan karein phir attendance hogi.</p>
                <button onClick={startScanner} style={{ background:'#1a4a8e', color:'white', border:'none', padding:'12px 25px', borderRadius:'8px', fontWeight:'bold' }}>📸 SCAN QR CODE</button>
              </>
            )}
          </div>
        )}

        {attendanceSuccess && (
          <div style={{ background:'#d4edda', color:'#155724', padding:'15px', borderRadius:'10px', textAlign:'center', marginBottom:'15px', border:'1px solid #c3e6cb' }}>
             <h3 style={{margin:'0 0 5px 0'}}>✅ SHABASH!</h3>
             <p style={{margin:0}}>Aapki attendance lag gayi hai.</p>
             <button onClick={() => setAttendanceSuccess(false)} style={{ marginTop:'10px', border:'none', background:'#155724', color:'white', padding:'5px 15px', borderRadius:'5px' }}>Theek Hai</button>
          </div>
        )}

        {view === 'qr_scanner' && (
          <div style={{ background:'white', padding:'10px', borderRadius:'10px' }}>
            <div id="reader" style={{ width: '100%' }}></div>
            <button onClick={() => setView('dashboard')} style={{ width:'100%', marginTop:'10px', padding:'12px', background:'#dc3545', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>Cancel</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} style={{ background:'white', padding:'15px', borderRadius:'12px', borderLeft:'5px solid #f39c12', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
