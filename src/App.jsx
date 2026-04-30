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
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // --- 1. Dashboard Strength Logic ---
  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => {
        const cls = d.data().class;
        stats[cls] = (stats[cls] || 0) + 1;
      });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  // --- 2. History Logic (REFIXED) ---
  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(historyData);
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('Error fetching history'); }
  };

  // --- 3. Directory & Attendance Marking Fetch ---
  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading Students...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSearchTerm(''); 
      setAttendance({}); // Reset marking for new session
      setView(target);
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  // --- 4. Save Attendance ---
  const saveAttendance = async () => {
    if(Object.keys(attendance).length === 0) return alert("Mark attendance first!");
    setStatus('Saving...');
    try {
      await addDoc(collection(db, "daily_attendance"), {
        class: filterClass,
        date: today,
        attendance_data: attendance,
        timestamp: serverTimestamp()
      });
      setStatus('Attendance Saved!');
      setView('dashboard');
    } catch (e) { alert("Save Failed"); }
  };

  // Admission/Edit Logic
  const handleSave = async () => {
    if(!name || !rollNo || !whatsapp) return alert("Fill all fields!");
    try {
      await addDoc(collection(db, "ali_campus_records"), { 
        student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp,
        class: selectedClass, fee_status: 'Unpaid', created_at: serverTimestamp() 
      });
      setName(''); setRollNo(''); setWhatsapp(''); setView('dashboard');
    } catch (e) { alert(e.message); }
  };

  const handleLogin = () => {
    if(passInput === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert("Wrong Password!");
  };

  const filteredRecords = records.filter(r => 
    (r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (r.roll_number?.toString().includes(searchTerm))
  );

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', borderRadius:'5px'}} />
      <button onClick={handleLogin} style={{marginTop:'10px', padding:'10px 20px', background:'white', color:'#1a4a8e', border:'none', borderRadius:'5px'}}>Login</button>
    </div>
  );

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

        {/* --- 1. DASHBOARD --- */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} style={cardStyle}>
                <small style={{color:'#1a4a8e'}}>{c}</small>
                <div style={{fontSize:'18px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* --- 2. ATTENDANCE MARKING (FIXED BLANK SCREEN) --- */}
        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>Marking: {filterClass}</h3>
            {filteredRecords.length === 0 ? <p>No students found.</p> : filteredRecords.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{r.student_name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={saveAttendance} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* --- 3. HISTORY REPORTS (FIXED BLANK SCREEN) --- */}
        {view === 'history' && (
          <div>
            <h3>Reports Archive</h3>
            {history.length === 0 ? <p>No reports found.</p> : history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><b>{h.date}</b><br/><small>{h.class}</small></div>
                  <button style={{background:'#1a4a8e', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- 4. DIRECTORY & CLASS SELECTOR --- */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}

        {/* --- 5. ADMISSION --- */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (923...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Save</button>
          </div>
        )}

        {/* --- 6. DIRECTORY LIST --- */}
        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            {filteredRecords.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div><b>{r.student_name}</b> <br/> <small>Roll: {r.roll_number}</small></div>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{background:'#25D366', color:'white', padding:'5px 10px', borderRadius:'5px', textDecoration:'none', fontSize:'10px'}}>WhatsApp</a>
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
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', marginTop:'10px' };
const statusBtn = { padding: '8px 15px', border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold' };

export default App;
