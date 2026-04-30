import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  const [classStats, setClassStats] = useState({});
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => {
        const cls = d.data().class;
        stats[cls] = (stats[cls] || 0) + 1;
      });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const handleLogin = () => {
    if(passInput === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert("Wrong Password!");
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSearchTerm(''); setView(target); setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const handleUpdate = async () => {
    setStatus('Updating...');
    try {
      await updateDoc(doc(db, "ali_campus_records", editingStudent.id), {
        student_name: editingStudent.student_name,
        roll_number: editingStudent.roll_number
      });
      setEditingStudent(null);
      fetchRecordsByClass('view', filterClass);
      setStatus('Updated!');
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Delete this student?")) {
      await deleteDoc(doc(db, "ali_campus_records", id));
      setEditingStudent(null);
      fetchRecordsByClass('view', filterClass);
      setStatus('Deleted');
    }
  };

  const toggleFeeStatus = async (student) => {
    const newStatus = student.fee_status === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "ali_campus_records", student.id), { fee_status: newStatus });
    fetchRecordsByClass('view', filterClass);
  };

  const filteredRecords = records.filter(r => 
    (r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (r.roll_number?.toString().includes(searchTerm))
  );

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', borderRadius:'5px'}} />
      <button onClick={handleLogin} style={{marginTop:'10px', padding:'10px 20px', background:'white', color:'#1a4a8e', border:'none', borderRadius:'5px'}}>Login</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center', position: 'relative' }}>
        <button onClick={() => setIsLoggedIn(false)} style={{ position: 'absolute', top: '10px', right: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '10px' }}>LOGOUT</button>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={() => setView('history')} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* --- Directory View with Edit & Fees --- */}
        {view === 'view' && !editingStudent && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <input placeholder="🔍 Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {filteredRecords.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><b>{r.student_name}</b> <br/> <small>Roll: {r.roll_number}</small></div>
                  <button onClick={() => toggleFeeStatus(r)} style={{padding:'5px 10px', fontSize:'10px', background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'5px'}}>
                    {r.fee_status || 'Unpaid'}
                  </button>
                </div>
                {/* Fixed: Edit Button is back! */}
                <button onClick={() => setEditingStudent(r)} style={{marginTop:'10px', width:'100%', padding:'5px', background:'none', border:'1px solid #1a4a8e', color:'#1a4a8e', borderRadius:'5px', fontSize:'11px'}}>
                  Edit Profile / Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- Edit Profile View --- */}
        {editingStudent && (
          <div style={cardStyle}>
            <h3>Update Profile</h3>
            <input value={editingStudent.student_name} onChange={(e)=>setEditingStudent({...editingStudent, student_name: e.target.value})} style={inputStyle} />
            <input value={editingStudent.roll_number} onChange={(e)=>setEditingStudent({...editingStudent, roll_number: e.target.value})} style={inputStyle} />
            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
              <button onClick={handleUpdate} style={{flex:1, padding:'10px', background:'#28a745', color:'white', border:'none', borderRadius:'5px'}}>Update</button>
              <button onClick={() => handleDelete(editingStudent.id)} style={{flex:1, padding:'10px', background:'#dc3545', color:'white', border:'none', borderRadius:'5px'}}>Delete</button>
            </div>
            <button onClick={() => setEditingStudent(null)} style={{width:'100%', marginTop:'10px', background:'#ccc', border:'none', padding:'8px'}}>Cancel</button>
          </div>
        )}

        {/* Dashboard Strength */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} style={cardStyle}>
                <small style={{color:'#1a4a8e'}}>{c}</small>
                <div style={{fontSize:'18px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* Other views (Admission, Selection etc.) remain same */}
        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px', cursor: 'pointer' };
const cardStyle = { background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' };

export default App;
