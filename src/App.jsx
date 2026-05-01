import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, updateDoc, deleteDoc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');

  // Data States
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [editingId, setEditingId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // --- PDF LOGIC ---
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    doc.autoTable({ head: [headers], body: bodyData, startY: 25 });
    doc.save(`${fileName}.pdf`);
  };

  // --- CORE DATA FETCHING (FIXED BLANK ISSUE) ---
  const fetchAllData = async () => {
    if (!isLoggedIn) return;
    try {
      // 1. Always load dashboard stats
      const sSnap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      const allStuds = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      allStuds.forEach(s => { stats[s.class] = (stats[s.class] || 0) + 1; });
      setClassStats(stats);

      // 2. View specific data loading
      if (view === 'staff_list') {
        const staffSnap = await getDocs(collection(db, "staff_records"));
        setStaffRecords(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      else if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      else if (view === 'view' || view === 'attendance') {
        setRecords(allStuds.filter(s => s.class === filterClass));
      }
    } catch (e) { console.error("Fetch error:", e); }
  };

  useEffect(() => { fetchAllData(); }, [isLoggedIn, view, filterClass]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Invalid Password!");
  };

  const getNavStyle = (v) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#ffffff', color: '#1a4a8e', cursor: 'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width:'80px', background:'white', borderRadius:'50%', padding:'10px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 70px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => { setEditingId(null); setName(''); setRollNo(''); setView('add'); }} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={() => setView('staff_list')} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={() => setView('history')} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {/* DASHBOARD STATS */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {userRole === 'staff' && <button style={{gridColumn:'span 2', padding:'15px', background:'#2ecc71', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', marginBottom:'10px'}}>📍 MARK MY ATTENDANCE</button>}
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF LIST - FIXED BLANK */}
        {view === 'staff_list' && (
          <div>
            <h3>Staff Members</h3>
            {staffRecords.length === 0 ? <p>Loading staff data...</p> : staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{fontWeight:'bold'}}>{s.name}</div>
                <div style={{fontSize:'13px', color:'#666'}}>{s.role} | Salary: {s.salary}</div>
                <div style={{fontSize:'12px', color:'#1a4a8e'}}>Password: {s.password}</div>
              </div>
            ))}
          </div>
        )}

        {/* ATTENDANCE VIEW - FIXED BLANK */}
        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>{filterClass} ({today})</h3>
            {records.length === 0 ? <p>No students found.</p> : records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'P'})} style={{background:attendance[r.student_name]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'A'})} style={{background:attendance[r.student_name]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db,"daily_attendance"), {class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp()});
              alert("Attendance Submitted!"); setView('dashboard');
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* HISTORY & REPORTS SELECTION */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>{view === 'sel_report' ? 'Generate Report' : 'Select Class'}</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setView(view==='sel_view'?'view':'attendance')} style={actionBtn}>Proceed</button>
          </div>
        )}

        {/* DIRECTORY VIEW WITH EDIT/DELETE/WHATSAPP */}
        {view === 'view' && (
          <div>
            <h3>{filterClass} Directory</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{color:'#25D366', textDecoration:'none', fontWeight:'bold'}}>WhatsApp</a>
                </div>
                <div style={{fontSize:'12px', marginTop:'5px'}}>Roll: {r.roll_number} | Fee: {r.base_fee}</div>
                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                  <button onClick={()=>{ setEditingId(r.id); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setView('add'); }} style={{flex:1, padding:'8px', background:'#f39c12', color:'white', border:'none', borderRadius:'5px'}}>Edit</button>
                  <button onClick={async ()=>{ if(window.confirm("Delete?")) await deleteDoc(doc(db,"ali_campus_records",r.id)); fetchAllData(); }} style={{flex:1, padding:'8px', background:'#e74c3c', color:'white', border:'none', borderRadius:'5px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginBottom:'10px', borderLeft:'5px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', marginTop:'10px' };

export default App;
