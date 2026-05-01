import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
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
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [classStats, setClassStats] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // --- CRITICAL DATA LOADER ---
  // Ye function har view change par sahi data load karega taake Admin panel blank na ho
  const loadDataForView = async (currentView) => {
    try {
      if (currentView === 'staff_list') {
        const s = await getDocs(collection(db, "staff_records"));
        setStaffRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      else if (currentView === 'history') {
        const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(h.docs.map(d => d.data()));
      }
      else if (currentView === 'dashboard') {
        const snap = await getDocs(collection(db, "ali_campus_records"));
        const stats = {};
        snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
        setClassStats(stats);
      }
    } catch (e) { console.error("Error loading data:", e); }
  };

  useEffect(() => {
    if (isLoggedIn) loadDataForView(view);
  }, [isLoggedIn, view]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Wrong Password!");
  };

  // --- PDF EXPORT ---
  const downloadPDF = (title, headers, data, fileName) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    doc.autoTable({ head: [headers], body: data, startY: 20 });
    doc.save(`${fileName}.pdf`);
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', cursor:'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', background:'white', borderRadius:'50%', padding:'5px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px', textAlign: 'center', color:'white' }}>
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
        
        {/* Staff / Teacher Panel - Mark Attendance Button */}
        {userRole === 'staff' && view === 'dashboard' && (
           <div style={cardStyle}>
             <button style={{width:'100%', padding:'15px', background:'#2ecc71', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>📍 Mark My Attendance</button>
           </div>
        )}

        {/* Dashboard Stats */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* Directory (Dir) View - FIXED BLANK ISSUE */}
        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> <br/>
                <small>Roll: {r.roll_number} | WA: {r.parent_whatsapp}</small>
              </div>
            ))}
            <button onClick={()=>setView('dashboard')} style={actionBtn}>Back</button>
          </div>
        )}

        {/* Staff List View - FIXED BLANK ISSUE */}
        {view === 'staff_list' && (
          <div>
            <h3>Staff Members</h3>
            {staffRecords.length === 0 ? <p>Loading staff...</p> : staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b> ({s.role}) <br/>
                <small>Salary: {s.salary} | Pass: {s.password}</small>
              </div>
            ))}
          </div>
        )}

        {/* Selection Screens */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>{view === 'sel_report' ? 'Generate Report' : 'Select Class'}</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={async ()=> {
               const q = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
               const snap = await getDocs(q);
               setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
               setView(view==='sel_view'?'view':view==='sel_report'?'report_final':'attendance');
            }} style={actionBtn}>Proceed</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginBottom:'10px', borderLeft:'5px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold' };

export default App;
