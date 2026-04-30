import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore"; 

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('System Online');

  // Students load karna (Optimized for performance)
  const fetchRecords = async (targetView) => {
    setStatus('Syncing with Cloud...');
    try {
      const q = query(collection(db, "ali_campus_records"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Success');
      setView(targetView);
    } catch (err) { 
      console.error(err); 
      setStatus('Error Loading Data');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

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
      alert("Student Registered!");
      setName(''); setRollNo(''); setImage("");
      fetchRecords('dashboard');
    } catch (err) { console.error(err); }
  };

  const handleAttendanceSubmit = async () => {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    if (Object.keys(attendance).length === 0) return alert("Empty attendance cannot be saved!");
    
    setStatus('Uploading...');
    try {
      await addDoc(collection(db, "daily_attendance"), {
        date: today,
        attendance_data: attendance,
        total_present: Object.values(attendance).filter(v => v === 'P').length,
        timestamp: serverTimestamp()
      });
      alert(`Attendance Saved for ${today}`);
      setAttendance({});
      setView('dashboard');
    } catch (err) { console.error(err); }
  };

  const filteredStudents = records.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.roll_number.includes(searchTerm)
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '25px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
        <h2 style={{margin: 0, fontSize: '24px', fontWeight: '800'}}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => fetchRecords('view')} style={navBtn}>Directory</button>
          <button onClick={() => fetchRecords('attendance')} style={navBtn}>Take Attendance</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
        <p style={{ textAlign: 'center', color: '#1a4a8e', fontSize: '12px' }}>● {status}</p>

        {view === 'dashboard' && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <h3 style={{color: '#333'}}>Main Control Panel</h3>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <div style={statCard}><h2 style={{margin: 0}}>{records.length}</h2><p style={{margin: 0}}>Total Students</p></div>
              <div style={statCard}><h2 style={{margin: 0, color: '#28a745'}}>Active</h2><p style={{margin: 0}}>Cloud Sync</p></div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{color: '#1a4a8e', marginTop: 0}}>Student Registration</h3>
            <input placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number (e.g. 001)" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input type="file" onChange={handleImageChange} style={{margin: '10px 0'}} />
            <button onClick={handleSaveStudent} style={actionBtn}>Register Student</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="Search Student..." onChange={(e)=>setSearchTerm(e.target.value)} style={{...inputStyle, marginBottom: '20px'}} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {filteredStudents.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} alt="student" />
                  <h4 style={{margin: '10px 0 2px 0'}}>{r.student_name}</h4>
                  <p style={{margin: 0, fontSize: '12px', color: '#888'}}>Roll: {r.roll_number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'attendance' && (
          <div style={cardStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <h3 style={{margin: 0}}>Mark Attendance</h3>
               <span style={{fontSize: '12px', background: '#eee', padding: '4px 8px', borderRadius: '5px'}}>{new Date().toDateString()}</span>
            </div>
            <hr style={{margin: '15px 0', opacity: 0.2}} />
            {records.map(r => (
              <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0'}}>
                <span>{r.student_name} <small>({r.roll_number})</small></span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.roll_number]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.roll_number]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.roll_number] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={handleAttendanceSubmit} style={{...actionBtn, marginTop: '20px'}}>Save Records</button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '10px 18px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '13px', transition: '0.3s' };
const cardStyle = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' };
const inputStyle = { width: '95%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #eee', background: '#fcfcfc' };
const actionBtn = { width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };
const statCard = { background: '#fff', padding: '20px', borderRadius: '15px', width: '120px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '15px', textAlign: 'center', border: '1px solid #f0f0f0' };
const imgStyle = { width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' };

export default App;
