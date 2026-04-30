import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc } from "firebase/firestore"; 

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingId, setEditingId] = useState(null);

  const handleLogin = () => {
    if(passInput === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setStatus('Access Granted');
    } else {
      alert("Ghalat Password!");
    }
  };

  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('History Error'); }
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView(target);
  };

  const handleSave = async () => {
    if(!name || !rollNo) return alert("Details bharen");
    try {
      if (editingId) {
        await updateDoc(doc(db, "ali_campus_records", editingId), { student_name: name, roll_number: rollNo, class: selectedClass });
      } else {
        await addDoc(collection(db, "ali_campus_records"), { student_name: name, roll_number: rollNo, class: selectedClass, created_at: serverTimestamp() });
      }
      setName(''); setRollNo(''); setView('dashboard');
    } catch (e) { alert(e.message); }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a4a8e', color: 'white' }}>
        <h2>Ali Campus Portal</h2>
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', color: 'black', textAlign: 'center' }}>
          <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{ padding: '10px', width: '200px', borderRadius: '5px', border: '1px solid #ddd' }} />
          <button onClick={handleLogin} style={{ display: 'block', width: '100%', marginTop: '10px', padding: '10px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Login</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      
      {/* HEADER WITH LOGOUT */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '25px 10px', textAlign: 'center', position: 'relative' }}>
        
        {/* TOP RIGHT LOGOUT BUTTON */}
        <button 
          onClick={() => { setIsLoggedIn(false); setPassInput(''); }} 
          style={{ position: 'absolute', top: '10px', right: '10px', padding: '5px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          LOGOUT
        </button>

        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={fetchHistory} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign: 'center', fontSize: '12px', color: '#666'}}>{status}</p>

        {view === 'dashboard' && <div style={{textAlign: 'center'}}><h3>Admin Panel Active</h3><p>Manage students and logs securely.</p></div>}

        {/* Admission Form */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>Registration</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Save Student</button>
          </div>
        )}

        {/* History Section */}
        {view === 'history' && (
          <div>
            <h3>Attendance History</h3>
            {history.length > 0 ? history.map(h => (
              <div key={h.id} style={{...cardStyle, marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', color: '#1a4a8e'}}>{h.date} | {h.class}</div>
                <div style={{fontSize: '13px', marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                  {h.attendance_data && Object.entries(h.attendance_data).map(([sName, stat]) => (
                    <div key={sName} style={{background: '#f9f9f9', padding: '3px 8px', borderRadius: '4px'}}>
                      {sName}: <b style={{color: stat === 'P' ? 'green' : 'red'}}>{stat}</b>
                    </div>
                  ))}
                </div>
              </div>
            )) : <p style={{textAlign: 'center'}}>No history found.</p>}
          </div>
        )}

        {/* Attendance Marking */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Marking: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Directory/Select Class Views */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' };

export default App;
