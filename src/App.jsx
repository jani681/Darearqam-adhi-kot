import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Assuming your firebase config path
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

// ... other imports and styles

const App = () => {
  // EXISTING STATES (DO NOT REMOVE)
  const [staff, setStaff] = useState([]);
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sSalary, setSSalary] = useState('');
  
  // ✅ STEP 1: ADD WHATSAPP STATE
  const [sWhatsapp, setSWhatsapp] = useState('');

  // Styles (Assuming existing style objects)
  const inputStyle = { padding: '10px', margin: '5px', borderRadius: '5px', border: '1px solid #ccc', display: 'block', width: '100%' };

  // ✅ STEP 3 & 4: SAVE WHATSAPP TO FIRESTORE & CLEAR
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "staff_records"), {
        name: sName,
        email: sEmail,
        password: sPassword,
        salary: sSalary,
        // ADD ONLY THIS FIELD
        whatsapp: sWhatsapp, 
        createdAt: new Date()
      });

      // Clear existing
      setSName('');
      setSEmail('');
      setSPassword('');
      setSSalary('');
      // ✅ CLEAR WHATSAPP INPUT
      setSWhatsapp(''); 
      
      alert("Staff Added Successfully");
      fetchStaff(); // Refresh list
    } catch (error) {
      console.error("Error adding staff: ", error);
    }
  };

  // ... existing fetch functions and attendance logic (UNTOUCHED)

  return (
    <div className="App">
      {/* ... other views */}

      {/* STAFF LIST VIEW */}
      <div id="staff_list_view">
        <h2>Add New Staff</h2>
        <form onSubmit={handleAddStaff}>
          <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} required />
          <input placeholder="Email" value={sEmail} onChange={(e)=>setSEmail(e.target.value)} style={inputStyle} required />
          <input placeholder="Password" type="password" value={sPassword} onChange={(e)=>setSPassword(e.target.value)} style={inputStyle} required />
          
          {/* ✅ STEP 2: ADD WHATSAPP INPUT FIELD BELOW PASSWORD */}
          <input 
            placeholder="WhatsApp Number (92300xxxxxxx)" 
            value={sWhatsapp} 
            onChange={(e)=>setSWhatsapp(e.target.value)} 
            style={inputStyle} 
          />

          <input placeholder="Monthly Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Add Staff
          </button>
        </form>

        <hr />

        <h2>Registered Staff</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {staff.map((s) => (
            <div key={s.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: '#f9f9f9' }}>
              <strong>{s.name}</strong> ({s.email})
              <br />
              Salary: {s.salary}
              
              {/* ✅ STEP 5: SHOW WHATSAPP ICON IN STAFF LIST */}
              {s.whatsapp && (
                <a 
                  href={`https://wa.me/${s.whatsapp}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ 
                    color:'#25D366', 
                    marginLeft:'10px', 
                    fontWeight:'bold', 
                    textDecoration:'none',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }} 
                > 
                  📱 WhatsApp 
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
