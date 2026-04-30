import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from "firebase/firestore"; 

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); // {rollNo: 'Present'}
  const [status, setStatus] = useState('System Online');

  // Students fetch karne ka function
  const fetchRecords = async (targetView) => {
    setStatus('Loading Data...');
    try {
      const querySnapshot = await getDocs(collection(db, "ali_campus_records"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Success');
      setView(targetView);
    } catch (err) { console.error(err); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  // Admission Save
  const handleSaveStudent = async () => {
    if(!name || !rollNo) return alert("Pehle details bharen!");
    try {
      setStatus('Saving Student...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        photo_data: image,
        created_at: serverTimestamp()
      });
      alert("Admission Done!");
      setName(''); setRollNo(''); setImage("");
      setView('dashboard');
    } catch (err) { console.error(err); }
  };

  // Attendance Save Logic
  const handleAttendanceSubmit = async () => {
    if (Object.keys(attendance).length === 0) return alert("Pehle attendance mark karen!");
    setStatus('Uploading Attendance...');
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, "daily_attendance"), {
        date: today,
        records: attendance,
        timestamp: serverTimestamp()
      });
      alert("Attendance Saved for " + today);
      setAttendance({});
      setView('dashboard');
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Arial', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Dynamic Header based on Role */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h2 style={{margin: 0, letterSpacing: '1px'}}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => fetchRecords('view')} style={navBtn}>Students</button>
          <button onClick={() => fetchRecords('attendance')} style={navBtn}>Attendance</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '900px', margin: 'auto' }}>
        
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <h3 style={{color: '#1a4a8e'}}>Main Control Panel</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px'}}>
              <div style={statCard}><h4>Total Students</h4><p>{records.length || '...'}</p></div>
              <div style={statCard}><h4>Status</h4><p style={{color: 'green'}}>Active</p></div>
            </div>
          </div>
        )}

        {/* ADMISSION FORM */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{color: '#1a4a8e', borderBottom: '2px solid #1a4a8e', paddingBottom: '10px'}}>Student Registration</h3>
            <input placeholder="Student Full Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <label style={{display: 'block', fontSize: '12px', margin: '10px 0'}}>Profile Picture:</label>
            <input type="file" onChange={handleImageChange} accept="image/*" />
            <button onClick={handleSaveStudent} style={actionBtn}>Submit Admission</button>
          </div>
        )}

        {/* VIEW RECORDS */}
        {view === 'view' && (
          <div>
            <h3 style={{color: '#1a4a8e'}}>Student Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} />
                  <p style={{fontWeight: 'bold', margin: '8px 0 2px 0'}}>{r.student_name}</p>
                  <p style={{fontSize: '12px', color: '#666'}}>Roll: {r.roll_number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATTENDANCE SYSTEM */}
        {view === 'attendance' && (
          <div style={cardStyle}>
            <h3 style={{color: '#1a4a8e'}}>Daily Attendance ({new Date().toLocaleDateString()})</h3>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #ddd'}}>
                  <th style={{textAlign: 'left', padding: '10px'}}>Student</th>
                  <th style={{textAlign: 'right', padding: '10px'}}>Mark</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '10px'}}>{r.student_name} ({r.roll_number})</td>
                    <td style={{padding: '10px', textAlign: 'right'}}>
                      <button 
                        onClick={() => setAttendance({...attendance, [r.roll_number]: 'P'})}
                        style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'P' ? '#28a745' : '#ddd'}}
                      >P</button>
                      <button 
                        onClick={() => setAttendance({...attendance, [r.roll_number]: 'A'})}
                        style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'A' ? '#dc3545' : '#ddd'}}
                      >A</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAttendanceSubmit} style={{...actionBtn, marginTop: '20px'}}>Save Today's Attendance</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling
const navBtn = { padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '13px' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
const inputStyle = { width: '95%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };
const statCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const imgStyle = { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' };
const statusBtn = { margin: '0 2px', padding: '5px 10px', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' };

export default App;
