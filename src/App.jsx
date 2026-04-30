import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, deleteDoc, updateDoc } from "firebase/firestore"; 

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];

function App() {
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  
  // Registration States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState(null);

  // 1. Fetch Students for Directory or Attendance
  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading Students...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView(target);
      setStatus('Success');
    } catch (err) { setStatus('Error fetching students'); }
  };

  // 2. Attendance History (Fixed Logic)
  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(historyData);
      setView('history');
      setStatus('Success');
    } catch (err) { 
      console.error(err);
      setStatus('No history found or error'); 
    }
  };

  // 3. Attendance Save Logic
  const submitAttendance = async () => {
    if (Object.keys(attendance).length === 0) return alert("Pehle attendance mark karen!");
    setStatus('Saving to Cloud...');
    try {
      const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      await addDoc(collection(db, "daily_attendance"), {
        date: today,
        class: filterClass,
        attendance_data: attendance,
        timestamp: serverTimestamp()
      });
      alert("Attendance Saved!");
      setAttendance({});
      setView('dashboard');
    } catch (err) { alert("Save failed: " + err.message); }
  };

  // Admission/Edit Logic
  const handleSave = async () => {
    if(!name || !rollNo) return alert("Fields fill karen");
    try {
      if (editingId) {
        await updateDoc(doc(db, "ali_campus_records", editingId), { student_name: name, roll_number: rollNo, class: selectedClass, photo_data: image });
      } else {
        await addDoc(collection(db, "ali_campus_records"), { student_name: name, roll_number: rollNo, class: selectedClass, photo_data: image, created_at: serverTimestamp() });
      }
      resetForm(); setView('dashboard');
    } catch (e) { alert(e.message); }
  };

  const resetForm = () => { setName(''); setRollNo(''); setImage(""); setEditingId(null); };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => {resetForm(); setView('add');}} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={fetchHistory} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign: 'center', color: '#666', fontSize: '12px'}}>{status}</p>

        {view === 'dashboard' && <div style={{textAlign: 'center'}}><h3>Welcome to Ali Campus Portal</h3></div>}

        {/* Admission Form */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>Registration</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Save Student</button>
          </div>
        )}

        {/* Selection UI */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}

        {/* Attendance Marking */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Marking: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={submitAttendance} style={{...actionBtn, marginTop: '10px'}}>Save to Cloud</button>
          </div>
        )}

        {/* History Display (The Fix) */}
        {view === 'history' && (
          <div>
            <h3>Attendance Logs</h3>
            {history.length > 0 ? history.map(h => (
              <div key={h.id} style={{...cardStyle, marginBottom: '10px', padding: '10px'}}>
                <div style={{backgroundColor: '#eee', padding: '5px', borderRadius: '5px', marginBottom: '5px'}}>
                  <strong>{h.date}</strong> | Class: <strong>{h.class}</strong>
                </div>
                <div style={{fontSize: '12px'}}>
                  {h.attendance_data && Object.entries(h.attendance_data).map(([sName, status]) => (
                    <span key={sName} style={{marginRight: '15px'}}>
                      {sName}: <b style={{color: status === 'P' ? 'green' : 'red'}}>{status}</b>
                    </span>
                  ))}
                </div>
              </div>
            )) : <p style={{textAlign: 'center'}}>No records found in database.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '10px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const statusBtn = { marginLeft: '5px', padding: '5px 10px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' };

export default App;
