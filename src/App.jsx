import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [status, setStatus] = useState('System Ready');

  const saveStudent = async () => {
    if(!name || !rollNo) return alert("Empty fields!");

    try {
      setStatus('Connecting to Firebase...');
      
      // Hum ne collection ka naam change kiya hai taake naya start milay
      const studentsRef = collection(db, "ali_campus_records");
      
      const data = {
        name: name,
        roll: rollNo,
        createdAt: serverTimestamp()
      };

      setStatus('Sending data...');
      await addDoc(studentsRef, data);

      setStatus('Success! Data saved.');
      alert("Mubarak ho! Student add ho gaya.");
      setName('');
      setRollNo('');
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      setStatus('Error: ' + error.code);
      alert("Error Details: " + error.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eef2f7', minHeight: '100vh' }}>
      <h2>Dar-e-Arqam Ali Campus</h2>
      <p style={{ color: status.includes('Error') ? 'red' : 'green', fontWeight: 'bold' }}>
        Current Status: {status}
      </p>
      
      <div style={{ maxWidth: '350px', margin: 'auto', padding: '25px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '90%', marginBottom: '10px', padding: '10px' }} /><br/>
        <input placeholder="Roll Number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} style={{ width: '90%', marginBottom: '20px', padding: '10px' }} /><br/>
        <button onClick={saveStudent} style={{ width: '100%', padding: '12px', background: '#1a4a8e', color: 'white', border: 'none', borderRadius: '6px' }}>
          Save Student Info
        </button>
      </div>
    </div>
  );
}

export default App;
