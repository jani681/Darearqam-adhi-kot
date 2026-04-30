import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [status, setStatus] = useState('System Online');

  const saveToFirebase = async () => {
    if(!name || !rollNo) return alert("Fields fill karen!");

    try {
      setStatus('Sending... Please wait');
      
      const docRef = await addDoc(collection(db, "students_list"), {
        name: name,
        roll: rollNo,
        date: new Date().toLocaleString()
      });

      setStatus('Mubarak Ho! Saved.');
      alert("Student saved with ID: " + docRef.id);
      setName('');
      setRollNo('');
    } catch (e) {
      console.error(e);
      setStatus('Error: ' + e.message);
      alert("Masla: " + e.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h2 style={{ color: '#1a4a8e' }}>Dar-e-Arqam Ali Campus</h2>
      <p style={{ fontWeight: 'bold', color: status.includes('Error') ? 'red' : 'green' }}>{status}</p>
      
      <div style={{ maxWidth: '350px', margin: 'auto', padding: '20px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '90%', padding: '10px', marginBottom: '10px' }} /><br/>
        <input placeholder="Roll Number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} style={{ width: '90%', padding: '10px', marginBottom: '20px' }} /><br/>
        <button onClick={saveToFirebase} style={{ width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Save to Cloud
        </button>
      </div>
    </div>
  );
}

export default App;
