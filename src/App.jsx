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
  const [monthlyData, setMonthlyData] = useState([]);

  // Student Form States
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

  // --- MASTER DATA FETCHER (NO BLANKS) ---
  const loadSystemData = async () => {
    if (!isLoggedIn) return;
    try {
      // Load All Students for Stats & Filtering
      const sSnap = await getDocs(collection(db, "ali_campus_records"));
      const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const stats = {};
      allStudents.forEach(s => { stats[s.class] = (stats[s.class] || 0) + 1; });
      setClassStats(stats);

      // View Specific Data
      if (view === 'view' || view === 'attendance') {
        setRecords(allStudents.filter(s => s.class === filterClass));
      }
      if (view === 'staff_list') {
        const staffSnap = await getDocs(collection(db, "staff_records"));
        setStaffRecords(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => d.data()));
      }
      if (view === 'report_final') {
        const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
        const rSnap = await getDocs(q);
        const summary = {};
        rSnap.docs.forEach(d => {
          const data = d.data();
          if (data.date?.startsWith(selectedMonth)) {
            Object.entries(data.attendance_data).forEach(([std, stat]) => {
              if (!summary[std]) summary[std] = { p: 0, a: 0 };
              stat === 'P' ? summary[std].p++ : summary[std].a++;
            });
          }
        });
        setMonthlyData(Object.entries(summary));
      }
    } catch (e) { console.error("Database Error:", e); }
  };

  useEffect(() => { loadSystemData(); }, [isLoggedIn, view, filterClass, selectedMonth]);

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
      <h3>Ali Campus Management</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'250px', textAlign:'center', marginTop:'10px'}} />
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
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ADMISSION / EDIT STUDENT */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingId ? 'Update Student' : 'Student Admission'}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
              const data = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:filterClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingId ? await updateDoc(doc(db,"ali_campus_records", editingId), data) : await addDoc(collection(db,"ali_campus_records"), {...data, timestamp:serverTimestamp()});
              alert("Saved!"); setView('dashboard');
            }} style={actionBtn}>Confirm Record</button>
          </div>
        )}

        {/* DIRECTORY VIEW */}
        {view === 'view' && (
          <div>
            <h3>{filterClass} - Directory</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{color:'#25D366', textDecoration:'none', fontWeight:'bold'}}>WhatsApp</a>
                </div>
                <div style={{fontSize:'12px', margin:'5px 0'}}>Roll: {r.roll_number} | Fee: {r.base_fee}</div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button onClick={()=>{ setEditingId(r.id); setName(r.student_name); setRollNo(r.roll_number); setView('add'); }} style={{flex:1, padding:'6px', background:'#f39c12', color:'white', border:'none', borderRadius:'5px'}}>Edit</button>
                  <button onClick={async ()=>{ if(window.confirm("Delete?")) await deleteDoc(doc(db,"ali_campus_records",r.id)); loadSystemData(); }} style={{flex:1, padding:'6px', background:'#e74c3c', color:'white', border:'none', borderRadius:'5px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <h3>Attendance Log</h3>
              <button onClick={()=>downloadPDF("Attendance History", ["Date", "Class"], history.map(h=>[h.date, h.class]), "History")} style={{padding:'5px 12px', background:'#273c75', color:'white', border:'none', borderRadius:'5px'}}>PDF</button>
            </div>
            {history.map((h, i) => <div key={i} style={cardStyle}>{h.date} - {h.class}</div>)}
          </div>
        )}

        {/* STAFF LIST */}
        {view === 'staff_list' && (
          <div>
            <h3>Staff Members</h3>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b> ({s.role}) <br/>
                <small>Pass: {s.password} | Sal: {s.salary}</small>
              </div>
            ))}
          </div>
        )}

        {/* SELECTION SCREENS */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={()=>setView(view==='sel_view'?'view':view==='sel_report'?'report_final':'attendance')} style={actionBtn}>Open</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginBottom:'10px', borderLeft:'5px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold' };

export default App;
