import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, updateDoc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_LOCATION = { lat: 32.1072678, lng: 71.8037100 };

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Data States
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState([]);

  // Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // --- PDF GENERATOR (FIXED) ---
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.autoTable({ head: [headers], body: bodyData, startY: 25 });
    doc.save(`${fileName}.pdf`);
  };

  // --- DATA FETCHING ENGINE (FORCE LOAD) ---
  const fetchData = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const studentSnap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      const allData = [];
      studentSnap.docs.forEach(d => {
        const data = d.data();
        stats[data.class] = (stats[data.class] || 0) + 1;
        allData.push({ id: d.id, ...data });
      });
      setClassStats(stats);

      if (view === 'staff_list') {
        const sSnap = await getDocs(collection(db, "staff_records"));
        setStaffRecords(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (view === 'view' || view === 'attendance') {
        setRecords(allData.filter(s => s.class === filterClass));
      }
    } catch (e) { console.error("Fetch Error:", e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [isLoggedIn, view, filterClass]);

  // --- LOGIN ---
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Ghalat Password!");
  };

  // --- TEACHER ATTENDANCE (CLICK FIX) ---
  const markTeacherAtt = () => {
    if (!navigator.geolocation) return alert("Location not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp() });
      alert("Attendance Marked Successfully!");
    }, () => alert("GPS On Karein!"));
  };

  const getNavStyle = (v) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#ffffff', color: '#1a4a8e', cursor: 'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width:'80px', background:'white', borderRadius:'50%', padding:'10px' }} />
      <h2 style={{color:'white', margin:'20px 0'}}>Ali Campus Portal</h2>
      <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 70px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={() => setView('staff_list')} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={() => setView('history')} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div>
            {userRole === 'staff' && (
              <button onClick={markTeacherAtt} style={{width:'100%', padding:'18px', background:'#2ecc71', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', marginBottom:'20px'}}>📍 MARK MY ATTENDANCE</button>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              {CLASSES.map(c => (
                <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                  <small style={{color:'#7f8c8d'}}>{c}</small>
                  <div style={{fontSize:'22px', fontWeight:'bold', color:'#2c3e50'}}>{classStats[c] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3>History</h3>
              <button onClick={() => downloadPDF("Attendance History", ["Date", "Class"], history.map(h => [h.date, h.class]), "History")} style={{background:'#273c75', color:'white', border:'none', padding:'8px 15px', borderRadius:'8px'}}>PDF</button>
            </div>
            {history.map(h => <div key={h.id} style={cardStyle}>{h.date} - {h.class}</div>)}
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <h3>Staff Records</h3>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b> ({s.role}) <br/>
                <small>Salary: {s.salary} | Pass: {s.password}</small>
              </div>
            ))}
          </div>
        )}

        {view === 'view' && (
          <div>
            <h3>{filterClass} Directory</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> (Roll: {r.roll_number}) <br/>
                <small>WA: {r.parent_whatsapp} | Fee: {r.base_fee}</small>
              </div>
            ))}
          </div>
        )}

        {/* Selection Screens */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setView(view==='sel_view'?'view':'attendance')} style={actionBtn}>Proceed</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold' };

export default App;
