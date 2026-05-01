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

  // --- LOCATION LOGIC ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = () => {
    if (!navigator.geolocation) return alert("Location not supported");
    setStatus('Checking Location...');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const dist = calculateDistance(position.coords.latitude, position.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
      if (dist <= 500) {
        try {
          await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp(), distance: Math.round(dist) + "m" });
          alert("Attendance Marked!"); setStatus('Done');
        } catch (e) { alert("Error!"); }
      } else { alert(`Too far! ${Math.round(dist)}m away.`); setStatus('Ready'); }
    }, () => { alert("Allow Location Access!"); });
  };

  // --- CORE FUNCTIONS ---
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
      else alert("Wrong Password!");
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

  const generateMonthlySummary = async (cls) => {
    const q = query(collection(db, "daily_attendance"), where("class", "==", cls));
    const snap = await getDocs(q);
    const summary = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.date?.startsWith(selectedMonth)) {
        Object.entries(data.attendance_data).forEach(([std, stat]) => {
          if (!summary[std]) summary[std] = { p: 0, a: 0 };
          stat === 'P' ? summary[std].p++ : summary[std].a++;
        });
      }
    });
    setMonthlyData(Object.entries(summary));
    setView('monthly_report');
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '9px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: view === t ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center', border:'none'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3>DAR-E-ARQAM (ALI CAMPUS)</h3>
        {userRole === 'staff' && <div style={{background:'rgba(255,255,255,0.2)', padding:'5px', borderRadius:'8px', fontSize:'12px'}}>Teacher: {staffName}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'10px', background:'#f0f2f5', padding:'8px', borderRadius:'12px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => { const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()}))); setView('staff_list'); }} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={async () => { const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp","desc"))); setHistory(h.docs.map(d=>({id:d.id, ...d.data()}))); setView('history'); }} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'#e8f0fe', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'10px', border:'1px dashed #1a4a8e' }}>
            <button onClick={handleTeacherAttendance} style={{ width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📍 Mark My Attendance</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} style={cardStyle}>
                <small>{c}</small> <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Edit" : "Admit"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee) };
              editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              setView('dashboard'); setEditingStudent(null); setName(''); setRollNo('');
            }} style={actionBtn}>Save</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="Search..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r=>r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> (Roll: {r.roll_number})
                <div style={{marginTop:'5px'}}>
                  <button onClick={()=>{setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setView('add');}} style={{background:'#f39c12', color:'white', border:'none', padding:'5px', borderRadius:'5px', marginRight:'5px'}}>Edit</button>
                  <button onClick={async ()=>{if(window.confirm("Del?")){await deleteDoc(doc(db,"ali_campus_records",r.id)); fetchRecordsByClass('view',filterClass);}}} style={{background:'red', color:'white', border:'none', padding:'5px', borderRadius:'5px'}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div>
            <h3>{filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'P'})} style={{background:attendance[r.student_name]==='P'?'green':'#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.student_name]:'A'})} style={{background:attendance[r.student_name]==='A'?'red':'#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{await addDoc(collection(db,"daily_attendance"), {class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp()}); setView('dashboard'); alert("Saved!");}} style={actionBtn}>Submit</button>
          </div>
        )}

        {view === 'history' && history.map(h => (
          <div key={h.id} style={cardStyle}>{h.date} - {h.class}</div>
        ))}

        {view === 'staff_list' && (
          <div>
            <input placeholder="Name" onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
            <input placeholder="Pass" onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
            <button onClick={async ()=>{await addDoc(collection(db,"staff_records"),{name:sName, password:sPass, created_at:serverTimestamp()}); alert("Added");}} style={actionBtn}>Add</button>
            {staffRecords.map(s => <div key={s.id} style={cardStyle}>{s.name} ({s.password})</div>)}
          </div>
        )}

        {view === 'monthly_report' && (
          <div style={{background:'white', padding:'10px', borderRadius:'10px'}}>
             <table>
               <thead><tr><th>Name</th><th>P</th><th>A</th></tr></thead>
               <tbody>{monthlyData.map(([n,s])=>(<tr key={n}><td>{n}</td><td>{s.p}</td><td>{s.a}</td></tr>))}</tbody>
             </table>
             <button onClick={()=>setView('dashboard')} style={actionBtn}>Back</button>
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <button onClick={()=>view==='sel_report'?generateMonthlySummary(filterClass):fetchRecordsByClass(view==='sel_view'?'view':'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'10px', borderLeft:'5px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'5px 0', borderRadius:'8px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'14px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', marginTop:'10px' };

export default App;
