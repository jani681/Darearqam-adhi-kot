import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, updateDoc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  // Authentication & Role States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  
  // Navigation & Data States
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  
  // Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // --- TRIPLE-CHECKED DATA LOADER ---
  const loadEssentialData = async () => {
    if (!isLoggedIn) return;
    try {
      // 1. Load Dashboard Stats (Always needed)
      const studentSnap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      const allStudents = [];
      studentSnap.docs.forEach(d => {
        const data = d.data();
        const cls = data.class;
        stats[cls] = (stats[cls] || 0) + 1;
        allStudents.push({ id: d.id, ...data });
      });
      setClassStats(stats);

      // 2. Load View-Specific Data
      if (view === 'staff_list' && userRole === 'admin') {
        const sSnap = await getDocs(collection(db, "staff_records"));
        setStaffRecords(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      else if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => d.data()));
      }
      else if (view === 'view') {
        // Filter students for the Directory based on selected class
        setRecords(allStudents.filter(s => s.class === filterClass));
      }
    } catch (e) {
      console.error("Data Fetch Error:", e);
    }
  };

  useEffect(() => {
    loadEssentialData();
  }, [isLoggedIn, view, filterClass]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setStaffName(snap.docs[0].data().name);
      setUserRole('staff');
      setIsLoggedIn(true);
    } else {
      alert("Invalid Password!");
    }
  };

  const getNavStyle = (v) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#ffffff', color: '#1a4a8e', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width:'80px', background:'white', borderRadius:'50%', padding:'5px', marginBottom:'10px' }} />
      <h2 style={{margin:'0 0 20px'}}>Ali Campus Portal</h2>
      <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'260px', border:'none', textAlign:'center', fontSize:'16px'}} />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 80px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', fontSize:'16px'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Header & Fixed Navigation */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        {userRole === 'staff' && <p style={{margin:'5px 0 0', fontSize:'12px', opacity:0.8}}>Teacher: {staffName}</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#eef2f7', padding:'10px', borderRadius:'15px' }}>
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
        
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div>
            {userRole === 'staff' && (
              <button style={{width:'100%', padding:'18px', background:'#2ecc71', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', marginBottom:'20px', fontSize:'16px', boxShadow:'0 4px 10px rgba(46,204,113,0.3)'}}>📍 Mark My Attendance</button>
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

        {/* STAFF LIST - FIXED BLANK */}
        {view === 'staff_list' && (
          <div>
            <h3 style={{color:'#1a4a8e', borderBottom:'2px solid #f39c12', paddingBottom:'5px'}}>Staff Directory</h3>
            {staffRecords.length === 0 ? <div style={cardStyle}>Loading staff records...</div> : staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{fontWeight:'bold', fontSize:'16px'}}>{s.name}</div>
                <div style={{fontSize:'13px', color:'#7f8c8d'}}>{s.role} | Salary: {s.salary}</div>
                <div style={{fontSize:'12px', color:'#1a4a8e', marginTop:'5px'}}>Pass: {s.password}</div>
              </div>
            ))}
          </div>
        )}

        {/* DIRECTORY (Dir) - FIXED BLANK */}
        {view === 'view' && (
          <div>
            <h3 style={{color:'#1a4a8e'}}>{filterClass} Students</h3>
            {records.length === 0 ? <div style={cardStyle}>No students found in this class.</div> : records.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <span style={{color:'#f39c12', fontWeight:'bold'}}>#{r.roll_number}</span>
                </div>
                <div style={{fontSize:'13px', marginTop:'5px'}}>WhatsApp: {r.parent_whatsapp}</div>
                <div style={{fontSize:'13px'}}>Fee: {r.base_fee} | Arrears: {r.arrears || 0}</div>
              </div>
            ))}
            <button onClick={()=>setView('dashboard')} style={actionBtn}>Back to Home</button>
          </div>
        )}

        {/* ADD STUDENT */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>New Admission</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="Parent WhatsApp (92...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input placeholder="Previous Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              if(!name || !rollNo) return alert("Fill Name and Roll!");
              await addDoc(collection(db,"ali_campus_records"), { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears), timestamp:serverTimestamp() });
              alert("Admitted!"); setName(''); setRollNo(''); setView('dashboard');
            }} style={actionBtn}>Save Record</button>
          </div>
        )}

        {/* SELECTION SCREENS */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setView(view === 'sel_view' ? 'view' : view === 'sel_report' ? 'report' : 'attendance')} style={actionBtn}>Open Class</button>
          </div>
        )}

        {/* ATTENDANCE HISTORY */}
        {view === 'history' && (
          <div>
            <h3 style={{color:'#1a4a8e'}}>Attendance Log</h3>
            {history.map((h, i) => (
              <div key={i} style={cardStyle}>
                <div style={{fontWeight:'bold'}}>{h.date}</div>
                <div style={{color:'#f39c12'}}>{h.class}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'14px' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', marginTop:'10px', cursor:'pointer' };

export default App;
