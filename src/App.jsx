import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 

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
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Stats Logic
  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  // --- RESTORED HISTORY LOGIC ---
  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('History Fetch Error'); }
  };

  // --- RESTORED ATTENDANCE FETCH ---
  const fetchRecordsByClass = async (target, cls) => {
    setStatus('Loading...');
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecords(data);
      setSearchTerm(''); 
      setView(target);
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const saveAttendance = async () => {
    if(Object.keys(attendance).length === 0) return alert("Select Presence first!");
    try {
      await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() });
      setStatus('Attendance Saved!'); setView('dashboard');
    } catch (e) { alert("Save Error"); }
  };

  const toggleFeeStatus = async (student) => {
    const newStatus = student.fee_status === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "ali_campus_records", student.id), { fee_status: newStatus });
    fetchRecordsByClass('view', filterClass);
  };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', borderRadius:'5px'}} />
      <button onClick={() => passInput === ADMIN_PASSWORD ? setIsLoggedIn(true) : alert("Wrong Password")} style={{marginTop:'10px', padding:'10px 20px'}}>Login</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={navBtn}>Home</button>
          <button onClick={() => setView('add')} style={navBtn}>Admission</button>
          <button onClick={() => setView('sel_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('sel_att')} style={navBtn}>Attendance</button>
          <button onClick={fetchHistory} style={navBtn}>History</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign:'center', fontSize:'10px', color:'#666'}}>{status}</p>

        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} style={cardStyle}><small>{c}</small><div style={{fontSize:'18px', fontWeight:'bold'}}>{classStats[c] || 0}</div></div>
            ))}
          </div>
        )}

        {/* --- ATTENDANCE VIEW (FIXED) --- */}
        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>Marking: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={saveAttendance} style={actionBtn}>Save Attendance</button>
          </div>
        )}

        {/* --- HISTORY VIEW (FIXED) --- */}
        {view === 'history' && (
          <div>
            <h3>Reports Archive</h3>
            {history.length === 0 ? <p>No records found.</p> : history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><b>{h.date}</b><br/><small>{h.class}</small></div>
                  <button style={{background:'#1a4a8e', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- DIRECTORY VIEW (FIXED) --- */}
        {view === 'view' && !editingStudent && (
          <div>
            <h3>Directory: {filterClass}</h3>
            <input placeholder="Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div><b>{r.student_name}</b> <br/> <small>Roll: {r.roll_number}</small></div>
                  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <button onClick={() => toggleFeeStatus(r)} style={{padding:'4px 8px', fontSize:'10px', background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'5px'}}>{r.fee_status || 'Unpaid'}</button>
                    <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{background:'#25D366', color:'white', padding:'4px 8px', borderRadius:'5px', textDecoration:'none', fontSize:'10px', textAlign:'center'}}>WhatsApp</a>
                  </div>
                </div>
                <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                  <button onClick={() => setEditingStudent(r)} style={{flex:1, padding:'6px', background:'#f0f0f0', border:'1px solid #ccc', borderRadius:'5px', fontSize:'11px'}}>Edit</button>
                  <button onClick={async () => { if(window.confirm("Delete?")) { await deleteDoc(doc(db, "ali_campus_records", r.id)); fetchRecordsByClass('view', filterClass); } }} style={{flex:1, padding:'6px', background:'#fff0f0', border:'1px solid #ffcccc', color:'red', borderRadius:'5px', fontSize:'11px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- ADMISSION & SELECTORS --- */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (923...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => { await addDoc(collection(db, "ali_campus_records"), { student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, class: selectedClass, fee_status: 'Unpaid', created_at: serverTimestamp() }); setView('dashboard'); }} style={actionBtn}>Save</button>
          </div>
        )}

        {editingStudent && (
          <div style={cardStyle}>
            <h3>Edit Profile</h3>
            <input value={editingStudent.student_name} onChange={(e)=>setEditingStudent({...editingStudent, student_name: e.target.value})} style={inputStyle} />
            <input value={editingStudent.roll_number} onChange={(e)=>setEditingStudent({...editingStudent, roll_number: e.target.value})} style={inputStyle} />
            <input value={editingStudent.parent_whatsapp} onChange={(e)=>setEditingStudent({...editingStudent, parent_whatsapp: e.target.value})} style={inputStyle} />
            <button onClick={async () => { await updateDoc(doc(db, "ali_campus_records", editingStudent.id), { student_name: editingStudent.student_name, roll_number: editingStudent.roll_number, parent_whatsapp: editingStudent.parent_whatsapp }); setEditingStudent(null); fetchRecordsByClass('view', filterClass); }} style={actionBtn}>Update</button>
            <button onClick={() => setEditingStudent(null)} style={{width:'100%', marginTop:'5px', padding:'10px'}}>Cancel</button>
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
const statusBtn = { padding: '8px 15px', border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold', marginLeft:'5px' };

export default App;
