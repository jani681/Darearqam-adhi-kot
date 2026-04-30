import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where } from "firebase/firestore"; 

// 1. Pura Class List (Playgroup se 10th tak)
const CLASSES = [
  "Playgroup", "Nursery", "KG", 
  "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", 
  "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"
];

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [status, setStatus] = useState('System Online');

  // Dashboard count ke liye sab students load karna
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    const getCount = async () => {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      setTotalCount(snap.size);
    };
    getCount();
  }, [view]);

  // Specific Class ka data nikalne ke liye
  const fetchRecordsByClass = async (targetView, classToFilter) => {
    setStatus(`Loading ${classToFilter}...`);
    try {
      const q = query(
        collection(db, "ali_campus_records"), 
        where("class", "==", classToFilter)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Success');
      setView(targetView);
    } catch (err) { 
      console.error(err); 
      setStatus('Error loading data');
    }
  };

  const handleSaveStudent = async () => {
    if(!name || !rollNo) return alert("Pehle Name aur Roll No bharen!");
    try {
      setStatus('Saving to Cloud...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        class: selectedClass,
        photo_data: image,
        created_at: serverTimestamp()
      });
      alert(`Student Saved in ${selectedClass}!`);
      setName(''); setRollNo(''); setImage("");
      setView('dashboard');
    } catch (err) { alert("Error: " + err.message); }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Header & Navigation */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2 style={{margin: 0}}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('select_class_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('select_class_att')} style={navBtn}>Attendance</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign: 'center', color: '#1a4a8e', fontSize: '12px'}}>● {status}</p>

        {/* 1. DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
             <h3>Main Control Panel</h3>
             <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                <div style={cardStyle}><h2>{totalCount}</h2><p>Total Students</p></div>
                <div style={cardStyle}><h2 style={{color: 'green'}}>Active</h2><p>Cloud Sync</p></div>
             </div>
          </div>
        )}

        {/* 2. ADMISSION FORM */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{marginTop: 0}}>Student Registration</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <label>Select Class (Upto 10th):</label>
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" onChange={(e) => {
               const reader = new FileReader();
               reader.onloadend = () => setImage(reader.result);
               if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
            }} style={{margin: '10px 0'}} />
            <button onClick={handleSaveStudent} style={actionBtn}>Save Student</button>
          </div>
        )}

        {/* 3. CLASS SELECTION (For Directory or Attendance) */}
        {(view === 'select_class_view' || view === 'select_class_att') && (
          <div style={cardStyle}>
            <h3>Select Class to Open</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button 
              onClick={() => fetchRecordsByClass(view === 'select_class_view' ? 'view' : 'attendance', filterClass)} 
              style={actionBtn}>
              Show {filterClass} Records
            </button>
          </div>
        )}

        {/* 4. DIRECTORY VIEW (Filtered) */}
        {view === 'view' && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <button onClick={()=>setView('select_class_view')} style={{marginBottom: '10px'}}>Change Class</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {records.length > 0 ? records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} alt="student" />
                  <p style={{fontWeight: 'bold', margin: '5px 0'}}>{r.student_name}</p>
                  <p style={{fontSize: '11px', margin: 0}}>Roll: {r.roll_number}</p>
                </div>
              )) : <p>Is class mein koi student nahi hai.</p>}
            </div>
          </div>
        )}

        {/* 5. ATTENDANCE VIEW (Filtered) */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Attendance: {filterClass}</h3>
            {records.length > 0 ? records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.id]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.id] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.id]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.id] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            )) : <p>No students found.</p>}
            <button onClick={() => alert("Attendance Saved locally (Cloud feature coming next!)")} style={{...actionBtn, marginTop: '15px'}}>Submit Attendance</button>
          </div>
        )}

      </div>
    </div>
  );
}

// STYLES
const navBtn = { padding: '8px 15px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '12px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flex: 1 };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #eee' };
const imgStyle = { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold', cursor: 'pointer' };

export default App;
