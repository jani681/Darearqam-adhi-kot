import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore"; 

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('System Online');

  const fetchRecords = async () => {
    setStatus('Fetching data...');
    try {
      const querySnapshot = await getDocs(collection(db, "ali_campus_records"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Data Loaded.');
      setView('view');
    } catch (err) {
      console.error("Error fetching: ", err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if(!name || !rollNo) return;
    try {
      setStatus('Saving...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        photo_data: image,
        created_at: serverTimestamp()
      });
      setStatus('Profile Saved Successfully!');
      setName(''); setRollNo(''); setImage("");
      setTimeout(() => setView('dashboard'), 2000);
    } catch (err) { 
      console.error("Save Error: ", err); 
    }
  };

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '15px', textAlign: 'center' }}>
        <h2 style={{margin: 0}}>Dar-e-Arqam Ali Campus</h2>
        <div style={{ marginTop: '15px' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Add Student</button>
          <button onClick={fetchRecords} style={navBtn}>View Records</button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>{status}</p>

      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#1a4a8e' }}>
            <h3>Admin Dashboard</h3>
            <p>Ali Campus Adhi Kot Portal is active.</p>
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{color: '#1a4a8e', marginTop: 0}}>New Admission</h3>
            <input placeholder="Student Full Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <div style={{margin: '15px 0'}}>
               <label style={{fontSize: '12px', display: 'block', marginBottom: '5px'}}>Student Photo:</label>
               <input type="file" onChange={handleImageChange} accept="image/*" />
            </div>
            {image && <img src={image} alt="preview" style={{width: '80px', borderRadius: '5px', marginBottom: '10px'}} />}
            <button onClick={handleSave} style={saveBtn}>Save Student Record</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <h3 style={{color: '#1a4a8e'}}>Student Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {records.length > 0 ? records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} alt="student" style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px'}} />
                  <h4 style={{margin: '10px 0 5px 0'}}>{r.student_name}</h4>
                  <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Roll No: {r.roll_number}</p>
                </div>
              )) : <p>No records found.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { margin: '0 5px', padding: '8px 12px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#fff', color: '#1a4a8e', fontWeight: 'bold' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' };
const inputStyle = { width: '94%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' };
const saveBtn = { width: '100%', padding: '14px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const recordCard = { background: 'white', padding: '12px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };

export default App;
