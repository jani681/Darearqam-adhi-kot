import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where } from "firebase/firestore"; 

const CLASSES = ["Playgroup", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];

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

  const fetchRecords = async (targetView, classToFilter) => {
    setStatus('Loading Students...');
    try {
      const q = query(
        collection(db, "ali_campus_records"), 
        where("class", "==", classToFilter),
        orderBy("created_at", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Success');
      setView(targetView);
    } catch (err) { 
      console.error(err); 
      setStatus('Error');
    }
  };

  const handleSaveStudent = async () => {
    if(!name || !rollNo) return alert("Details bharen!");
    try {
      setStatus('Saving...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        class: selectedClass,
        photo_data: image,
        created_at: serverTimestamp()
      });
      alert(`${name} registered in ${selectedClass}`);
      setName(''); setRollNo(''); setImage("");
      setView('dashboard');
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2 style={{margin: 0}}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('class_select_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('class_select_att')} style={navBtn}>Attendance</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* CLASS SELECTION FOR ATTENDANCE/VIEW */}
        {(view === 'class_select_view' || view === 'class_select_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button 
              onClick={() => fetchRecords(view === 'class_select_view' ? 'view' : 'attendance', filterClass)} 
              style={actionBtn}>
              Open {filterClass}
            </button>
          </div>
        )}

        {/* ADMISSION FORM */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{marginTop: 0}}>Student Registration</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <label>Select Class:</label>
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" onChange={(e) => {
               const reader = new FileReader();
               reader.onloadend = () => setImage(reader.result);
               reader.readAsDataURL(e.target.files[0]);
            }} style={{margin: '10px 0'}} />
            <button onClick={handleSaveStudent} style={actionBtn}>Save Student</button>
          </div>
        )}

        {/* ATTENDANCE LIST (Filtered by Class) */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3>Attendance: {filterClass}</h3>
            {records.length === 0 ? <p>No students in this class.</p> : records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.roll_number]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.roll_number]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DIRECTORY VIEW */}
        {view === 'view' && (
          <div>
            <h3>List: {filterClass}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} />
                  <p style={{fontWeight: 'bold', margin: '5px 0'}}>{r.student_name}</p>
                  <p style={{fontSize: '11px', margin: 0}}>Roll: {r.roll_number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const navBtn = { padding: '8px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #eee' };
const imgStyle = { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' };
const statusBtn = { marginLeft: '5px', padding: '5px 10px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' };

export default App;
