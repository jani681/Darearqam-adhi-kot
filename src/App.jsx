import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffData, setStaffData] = useState(null); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  const [classStats, setClassStats] = useState({});
  
  // Student States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Staff States
  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- CORE FUNCTIONS ---
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

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      fetchStats();
      return;
    }

    setStatus('Verifying Staff...');
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setStaffData({ id: snap.docs[0].id, ...docData });
        setUserRole('staff');
        setIsLoggedIn(true);
        fetchStats(); 
        setStatus('Staff Login Success');
      } else {
        alert("Invalid Password!");
      }
    } catch (e) { setStatus('Error'); }
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus(`Loading ${cls}...`);
    try {
      setFilterClass(cls);
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecords(data);
      setView(target);
      setStatus('Ready');
    } catch (e) { setStatus('Error'); }
  };

  // --- UI STYLES ---
  const getNavStyle = (targetView) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '9px',
    cursor: 'pointer', backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e', boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  const cardStyle = { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '10px' };
  const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing:'border-box' };
  const actionBtn = { width: '100%', padding: '14px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px', marginBottom:'10px' }} />
      <h3>Ali Campus Management</h3>
      <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', borderRadius:'8px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => {
            const snap = await getDocs(query(collection(db, "staff_records"), orderBy("created_at", "desc")));
            setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setView('staff_list');
          }} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={async () => {
            const snap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setView('history');
          }} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        {/* Staff Identity Box */}
        {userRole === 'staff' && staffData && (
          <div style={{...cardStyle, background: '#1a4a8e', color:'white'}}>
            <h4 style={{margin:0}}>Welcome, {staffData.name}</h4>
            <small>{staffData.role} | Salary: {staffData.salary}</small>
          </div>
        )}

        {/* Home / Dashboard View */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} 
                   style={{...cardStyle, borderLeft:'5px solid #f39c12', cursor: 'pointer'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* Directory (Admin Only) */}
        {view === 'view' && userRole === 'admin' && (
          <div>
            <input placeholder="Search Student..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span><b>{r.student_name}</b><br/><small>Roll: {r.roll_number}</small></span>
                  <button onClick={async () => {
                     if(window.confirm("Delete?")) {
                       await deleteDoc(doc(db, "ali_campus_records", r.id));
                       fetchRecordsByClass('view', filterClass);
                     }
                  }} style={{background:'#dc3545', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admit Form (Admin Only) */}
        {view === 'add' && userRole === 'admin' && (
          <div style={cardStyle}>
            <h3>Student Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              await addDoc(collection(db, "ali_campus_records"), {
                student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp,
                class: selectedClass, base_fee: Number(baseFee), created_at: serverTimestamp()
              });
              alert("Saved!"); setView('dashboard'); fetchStats();
            }} style={actionBtn}>Save Student</button>
          </div>
        )}

        {/* Attendance (Shared) */}
        {view === 'attendance' && (
          <div>
            <h3>Attendance: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <span>{r.student_name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{background: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{background: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button disabled={records.length === 0} onClick={async () => {
              await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() });
              alert("Attendance Saved!"); setView('dashboard'); setAttendance({});
            }} style={actionBtn}>Submit</button>
          </div>
        )}

        {/* Staff List (Admin Only) */}
        {view === 'staff_list' && userRole === 'admin' && (
          <div>
            <div style={cardStyle}>
              <h3>Add Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={async () => {
                await addDoc(collection(db, "staff_records"), { name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp() });
                setSName(''); setSPass(''); alert("Staff Registered");
              }} style={actionBtn}>Add</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}><b>{s.name}</b> ({s.role}) - PWD: {s.password}</div>
            ))}
          </div>
        )}

        {/* History View (Shared) */}
        {view === 'history' && (
          <div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}><b>{h.date}</b> - {h.class}</div>
            ))}
          </div>
        )}

        {/* Selection Screens */}
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
