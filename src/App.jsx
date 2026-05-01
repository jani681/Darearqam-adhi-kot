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

  // Core Data States
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // --- PDF GENERATOR ---
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Ali Campus - Dar-e-Arqam", 14, 15);
    doc.setFontSize(12);
    doc.text(title, 14, 22);
    doc.autoTable({ head: [headers], body: bodyData, startY: 30, theme: 'grid' });
    doc.save(`${fileName}.pdf`);
  };

  // --- FORCE DATA FETCHING ---
  const syncData = async () => {
    if (!isLoggedIn) return;
    try {
      // 1. Dashboard Stats
      const sSnap = await getDocs(collection(db, "ali_campus_records"));
      const allStuds = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const stats = {};
      allStuds.forEach(s => stats[s.class] = (stats[s.class] || 0) + 1);
      setClassStats(stats);

      // 2. Attendance/Directory Loading
      if (view === 'attendance' || view === 'view') {
        const filtered = allStuds.filter(s => s.class === filterClass);
        setRecords(filtered);
      }

      // 3. History Loading
      if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => d.data()));
      }

      // 4. Monthly Reports Logic (The "Blank" Fix)
      if (view === 'report_final') {
        const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
        const rSnap = await getDocs(q);
        const reportMap = {};
        
        rSnap.docs.forEach(d => {
          const data = d.data();
          if (data.date && data.date.startsWith(selectedMonth)) {
            Object.entries(data.attendance_data || {}).forEach(([name, status]) => {
              if (!reportMap[name]) reportMap[name] = { p: 0, a: 0 };
              status === 'P' ? reportMap[name].p++ : reportMap[name].a++;
            });
          }
        });
        setMonthlyData(Object.entries(reportMap));
      }
    } catch (e) { console.error("Sync Error:", e); }
  };

  useEffect(() => { syncData(); }, [isLoggedIn, view, filterClass, selectedMonth]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Wrong Password!");
  };

  const navBtn = (v) => ({
    padding: '10px 2px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#fff', color: '#1a4a8e', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width:'80px', background:'white', borderRadius:'50%', padding:'10px' }} />
      <h2 style={{color:'white', margin:'20px 0'}}>Ali Campus</h2>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'250px', textAlign:'center', border:'none'}} placeholder="Enter Password" />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 80px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Navigation Header */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h4 style={{margin:0}}>ALI CAMPUS MANAGEMENT</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginTop:'15px', background:'rgba(255,255,255,0.1)', padding:'8px', borderRadius:'12px' }}>
          <button onClick={() => setView('dashboard')} style={navBtn('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={navBtn('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={navBtn('sel_att')}>✅ Atten</button>
          <button onClick={() => setView('history')} style={navBtn('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={navBtn('sel_report')}>📊 Reprt</button>}
          <button onClick={() => setIsLoggedIn(false)} style={navBtn('out')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {/* ATTENDANCE SCREEN */}
        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>{filterClass} Attendance</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span>{r.student_name}</span>
                  <div>
                    <button onClick={()=>setAttendance({...attendance, [r.student_name]:'P'})} style={{background:attendance[r.student_name]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                    <button onClick={()=>setAttendance({...attendance, [r.student_name]:'A'})} style={{background:attendance[r.student_name]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px'}}>A</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db,"daily_attendance"), {class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp()});
              alert("Submitted!"); setView('dashboard');
            }} style={actionBtn}>Save Attendance</button>
          </div>
        )}

        {/* FINAL REPORT SCREEN */}
        {view === 'report_final' && (
          <div style={cardStyle}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
              <h4 style={{margin:0}}>{filterClass} ({selectedMonth})</h4>
              <button onClick={()=>downloadPDF(`${filterClass} - ${selectedMonth}`, ["Student", "P", "A"], monthlyData.map(([n,s])=>[n,s.p,s.a]), "Report")} style={{background:'#273c75', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px'}}>PDF</button>
            </div>
            {monthlyData.length === 0 ? <p>No records for this month.</p> : (
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8f9fa'}}><th style={{padding:'10px', textAlign:'left'}}>Name</th><th>P</th><th>A</th></tr></thead>
                <tbody>{monthlyData.map(([n,s]) => (
                  <tr key={n} style={{borderBottom:'1px solid #eee'}}><td style={{padding:'10px'}}>{n}</td><td style={{textAlign:'center', color:'green'}}>{s.p}</td><td style={{textAlign:'center', color:'red'}}>{s.a}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {/* DASHBOARD STATS */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {userRole === 'staff' && <button style={{gridColumn:'span 2', padding:'15px', background:'#2ecc71', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', marginBottom:'10px'}}>📍 MARK TEACHER ATTENDANCE</button>}
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* SELECTION SCREENS */}
        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>{view === 'sel_report' ? 'Report Settings' : 'Select Class'}</h3>
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

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 10px rgba(0,0,0,0.08)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };

export default App;
