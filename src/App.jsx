import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');

  const saveStudent = async () => {
    if(name === '' || rollNo === '') return alert("Please fill all fields");
    try {
      await addDoc(collection(db, "students"), {
        studentName: name,
        rollNumber: rollNo,
        date: new Date().toLocaleDateString()
      });
      alert("Student Added Successfully!");
      setName(''); setRollNo('');
    } catch (e) { console.error("Error: ", e); }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1a4a8e' }}>Ali Campus Admin Panel</h2>
      
      <div style={{ margin: '20px auto', maxWidth: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
        <h3>Add New Student</h3>
        <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '90%', marginBottom: '10px', padding: '8px' }} /><br/>
        <input placeholder="Roll Number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} style={{ width: '90%', marginBottom: '10px', padding: '8px' }} /><br/>
        <button onClick={saveStudent} style={{ width: '100%', padding: '10px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', cursor: 'pointer' }}>
          Save to Database
        </button>
      </div>
    </div>
  );
}

export default App;
