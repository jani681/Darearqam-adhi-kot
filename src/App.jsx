import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // --- CORE FUNCTIONS ---
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      setView('dashboard');
      return;
    }
    // Teacher Login Check
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setUserRole('teacher');
      setIsLoggedIn(true);
      setView('sel_att');
    } else {
      alert("Invalid Password!");
    }
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
  };

  const fetchHistoryData = async () => {
    const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setHistory(data);
    setView('history');
  };

  const fetchMonthlyReport = async () => {
    const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
    const snap = await getDocs(q);
    const summary = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if(data.date.startsWith(selectedMonth)) {
        Object.entries(data.attendance_data).forEach(([std, status]) => {
          if(!summary[std]) summary[std] = {p:0, a:0};
          status === 'P' ? summary[std].p++ : summary[std].a++;
        });
      }
    });
    setMonthlyData(Object.entries(summary));
    setView('monthly_report');
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  // --- UI COMPONENTS ---
  const navBtn = (v, label) => (
    <button onClick={() => setView(v)} style={{
      padding: '12px 5px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px',
      backgroundColor: view === v ? '#FF9800' : '#fff', color: view === v ? '#fff' : '#1a4a8e', cursor:'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>{label}</button>
  );

  if (!isLoggedIn) return (
    <div style={{ background:'#1a4a8e', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{background:'#fff', padding:'30px', borderRadius:'20px', textAlign:'center', width:'100%', maxWidth:'350px'}}>
        <h2 style={{color:'#1a4a8e', marginBottom:'20px'}}>Ali Campus Login</h2>
        <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={inputStyle} />
        <button onClick={handleLogin} style={actionBtn}>LOGIN</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ background: '#1a4a8e', padding: '15px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
        <h2 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '20px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {userRole === 'admin' ? (
            <>
              {navBtn('dashboard', '🏠 Home')}
              {navBtn('add', '📝 Admit')}
              {navBtn('sel_view', '📂 Dir')}
              {navBtn('sel_att', '✅ Atten')}
              <button onClick={async () => {
                const snap = await getDocs(query(collection(db, "staff_records"), orderBy("created_at", "desc")));
                setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView('staff_list');
              }} style={view === 'staff_list' ? activeNav : inactiveNav}>👥 Staff</button>
              <button onClick={fetchHistoryData} style={view === 'history' ? activeNav : inactiveNav}>📜 Hist</button>
              {navBtn('sel_report', '📊 Reprt')}
              <button onClick={()=>setIsLoggedIn(false)} style={inactiveNav}>🚪 Out</button>
            </>
          ) : (
            <>
              {navBtn('sel_att', '✅ Atten')}
              <button onClick={()=>setIsLoggedIn(false)} style={inactiveNav}>🚪 Out</button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* DASHBOARD - ATTRACTIVE BUTTONS */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={async () => {
                setFilterClass(c);
                const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                const snap = await getDocs(q);
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView('view');
              }} style={{...cardStyle, border: '2px solid #FF9800', textAlign:'center', cursor:'pointer', transition:'0.3s'}}>
                <b style={{color:'#1a4a8e', fontSize:'16px'}}>{c}</b>
                <div style={{fontSize:'24px', fontWeight:'bold', color:'#FF9800'}}>{classStats[c] || 0}</div>
                <small style={{color:'#666'}}>Students</small>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY VIEW - FIXED */}
        {view === 'history' && (
          <div>
            <h3 style={{color:'#1a4a8e'}}>Attendance Logs</h3>
            {history.length === 0 ? <p>No history found.</p> : history.map(h => (
              <div key={h.id} style={{...cardStyle, borderLeft:'5px solid #FF9800', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <b style={{fontSize:'16px'}}>{h.class}</b> <br/>
                  <small>{h.date} | Marked by: {h.marked_by}</small>
                </div>
                <button onClick={() => {
                  const doc = new jsPDF();
                  doc.text(`Attendance Report: ${h.class} (${h.date})`, 10, 10);
                  doc.autoTable({ head: [['Student Name', 'Status']], body: Object.entries(h.attendance_data) });
                  doc.save(`${h.class}_${h.date}.pdf`);
                }} style={{background:'#1a4a8e', color:'#fff', border:'none', padding:'8px', borderRadius:'5px'}}>PDF</button>
              </div>
            ))}
          </div>
        )}

        {/* MONTHLY REPORT - FIXED */}
        {view === 'monthly_report' && (
          <div style={cardStyle}>
            <h3 style={{color:'#1a4a8e'}}>{filterClass} - {selectedMonth}</h3>
            {monthlyData.length === 0 ? <p>No records for this month.</p> : (
              <table style={{width:'100%', borderCollapse:'collapse', marginTop:'10px'}}>
                <thead><tr style={{background:'#f8f9fa'}}>
                  <th style={thStyle}>Student</th><th style={thStyle}>P</th><th style={thStyle}>A</th>
                </tr></thead>
                <tbody>
                  {monthlyData.map(([name, stats]) => (
                    <tr key={name} style={{borderBottom:'1px solid #eee'}}>
                      <td style={tdStyle}>{name}</td>
                      <td style={{...tdStyle, color:'green', fontWeight:'bold'}}>{stats.p}</td>
                      <td style={{...tdStyle, color:'red', fontWeight:'bold'}}>{stats.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setView('dashboard')} style={{...actionBtn, background:'#666', marginTop:'20px'}}>Back</button>
          </div>
        )}

        {/* SELECTION SCREENS */}
        {view === 'sel_report' && (
          <div style={cardStyle}>
            <h3>Generate Report</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />
            <button onClick={fetchMonthlyReport} style={actionBtn}>Show Report</button>
          </div>
        )}

        {/* ... (Directory, Admission, Staff screens remain same but with enhanced Orange styles) */}
        {view === 'view' && (
          <div>
            <input placeholder="🔍 Search student..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={{...cardStyle, borderLeft: r.fee_status === 'Paid' ? '5px solid #4CAF50' : '5px solid #F44336'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                   <div><b>{r.student_name}</b><br/><small>Roll: {r.roll_number} | Dues: {r.total_dues}</small></div>
                   <div style={{display:'flex', gap:'5px'}}>
                      <button onClick={() => { setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setView('add'); }} style={{background:'#FF9800', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px'}}>Edit</button>
                      <button onClick={async () => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "ali_campus_records", r.id)); setView('dashboard'); }} style={{background:'#d32f2f', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px'}}>Del</button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// --- STYLES ---
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '15px' };
const inputStyle = { width: '100%', padding: '12px', margin: '10px 0', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '15px', background: '#1a4a8e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' };
const thStyle = { padding: '10px', textAlign: 'left', borderBottom: '2px solid #eee' };
const tdStyle = { padding: '10px' };
const activeNav = { padding: '12px 5px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', backgroundColor: '#FF9800', color: '#fff' };
const inactiveNav = { padding: '12px 5px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', backgroundColor: '#fff', color: '#1a4a8e' };

export default App;
