import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 

function App() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [image, setImage] = useState("");
  const [status, setStatus] = useState('System Online (Adhi Kot)');

  // Image ko text mein badalne ka function
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if(!name || !rollNo) return alert("Pehle Name aur Roll No likhen!");
    
    try {
      setStatus('Saving to Cloud...');
      await addDoc(collection(db, "ali_campus_records"), {
        student_name: name,
        roll_number: rollNo,
        photo_data: image, // Photo ab seedha yahan save hogi
        created_at: serverTimestamp()
      });

      setStatus('Success! Profile Saved.');
      alert("Student ka record image ke sath save ho gaya!");
      setName(''); setRollNo(''); setImage("");
    } catch (err) {
      setStatus('Error!');
      alert("Database Error: " + err.message);
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', minHeight: '100vh', backgroundColor: '#eef2f3', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#1a4a8e' }}>Ali Campus - Adhi Kot Portal</h2>
      <p style={{ color: 'blue' }}>{status}</p>
      
      <div style={{ maxWidth: '400px', margin: 'auto', background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={{ width: '90%', marginBottom: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
        <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={{ width: '90%', marginBottom: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
        
        <div style={{ margin: '15px 0', textAlign: 'left' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Upload Student Photo:</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginTop: '10px' }} />
        </div>

        {image && <img src={image} alt="preview" style={{ width: '100px', marginBottom: '10px', borderRadius: '8px' }} />}

        <button onClick={handleSave} style={{ width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          Save Student to Database
        </button>
      </div>
    </div>
  );
}

export default App;
