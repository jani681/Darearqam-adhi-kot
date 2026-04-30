import React, { useState } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [status, setStatus] = useState('System Ready');

  const saveStudentData = async () => {
    if(!name || !rollNo) return alert("Please fill Name and Roll No");

    try {
      setStatus('Saving Student Info...');
      
      // Saving Text Data to Firestore
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        created_at: serverTimestamp(),
        has_media: false
      });

      setStatus('Success! Text Data Saved.');
      alert("Student Added! Now you can plan for images/videos.");
      setName('');
      setRollNo('');
    } catch (error) {
      console.error(error);
      setStatus('Error: ' + error.code);
      alert("Error: " + error.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#1a4a8e' }}>Ali Campus Admin Portal</h2>
      <p style={{ color: 'green', fontWeight: 'bold' }}>{status}</p>
      
      <div style={{ maxWidth: '400px', margin: 'auto', padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h3>Add New Student</h3>
        <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '90%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} /><br/>
        <input placeholder="Roll Number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} style={{ width: '90%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} /><br/>
        
        <div style={{ padding: '10px', border: '1px dashed #1a4a8e', marginBottom: '20px', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#666' }}>Images/Video upload feature coming soon...</p>
        </div>

        <button onClick={saveStudentData} style={{ width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
          Save to Database
        </button>
      </div>
    </div>
  );
}

export default App;
