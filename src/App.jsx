import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffData, setStaffData] = useState(null); 
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Student Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);

  // --- STYLES ---
  const cardStyle = { background: 'white', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '12px' };
  const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '10px', border: '1px solid #ddd' };
  const waBtnStyle = { background: '#25D366', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '10px' };

  // --- FETCHING DATA ---
  const fetchClassRecords = async (cls) => {
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView('view_dir');
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      {/* HEADER SECTION */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '20px', textAlign: 'center', color: 'white' }}>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        
        {/* STAFF PANEL FIX: Displaying "Teacher: Name" */}
        {userRole === 'staff' && staffData && (
          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}>
            <h4 style={{ margin: 0 }}>Teacher: {staffData.name}</h4>
          </div>
        )}
      </div>

      <div style={{ padding: '15px' }}>
        
        {/* VIEW DIRECTORY WITH WHATSAPP BUTTON FIX */}
        {view === 'view_dir' && (
          <div>
            <input 
              placeholder="🔍 Search Students..." 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={inputStyle} 
            />
            {records.filter(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <b style={{ fontSize: '18px' }}>{r.student_name}</b>
                    <p style={{ margin: '5px 0', color: '#666' }}>Roll: {r.roll_number} | Class: {r.class}</p>
                    
                    {/* ADMIN PANEL FIX: WhatsApp Button added here */}
                    <a 
                      href={`https://wa.me/${r.parent_whatsapp}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={waBtnStyle}
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                  <div>
                    <button style={{ background: '#f39c12', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', marginRight: '5px' }}>Edit</button>
                    <button style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DASHBOARD CLASSES */}
        {view === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {CLASSES.map(cls => (
              <div key={cls} onClick={() => fetchClassRecords(cls)} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center' }}>
                <h4 style={{ margin: 0, color: '#1a4a8e' }}>{cls}</h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
