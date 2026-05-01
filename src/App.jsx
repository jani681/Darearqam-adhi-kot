import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lon: 71.8037100 };
const ALLOWED_DISTANCE = 0.5; // 500 Meters (in KM)

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
  const [isMarkedToday, setIsMarkedToday] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  // Helper: Haversine Formula (Distance Calculation)
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

  // Staff Attendance Logic
  const handleStaffAttendance = () => {
    setStatus('Verifying Location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistance(latitude, longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lon);

        if (dist <= ALLOWED_DISTANCE) {
          try {
            await addDoc(collection(db, "staff_attendance"), {
              name: staffName,
              date: today,
              time: new Date().toLocaleTimeString(),
              status: "Present",
              timestamp: serverTimestamp()
            });
            setIsMarkedToday(true);
            setStatus('Attendance Marked Successfully!');
            alert("Attendance Lag Chuki Hai!");
          } catch (e) { alert("Database Error!"); }
        } else {
          alert(`Aap boundary se ${(dist * 1000).toFixed(0)}m door hain. School ke andar jayen.`);
          setStatus('Ready');
        }
      }, (err) => {
        alert("Please Location (GPS) On Karein!");
        setStatus('Location Required');
      }, { enableHighAccuracy: true });
    }
  };

  // Check attendance status on login
  useEffect(() => {
    const checkStatus = async () => {
      if (isLoggedIn && userRole === 'staff') {
        const q = query(collection(db, "staff_attendance"), where("name", "==", staffName), where("date", "==", today));
        const snap = await getDocs(q);
        if (!snap.empty) setIsMarkedToday(true);
      }
    };
    checkStatus();
  }, [isLoggedIn, staffName, today, userRole]);

  // Main Login Function
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }
    setStatus('Verifying Staff...');
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setStaffName(snap.docs[0].data().name);
        setUserRole('staff');
        setIsLoggedIn(true);
        setStatus('Staff Login Success');
      } else {
        alert("Ghalat Password!");
        setStatus('Ready');
      }
    } catch (e) {
      alert("Login Error");
      setStatus('Error');
    }
  };

  // Stats for Dashboard
  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const fetchRecordsByClass = async (target, cls) => {
    setStatus(`Opening ${cls}...`);
    try {
      setFilterClass(cls);
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView(target);
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const getNavStyle = (targetView) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '9px',
    backgroundColor: view === targetView ? '#f39c12' : '#ffffff', color: '#1a4a8e',
    boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px', marginBottom: '20px' }} />
      <h3 style={{marginBottom:'20px'}}>Ali Campus Management</h3>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', borderRadius:'8px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold', fontSize:'16px'}}>LOGIN</button>
      <p style={{fontSize:'10px', marginTop:'10px'}}>{status}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        {userRole === 'staff' && (
          <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '5px', borderRadius: '8px', fontSize: '14px' }}>
            Teacher: {staffName}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px', marginTop: '15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* NEW STAFF ATTENDANCE BOX */}
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'white', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'15px', boxShadow:'0 4px 8px rgba(0,0,0,0.1)', border:'2px solid #1a4a8e' }}>
            {isMarkedToday ? (
              <div style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Aaj Ki Attendance Lag Chuki Hai</div>
            ) : (
              <button onClick={handleStaffAttendance} style={{ background:'#1a4a8e', color:'white', border:'none', padding:'12px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' }}>
                📍 Mark My Attendance
              </button>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} style={{ background:'white', padding:'15px', borderRadius:'12px', borderLeft:'5px solid #f39c12', cursor: 'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ... Rest of your views (Attendance, Directory) remain the same as base code ... */}
        {view === 'sel_att' && (
          <div style={{background:'white', padding:'15px', borderRadius:'12px'}}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass('attendance', filterClass)} style={{width:'100%', background:'#1a4a8e', color:'white', padding:'12px', border:'none', borderRadius:'8px'}}>Open Attendance</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
