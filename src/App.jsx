import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; 

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

  // --- PDF LOGIC ---
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.text("Ali Campus - Dar-e-Arqam", 14, 15);
    doc.text(title, 14, 22);
    doc.autoTable({ head: [headers], body: bodyData, startY: 30 });
    doc.save(`${fileName}.pdf`);
  };

  // --- DATA FETCHING (FIXED BLANK ISSUE) ---
  const fetchData = async () => {
    if (!isLoggedIn) return;
    try {
      // Fetch Dashboard Stats
      const statsSnap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      statsSnap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);

      // Fetch View-Specific Data
      if (view === 'staff_list') {
        const s = await getDocs(query(collection(db, "staff_records")));
        setStaffRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      else if (view === 'history') {
        const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(h.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      else if (view === 'view' || view === 'attendance') {
        const q = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
        const snap = await getDocs(q);
        setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { console.error("Error fetching data:", e); }
  };

  useEffect(() => { fetchData(); }, [isLoggedIn, view, filterClass]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Wrong Password!");
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', cursor:'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', background:'white', padding:'5px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
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
        
        {/* DIRECTORY VIEW */}
        {view === 'view' && (
          <div>
            <input placeholder="Search Student..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.length === 0 ? <p>No records found.</p> : records.filter(r=>r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> ({r.roll_number})
                <div style={{marginTop:'5px'}}><button onClick={()=>{setEditingStudent(r); setName(r.student_name); setView('add');}} style={{background:'#f39c12', border:'none', color:'white', padding:'5px', borderRadius:'5px'}}>Edit</button></div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF LIST VIEW */}
        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h4>Add Staff</h4>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Pass" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={async ()=>{
                await addDoc(collection(db,"staff_records"),{name:sName, password:sPass});
                alert("Added"); setSName(''); setSPass(''); fetchData();
              }} style={actionBtn}>Save Staff</button>
            </div>
            {staffRecords.map(s => <div key={s.id} style={cardStyle}><b>{s.name}</b> (Pass: {s.password})</div>)}
          </div>
        )}

        {/* DASHBOARD STATS */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ATTENDANCE MARKING */}
        {view === 'attendance' && (
          <div>
            <h3>{filterClass} - {today}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'P'})} style={{background:attendance[r.student_name]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'A'})} style={{background:attendance[r.student_name]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db,"daily_attendance"), {class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp()});
              alert("Saved!"); setView('dashboard');
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* SELECTION SCREENS */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setView(view==='sel_view'?'view':'attendance')} style={actionBtn}>Open</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };

export default App;
