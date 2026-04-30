import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Aaj ki date auto-generate karne ke liye
  const today = new Date().toISOString().split('T')[0];

  // Dashboard Statistics (Strength)
  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => {
      const cls = d.data().class;
      stats[cls] = (stats[cls] || 0) + 1;
    });
    setClassStats(stats);
  };

  useEffect(() => { if(isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const handleLogin = () => {
    if(passInput === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert("Wrong Password!");
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSearchTerm(''); setView(target); setStatus('Success');
  };

  const handleSave = async () => {
    if(!name || !rollNo) return alert("Fill details");
    try {
      await addDoc(collection(db, "ali_campus_records"), { 
        student_name: name, roll_number: rollNo, class: selectedClass, 
        fee_status: 'Unpaid', created_at: serverTimestamp() 
      });
      setName(''); setRollNo(''); setView('dashboard'); fetchStats();
    } catch (e) { alert(e.message); }
  };

  const toggleFeeStatus = async (student) => {
    const newStatus = student.fee_status === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "ali_campus_records", student.id), { fee_status: newStatus });
    fetchRecordsByClass('view', filterClass);
  };

  const downloadPDF = (data) => {
    const doc = new jsPDF();
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: "center" });
    doc.text(`Class: ${data.class} | Date: ${data.date}`, 14, 25);
    const rows = Object.entries(data.attendance_data).map(([n, s], i) => [i + 1, n, s === 'P' ? 'Present' : 'Absent']);
    doc.autoTable({ startY: 30, head: [['Sr#', 'Name', 'Status']], body: rows });
    doc.save(`Report_${data.class}.pdf`);
  };

  const filteredRecords = records.filter(r => 
    (r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (r.roll_number?.toString().includes(searchTerm))
  );

  if (!isLoggedIn) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a4a8e', color: 'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', borderRadius:'5px'}} />
      <button onClick={handleLogin} style={{marginTop:'10px', padding:'10px 20px', background:'white', color:'#1a4a8e', border:'none', borderRadius:'5px', fontWeight:'bold'}}>Login</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={() => setView('history')} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* 2. Feature: Dashboard Strength */}
        {view === 'dashboard' && (
          <div>
            <h3>School Statistics</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              {CLASSES.map(c => (
                <div key={c} style={{...cardStyle, textAlign:'center'}}>
                  <div style={{fontSize:'12px', color:'#666'}}>{c}</div>
                  <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Feature: Auto Date in Attendance */}
        {(view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Mark Attendance</h3>
            <label>Date:</label>
            <input type="date" defaultValue={today} style={inputStyle} readOnly />
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass('attendance', filterClass)} style={actionBtn}>Start Marking</button>
          </div>
        )}

        {/* 1. Feature: Fees Status in Directory */}
        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <input placeholder="🔍 Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {filteredRecords.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <button onClick={() => toggleFeeStatus(r)} style={{fontSize:'10px', background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'3px', padding:'2px 5px'}}>
                    Fees: {r.fee_status || 'Unpaid'}
                  </button>
                </div>
                <button onClick={() => setEditingStudent(r)} style={{marginTop:'5px', fontSize:'10px', border:'1px solid #1a4a8e', color:'#1a4a8e', background:'none'}}>Edit Profile</button>
              </div>
            ))}
          </div>
        )}

        {/* Admission Form */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>New Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Register</button>
          </div>
        )}

        {/* Attendance Marking Logic */}
        {view === 'attendance' && (
           <div style={cardStyle}>
             <h3>{filterClass} - {today}</h3>
             {filteredRecords.map(r => (
               <div key={r.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}>
                 <span>{r.student_name}</span>
                 <div>
                   <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                   <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                 </div>
               </div>
             ))}
             {/* Save logic same as before */}
           </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '4px', color: 'white' };

export default App;
