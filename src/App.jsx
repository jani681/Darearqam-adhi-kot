import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where } from "firebase/firestore"; 
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
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);

  // --- PDF Logic ---
  const downloadPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(26, 74, 142);
    doc.text("DAR-E-ARQAM (ALI CAMPUS) ADHI KOT", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Attendance Report: ${data.class}`, 14, 25);
    doc.text(`Date: ${data.date}`, 14, 32);
    const tableRows = [];
    Object.entries(data.attendance_data).forEach(([name, status], index) => {
      tableRows.push([index + 1, name, status === 'P' ? 'Present' : 'Absent']);
    });
    doc.autoTable({
      startY: 40,
      head: [['Sr#', 'Student Name', 'Status']],
      body: tableRows,
      headStyles: { fillColor: [26, 74, 142] },
    });
    doc.save(`Attendance_${data.class}_${data.date}.pdf`);
  };

  // --- Admission Logic (Fixed) ---
  const handleSave = async () => {
    if(!name || !rollNo) return alert("Please enter all details");
    setStatus('Saving...');
    try {
      await addDoc(collection(db, "ali_campus_records"), { 
        student_name: name, 
        roll_number: rollNo, 
        class: selectedClass, 
        created_at: serverTimestamp() 
      });
      setName(''); 
      setRollNo(''); 
      setStatus('Student Registered!');
      setView('dashboard');
    } catch (e) { 
      alert("Error: " + e.message); 
      setStatus('Error');
    }
  };

  const handleLogin = () => {
    if(passInput === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert("Wrong Password!");
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSearchTerm(''); 
    setView(target);
    setStatus('Success');
  };

  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('Error'); }
  };

  const filteredRecords = records.filter(r => 
    (r.student_name && r.student_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (r.roll_number && r.roll_number.toString().includes(searchTerm))
  );

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a4a8e', color: 'white' }}>
        <h3>Ali Campus Login</h3>
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', color: 'black' }}>
          <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', width:'200px'}} />
          <button onClick={handleLogin} style={{display:'block', width:'100%', marginTop:'10px', padding:'10px', background:'#1a4a8e', color:'white', border:'none'}}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center', position: 'relative' }}>
        <button onClick={() => setIsLoggedIn(false)} style={{ position: 'absolute', top: '10px', right: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '10px' }}>LOGOUT</button>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={fetchHistory} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign:'center', fontSize:'10px', color:'#666'}}>{status}</p>

        {view === 'dashboard' && <div style={{textAlign:'center'}}><h3>Admin Panel Active</h3><p>Manage your students and attendance from the menu above.</p></div>}

        {/* Admission Form (Fixed Display) */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>New Student Registration</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Register Student</button>
          </div>
        )}

        {/* Directory & Attendance with Search */}
        {(view === 'view' || view === 'attendance') && (
          <input type="text" placeholder="🔍 Search Students..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
        )}

        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            {filteredRecords.map(r => (
              <div key={r.id} style={cardStyle}><b>{r.student_name}</b> (Roll: {r.roll_number})</div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Attendance: {filterClass}</h3>
            {filteredRecords.map(r => (
              <div key={r.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open Class</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            <h3>Attendance Reports</h3>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div><b>{h.date}</b><br/><small>{h.class}</small></div>
                   <button onClick={() => downloadPDF(h)} style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '12px' }}>Download PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px', cursor: 'pointer' };
const cardStyle = { background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '4px', color: 'white' };

export default App;
