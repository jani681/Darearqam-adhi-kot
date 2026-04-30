import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [status, setStatus] = useState('Ready');

  const saveStudent = async () => {
    if(name === '' || rollNo === '') {
      alert("Fields khali hain!");
      return;
    }

    try {
      setStatus('Saving... Please wait');
      console.log("Attempting to save...");
      
      const docRef = await addDoc(collection(db, "students"), {
        studentName: name,
        rollNumber: rollNo,
        time: new Date().toISOString()
      });

      setStatus('Success! Data saved.');
      alert("Mubarak ho! Data save ho gaya.");
      setName('');
      setRollNo('');
    } catch (error) {
      console.error(error);
      setStatus('Error: ' + error.message);
      alert("Masla aa gaya: " + error.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#1a4a8e' }}>Ali Campus Admin Panel</h2>
      <p>System Status: <strong>{status}</strong></p>
      
      <div style={{ margin: '20px auto', maxWidth: '350px', padding: '30px', border: '2px solid #1a4a8e', borderRadius: '15px', backgroundColor: '#f0f4f8' }}>
        <input 
          placeholder="Student Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          style={{ width: '90%', marginBottom: '15px', padding: '12px' }} 
        /><br/>
        
        <input 
          placeholder="Roll Number" 
          value={rollNo} 
          onChange={(e) => setRollNo(e.target.value)} 
          style={{ width: '90%', marginBottom: '20px', padding: '12px' }} 
        /><br/>
        
        <button 
          onClick={saveStudent} 
          style={{ width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', fontWeight: 'bold' }}
        >
          Save to Database
        </button>
      </div>
    </div>
  );
}

export default App;
