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
  
  // Student registration states
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Attendance Save Logic
  const submitAttendance = async () => {
    if (Object.keys(attendance).length < records.length) {
      return alert("Pehle tamam bacho ki attendance mark karen!");
    }
    setStatus('Saving Attendance...');
    try {
      const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      await addDoc(collection(db, "daily_attendance"), {
        date: today,
        class: filterClass,
        attendance_data: attendance,
        timestamp: serverTimestamp()
      });
      alert(`Attendance for ${filterClass} saved successfully!`);
      setAttendance({});
      setView('dashboard');
    } catch (err) { alert("Error saving: " + err.message); }
  };

  // History Fetch Logic
  const fetchHistory = async () => {
    setStatus('Fetching History...');
    const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setView('history');
    setStatus('Success');
  };

  // Helper functions from previous steps
  const fetchRecordsByClass = async (target, cls) => {
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView(target);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
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
        
        {/* DASHBOARD */}
        {view === 'dashboard' && <div style={{textAlign: 'center'}}><h3>Ali Campus Portal Active</h3><p>Manage your students and attendance from the menu above.</p></div>}

        {/* SELECT CLASS UI */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open Class</button>
          </div>
        )}

        {/* ATTENDANCE MARKING */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Mark Attendance: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={submitAttendance} style={{...actionBtn, marginTop: '15px'}}>Save to Cloud</button>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div>
            <h3>Attendance History</h3>
            {history.map(h => (
              <div key={h.id} style={{...cardStyle, marginBottom: '10px', padding: '15px'}}>
                <div style={{fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                  {h.date} - {h.class}
                </div>
                <div style={{fontSize: '13px', marginTop: '5px'}}>
                  {Object.entries(h.attendance_data).map(([name, status]) => (
                    <span key={name} style={{marginRight: '10px'}}>{name}: <b style={{color: status === 'P' ? 'green' : 'red'}}>{status}</b></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADMISSION FORM (Same as previous step) */}
        {view === 'add' && <div style={cardStyle}><h3>Registration</h3>{/* Input fields here as per your current working version */}</div>}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const statusBtn = { marginLeft: '5px', padding: '5px 10px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' };

export default App;
