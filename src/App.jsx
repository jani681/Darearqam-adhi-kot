import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];

export default function App() {
  const [view, setView] = useState('login');
  const [userRole, setUserRole] = useState('');
  const [staffName, setStaffName] = useState('');
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // UI Styles from screenshots
  const headerStyle = { background: '#1a4a8e', color: 'white', padding: '15px', textAlign: 'center', borderRadius: '0 0 15px 15px' };
  const navBtnStyle = { background: 'white', border: 'none', padding: '10px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', flex: '1', margin: '5px', fontSize: '12px' };
  const cardStyle = { background: 'white', margin: '10px', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #4caf50', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

  // Fetch Directory Data
  const loadDirectory = async (cls) => {
    setSelectedClass(cls);
    const q = query(collection(db, "students"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView('view_dir');
  };

  if (view === 'login') {
    return (
      <div style={{ background: '#1a4a8e', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'white' }}>Ali Campus Management</h2>
        <input type="password" placeholder="Enter Password" style={{ padding: '12px', borderRadius: '10px', width: '80%', marginBottom: '15px' }} />
        <button onClick={() => { setUserRole('admin'); setView('dashboard'); }} style={{ background: '#f39c12', color: 'white', padding: '12px', width: '84%', border: 'none', borderRadius: '10px' }}>LOGIN</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={headerStyle}>
        <h3>DAR-E-ARQAM (ALI CAMPUS)</h3>
        {/* STAFF PANEL FIX: Teacher Label */}
        {userRole === 'staff' && <div style={{ background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '5px', marginTop: '5px' }}>Teacher: {staffName}</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '15px' }}>
          <button style={navBtnStyle} onClick={() => setView('dashboard')}>🏠 Home</button>
          <button style={navBtnStyle}>📝 Admit</button>
          <button style={navBtnStyle} onClick={() => setView('class_list')}>📂 Dir</button>
          <button style={navBtnStyle}>✅ Atten</button>
          <button style={navBtnStyle} onClick={() => setView('staff_manage')}>👥 Staff</button>
          <button style={navBtnStyle}>📜 Hist</button>
          <button style={navBtnStyle}>📊 Reprt</button>
          <button style={navBtnStyle} onClick={() => setView('login')}>🚪 Out</button>
        </div>
      </div>

      {/* DASHBOARD - Class Stats View */}
      {view === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px' }}>
          {CLASSES.map(cls => (
            <div key={cls} style={{ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
              <h4 style={{ color: '#1a4a8e', margin: '0' }}>{cls}</h4>
              <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>0</p>
            </div>
          ))}
        </div>
      )}

      {/* CLASS SELECTION FOR DIRECTORY */}
      {view === 'class_list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px' }}>
          {CLASSES.map(cls => (
            <button key={cls} onClick={() => loadDirectory(cls)} style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'white', color: '#1a4a8e', fontWeight: 'bold' }}>{cls}</button>
          ))}
        </div>
      )}

      {/* STUDENT DIRECTORY WITH WHATSAPP BUTTON FIX */}
      {view === 'view_dir' && (
        <div style={{ padding: '15px' }}>
          <input placeholder="🔍 Search student..." style={{ width: '92%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '15px' }} onChange={(e) => setSearchTerm(e.target.value)} />
          {records.filter(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
            <div key={r.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0' }}>{r.student_name}</h4>
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#666' }}>Roll: {r.roll_number} | Dues: {r.dues || '0'}</p>
                  {/* WhatsApp Integration */}
                  <a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: '5px', textDecoration: 'none', fontSize: '12px', marginTop: '5px' }}>
                    🟢 WhatsApp
                  </a>
                </div>
                <div>
                  <button style={{ background: '#f39c12', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', marginRight: '5px' }}>Edit</button>
                  <button style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px', borderRadius: '5px' }}>Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STAFF MANAGEMENT */}
      {view === 'staff_manage' && (
        <div style={{ padding: '15px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px' }}>
            <h3>Add New Staff</h3>
            <input style={{ width: '92%', padding: '10px', marginBottom: '10px' }} placeholder="Staff Name" id="stf_name" />
            <input style={{ width: '92%', padding: '10px', marginBottom: '10px' }} placeholder="Role (e.g. Science Teacher)" id="stf_role" />
            <button style={{ width: '100%', background: '#1a4a8e', color: 'white', padding: '12px', border: 'none', borderRadius: '8px' }}>Register Staff</button>
          </div>
        </div>
      )}
    </div>
  );
}
