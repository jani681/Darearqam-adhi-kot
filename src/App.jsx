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
  
  // Admission States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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

  // --- SAVE NEW STUDENT ---
  const handleSave = async () => {
    if(!name || !rollNo || !whatsapp) return alert("Fill all details!");
    setStatus('Saving...');
    try {
      await addDoc(collection(db, "ali_campus_records"), { 
        student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp,
        class: selectedClass, fee_status: 'Unpaid', created_at: serverTimestamp() 
      });
      setName(''); setRollNo(''); setWhatsapp(''); setStatus('Registered!'); setView('dashboard');
    } catch (e) { alert(e.message); }
  };

  // --- FETCH DIRECTORY/ATTENDANCE ---
  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSearchTerm(''); setView(target); setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  // --- UPDATE PROFILE ---
  const handleUpdate = async () => {
    setStatus('Updating...');
    try {
      await updateDoc(doc(db, "ali_campus_records", editingStudent.id), {
        student_name: editingStudent.student_name,
        roll_number: editingStudent.roll_number,
        parent_whatsapp: editingStudent.parent_whatsapp
      });
      setEditingStudent(null);
      fetchRecordsByClass('view', filterClass);
      setStatus('Profile Updated!');
    } catch (e) { alert(e.message); }
  };

  // --- DELETE STUDENT ---
  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this student?")) {
      await deleteDoc(doc(db, "ali_campus_records", id));
      setEditingStudent(null);
      fetchRecordsByClass('view', filterClass);
      setStatus('Student Deleted');
    }
  };

  // --- FEES TOGGLE ---
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
        <p style={{textAlign:'center', fontSize:'10px', color:'#666'}}>{status}</p>

        {/* --- DIRECTORY VIEW --- */}
        {view === 'view' && !editingStudent && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <input placeholder="🔍 Search Students..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {filteredRecords.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <b>{r.student_name}</b> <br/>
                    <small>Roll: {r.roll_number}</small>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <button onClick={() => toggleFeeStatus(r)} style={{padding:'4px 8px', fontSize:'10px', background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'5px'}}>
                      {r.fee_status || 'Unpaid'}
                    </button>
                    <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{textAlign:'center', textDecoration:'none', padding:'4px 8px', background:'#25D366', color:'white', borderRadius:'5px', fontSize:'10px'}}>WA Chat</a>
                  </div>
                </div>
                {/* --- EDIT BUTTON RE-ADDED --- */}
                <button onClick={() => setEditingStudent(r)} style={{marginTop:'10px', width:'100%', padding:'6px', background:'none', border:'1px solid #1a4a8e', color:'#1a4a8e', borderRadius:'5px', fontSize:'11px', fontWeight:'bold'}}>
                  Edit Profile / Delete Student
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- EDIT/DELETE PROFILE VIEW --- */}
        {editingStudent && (
          <div style={cardStyle}>
            <h3>Edit Student Profile</h3>
            <label style={{fontSize:'12px'}}>Student Name:</label>
            <input value={editingStudent.student_name} onChange={(e)=>setEditingStudent({...editingStudent, student_name: e.target.value})} style={inputStyle} />
            <label style={{fontSize:'12px'}}>Roll Number:</label>
            <input value={editingStudent.roll_number} onChange={(e)=>setEditingStudent({...editingStudent, roll_number: e.target.value})} style={inputStyle} />
            <label style={{fontSize:'12px'}}>Parent WhatsApp:</label>
            <input value={editingStudent.parent_whatsapp} onChange={(e)=>setEditingStudent({...editingStudent, parent_whatsapp: e.target.value})} style={inputStyle} />
            
            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
              <button onClick={handleUpdate} style={{flex:1, padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold'}}>Update</button>
              <button onClick={() => handleDelete(editingStudent.id)} style={{flex:1, padding:'12px', background:'#dc3545', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold'}}>Delete</button>
            </div>
            <button onClick={() => setEditingStudent(null)} style={{width:'100%', marginTop:'10px', background:'#ccc', border:'none', padding:'10px', borderRadius:'5px'}}>Cancel</button>
          </div>
        )}

        {/* --- ADMISSION --- */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>New Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (923...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} style={actionBtn}>Register Student</button>
          </div>
        )}

        {/* Other views remain same as previous stable version */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} style={cardStyle}><small>{c}</small> <div style={{fontSize:'18px', fontWeight:'bold'}}>{classStats[c] || 0}</div></div>
            ))}
          </div>
        )}

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

const navBtn = { padding: '8px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e', fontSize: '11px' };
const cardStyle = { background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' };
const statusBtn = { marginLeft: '5px', padding: '6px 12px', border: 'none', borderRadius: '4px', color: 'white' };

export default App;
