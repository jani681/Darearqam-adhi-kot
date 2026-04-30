import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore"; 

function App() {
  const [view, setView] = useState('dashboard'); // dashboard, add, view
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('System Online');

  // Database se records lane ka function
  const fetchRecords = async () => {
    setStatus('Fetching data...');
    const querySnapshot = await getDocs(collection(db, "ali_campus_records"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRecords(data);
    setStatus('Data Loaded.');
    setView('view');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if(!name || !rollNo) return alert("Details bharen!");
    try {
      setStatus('Saving...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        photo_data: image,
        created_at: serverTimestamp()
      });
      alert("Record Saved!");
      setName(''); setRollNo(''); setImage("");
      setView('dashboard');
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '15px', textAlign: 'center' }}>
        <h2>Dar-e-Arqam Ali Campus Portal</h2>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Add Student</button>
          <button onClick={fetchRecords} style={navBtn}>View All Records</button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'gray' }}>{status}</p>

      {/* Main Content Areas */}
      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h3>Welcome, Admin</h3>
            <p>Ali Campus Adhi Kot ka management system active hai.</p>
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>New Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input type="file" onChange={handleImageChange} style={{marginBottom: '10px'}} />
            <button onClick={handleSave} style={saveBtn}>Save Student</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <h3>Student Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} alt="student" style={{width: '100%', borderRadius: '8px'}} />
                  <h4>{r.student_name}</h4>
                  <p>Roll No: {r.roll_number}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling Objects
const navBtn = { margin: '0 5px', padding: '8px 15px', cursor: 'pointer', borderRadius: '5px', border: 'none' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const saveBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const recordCard = { background: 'white', padding: '10px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };

export default App;
