import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, deleteDoc, updateDoc } from "firebase/firestore"; 

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('Online');
  const [editingId, setEditingId] = useState(null);

  // 1. Database se records load karna (Class wise)
  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecords(data);
      setView(target);
      setStatus('Success');
    } catch (err) { setStatus('Error'); }
  };

  // 2. Admission ya Update handle karna
  const handleSaveOrUpdate = async () => {
    if(!name || !rollNo) return alert("Pehle details bharen!");
    try {
      setStatus('Processing...');
      if (editingId) {
        await updateDoc(doc(db, "ali_campus_records", editingId), {
          student_name: name, roll_number: rollNo, class: selectedClass, photo_data: image
        });
        alert("Record Updated!");
      } else {
        await addDoc(collection(db, "ali_campus_records"), {
          student_name: name, roll_number: rollNo, class: selectedClass, photo_data: image, created_at: serverTimestamp()
        });
        alert("Student Saved!");
      }
      resetForm();
      setView('dashboard');
    } catch (err) { alert("Error: " + err.message); }
  };

  // 3. Delete Logic
  const handleDelete = async (id, sName) => {
    if(window.confirm(`Delete ${sName}?`)) {
      await deleteDoc(doc(db, "ali_campus_records", id));
      fetchRecordsByClass('view', filterClass);
    }
  };

  // 4. Attendance History fetch karna
  const fetchHistory = async () => {
    setStatus('Fetching History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('History empty or error'); }
  };

  const resetForm = () => { setName(''); setRollNo(''); setImage(""); setEditingId(null); };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Header Navigation */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => {setView('dashboard'); resetForm();}} style={navBtn}>Home</button>
          <button onClick={() => {setView('add'); resetForm();}} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={fetchHistory} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign: 'center', fontSize: '12px', color: '#666'}}>Status: {status}</p>

        {/* DASHBOARD */}
        {view === 'dashboard' && <div style={{textAlign: 'center'}}><h3>Portal Active</h3><p>Use menu to manage students.</p></div>}

        {/* ADMISSION & EDIT FORM */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingId ? "Edit Student" : "Registration"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" onChange={(e) => {
               const reader = new FileReader();
               reader.onloadend = () => setImage(reader.result);
               if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
            }} style={{margin: '10px 0'}} />
            <button onClick={handleSaveOrUpdate} style={actionBtn}>{editingId ? "Update" : "Save Student"}</button>
          </div>
        )}

        {/* CLASS SELECTION */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}

        {/* DIRECTORY VIEW (Enroll Student List) */}
        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} alt="student" />
                  <p style={{fontWeight: 'bold', fontSize: '14px'}}>{r.student_name}</p>
                  <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                    <button onClick={() => { setEditingId(r.id); setName(r.student_name); setRollNo(r.roll_number); setSelectedClass(r.class); setImage(r.photo_data); setView('add'); }} style={smallBtn}>Edit</button>
                    <button onClick={() => handleDelete(r.id, r.student_name)} style={{...smallBtn, background: '#dc3545'}}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY VIEW (Blank screen fix) */}
        {view === 'history' && (
          <div>
            <h3>Attendance History</h3>
            {history.length > 0 ? history.map(h => (
              <div key={h.id} style={{...cardStyle, marginBottom: '10px'}}>
                <b>{h.date} - {h.class}</b>
                <div style={{fontSize: '12px', marginTop: '5px'}}>
                  {Object.entries(h.attendance_data).map(([name, stat]) => (
                    <span key={name} style={{marginRight: '10px'}}>{name}: <b style={{color: stat === 'P' ? 'green' : 'red'}}>{stat}</b></span>
                  ))}
                </div>
              </div>
            )) : <p>No history found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Styling (No change needed)
const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #eee' };
const imgStyle = { width: '100%', height: '80px', objectFit: 'cover', borderRadius: '5px' };
const smallBtn = { padding: '4px 8px', border: 'none', borderRadius: '4px', background: '#ffc107', color: 'black', fontSize: '10px', cursor: 'pointer' };

export default App;
