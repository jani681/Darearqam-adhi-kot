import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Authentication Logic
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }
    // Teacher Login Check from Firestore
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setUserRole('teacher');
      setIsLoggedIn(true);
      setView('sel_att'); // Teachers go straight to attendance
    } else {
      alert("Invalid Password!");
    }
  };

  // Fetch Stats for Dashboard
  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { 
      const cls = d.data().class; 
      stats[cls] = (stats[cls] || 0) + 1; 
    });
    setClassStats(stats);
  };

  // Fetch History (Fixed: No longer blank)
  const fetchHistoryData = async () => {
    setView('history');
    const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // Fetch Monthly Reports
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

  useEffect(() => {
    if (isLoggedIn) fetchStats();
  }, [isLoggedIn, view]);

  if (!isLoggedIn) return (
    <div style={loginContainer}>
      <div style={loginBox}>
        <h2 style={{color:'#1a4a8e'}}>Ali Campus Management</h2>
        <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={inputStyle} />
        <button onClick={handleLogin} style={actionBtn}>LOGIN</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={headerStyle}>
        <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={navGrid}>
          {userRole === 'admin' && (
            <>
              <button onClick={() => setView('dashboard')} style={view === 'dashboard' ? activeNav : navBtn}>Home</button>
              <button onClick={() => setView('sel_view')} style={view === 'sel_view' ? activeNav : navBtn}>Directory</button>
              <button onClick={fetchHistoryData} style={view === 'history' ? activeNav : navBtn}>History</button>
              <button onClick={() => setView('sel_report')} style={view === 'sel_report' ? activeNav : navBtn}>Reports</button>
            </>
          )}
          <button onClick={() => setView('sel_att')} style={view === 'sel_att' ? activeNav : navBtn}>Attend</button>
          <button onClick={() => setIsLoggedIn(false)} style={navBtn}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        {/* Dashboard with Attractive Orange Border Buttons */}
        {view === 'dashboard' && (
          <div style={gridStyle}>
            {CLASSES.map(c => (
              <div key={c} style={classCard}>
                <h4 style={{margin:'0 0 5px 0', color:'#1a4a8e'}}>{c}</h4>
                <div style={countBadge}>{classStats[c] || 0}</div>
                <button onClick={async () => {
                   setFilterClass(c);
                   const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                   const snap = await getDocs(q);
                   setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                   setView('view_class');
                }} style={viewBtn}>View Students</button>
              </div>
            ))}
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div>
            <h3>Attendance History</h3>
            {history.map(h => (
              <div key={h.id} style={recordCard}>
                <b>{h.class}</b> - {h.date}
                <button onClick={() => {
                  const doc = new jsPDF();
                  doc.text(`Attendance: ${h.class} (${h.date})`, 10, 10);
                  doc.autoTable({ head: [['Name', 'Status']], body: Object.entries(h.attendance_data) });
                  doc.save(`${h.class}_report.pdf`);
                }} style={pdfBtn}>Download PDF</button>
              </div>
            ))}
          </div>
        )}

        {/* Student List View */}
        {view === 'view_class' && (
          <div>
            <input placeholder="Search Name..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={recordCard}>
                <b>{r.student_name}</b> (Roll: {r.roll_number})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- STYLES ---
const headerStyle = { background: '#1a4a8e', padding: '20px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 100 };
const navGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' };
const navBtn = { padding: '10px', borderRadius: '5px', border: 'none', background: '#fff', color: '#1a4a8e', fontWeight: 'bold', fontSize: '12px' };
const activeNav = { ...navBtn, background: '#FF9800', color: '#fff' };
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const classCard = { background: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF9800', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const countBadge = { fontSize: '24px', fontWeight: 'bold', color: '#FF9800', margin: '5px 0' };
const viewBtn = { background: '#1a4a8e', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' };
const recordCard = { background: '#fff', padding: '15px', margin: '10px 0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const pdfBtn = { background: '#FF9800', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px' };
const inputStyle = { width: '100%', padding: '12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '12px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const loginContainer = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1a4a8e' };
const loginBox = { background: '#fff', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '350px', textAlign: 'center' };
