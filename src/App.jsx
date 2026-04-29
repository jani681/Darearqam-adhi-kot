import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');

  const saveStudent = async () => {
    // Check agar fields khali hain
    if(name === '' || rollNo === '') {
      alert("Please fill all fields");
      return;
    }

    try {
      console.log("Saving student...");
      const docRef = await addDoc(collection(db, "students"), {
        studentName: name,
        rollNumber: rollNo,
        timestamp: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      alert("Success! Student saved to Database.");
      setName('');
      setRollNo('');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error: " + error.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#1a4a8e' }}>Ali Campus Admin Panel</h2>
      
      <div style={{ margin: '20px auto', maxWidth: '350px', padding: '30px', border: '2px solid #1a4a8e', borderRadius: '15px', backgroundColor: '#f0f4f8' }}>
        <h3 style={{ marginBottom: '20px' }}>Add New Student</h3>
        
        <input 
          placeholder="Enter Student Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          style={{ width: '90%', marginBottom: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} 
        /><br/>
        
        <input 
          placeholder="Enter Roll Number" 
          value={rollNo} 
          onChange={(e) => setRollNo(e.target.value)} 
          style={{ width: '90%', marginBottom: '20px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} 
        /><br/>
        
        <button 
          onClick={saveStudent} 
          style={{ width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          Save to Database
        </button>
      </div>
    </div>
  );
}

export default App;
