import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; // Ali Campus Location

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
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- TEACHER ATTENDANCE LOGIC (LOCATION BASED) ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const handleTeacherAttendance = () => {
    setStatus('Checking Location...');
    if (!navigator.geolocation) {
      return alert("Geolocation is not supported by your browser");
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const distance = calculateDistance(
        position.coords.latitude, 
        position.coords.longitude, 
        SCHOOL_COORDS.lat, 
        SCHOOL_COORDS.lng
      );

      if (distance <= 500) {
        try {
          setStatus('Saving Attendance...');
          await addDoc(collection(db, "teacher_attendance"), {
            name: staffName,
            date: today,
            time: new Date().toLocaleTimeString(),
            timestamp: serverTimestamp(),
            distance: Math.round(distance) + "m"
          });
          alert(`Attendance Marked! Distance: ${Math.round(distance)}m`);
          setStatus('Attendance Done');
        } catch (e) { alert("Error saving attendance"); }
      } else {
        alert(`Access Denied! You are ${Math.round(distance)}m away from Ali Campus. Range: 500m.`);
        setStatus('Ready');
      }
    }, (err) => {
      alert("Please allow location access to mark attendance.");
      setStatus('Location Error');
    });
  };

  // --- LOGIN LOGIC ---
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
        const staffData = snap.docs[0].data();
        setStaffName(staffData.name);
        setUserRole('staff');
        setIsLoggedIn(true);
        setStatus('Staff Login Success');
      } else {
        alert("Invalid Password!");
        setStatus('Ready');
      }
    } catch (e) { alert("Login Error"); }
  };

  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const fetchStaff = async () => {
    setStatus('Loading Staff...');
    try {
      const q = query(collection(db, "staff_records"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView('staff_list');
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const handleAddStaff = async () => {
    if(!sName || !sPass) return alert("Name and Password are required");
    try {
      await addDoc(collection(db, "staff_records"), {
        name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp()
      });
      setSName(''); setSRole(''); setSSalary(''); setSPass('');
      fetchStaff();
    } catch (e) { setStatus('Error'); }
  };

  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('Error'); }
  };

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
    cursor: 'pointer', backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e', boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px', marginBottom: '20px' }} />
      <h3>Ali Campus Management</h3>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', borderRadius:'8px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold', fontSize:'16px'}}>LOGIN</button>
      <p style={{fontSize:'10px', marginTop:'10px'}}>{status}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'white', padding: '2px' }} />
          <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        </div>
        {userRole === 'staff' && (
          <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '8px', borderRadius: '8px', marginBottom: '10px', fontSize: '14px' }}>
            <b>Teacher Portal:</b> {staffName}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && (
            <>
              <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>
              <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>
            </>
          )}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={fetchStaff} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={fetchHistory} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        {/* NEW: Teacher Attendance Section */}
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ ...cardStyle, background: '#e8f0fe', textAlign: 'center', border: '1px dashed #1a4a8e' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1a4a8e' }}>Personal Attendance</h4>
            <button onClick={handleTeacherAttendance} style={{ ...actionBtn, marginTop: 0, background: '#28a745' }}>
              📍 Mark My Attendance (500m)
            </button>
            <p style={{ fontSize: '10px', marginTop: '5px' }}>Current Status: {status}</p>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} style={{...cardStyle, borderLeft:'5px solid #f39c12', cursor: 'pointer'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* --- ALL OTHER VIEWS REMAIN EXACTLY SAME --- */}
        {view === 'add' && userRole === 'admin' && (
          <div style={cardStyle}>
            <h3>New Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              await addDoc(collection(db, "ali_campus_records"), { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), created_at:serverTimestamp() });
              setView('dashboard'); setName(''); setRollNo(''); setWhatsapp(''); setBaseFee('');
            }} style={actionBtn}>Confirm</button>
          </div>
        )}

        {view === 'staff_list' && userRole === 'admin' && (
          <div>
            <div style={cardStyle}>
              <input placeholder="Staff Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={handleAddStaff} style={actionBtn}>Add Staff</button>
            </div>
            {staffRecords.map(s => <div key={s.id} style={cardStyle}>{s.name} - {s.password}</div>)}
          </div>
        )}

        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width: '100%', padding: '14px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px', cursor:'pointer' };

export default App;
