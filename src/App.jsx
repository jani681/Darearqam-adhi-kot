import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
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

  // --- LOGIN & STATS LOGIC ---
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
        setStatus('Ready');
      }
    } catch (e) {
      alert("Login Error");
      setStatus('Error');
    }
  };

  // --- NAVIGATION HELPER ---
  const fetchRecordsByClass = async (target, cls) => {
    setStatus(`Opening ${cls}...`);
    try {
      setFilterClass(cls);
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView(target);
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  // --- STAFF MANAGEMENT ---
  const fetchStaff = async () => {
    setStatus('Loading Staff...');
    try {
      const q = query(collection(db, "staff_records"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView('staff_list');
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const handleAddStaff = async () => {
    if(!sName || !sPass) return alert("Name and Password are required");
    setStatus('Saving Staff...');
    try {
      await addDoc(collection(db, "staff_records"), {
        name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp()
      });
      setSName(''); setSRole(''); setSSalary(''); setSPass('');
      fetchStaff();
    } catch (e) { setStatus('Error'); }
  };

  const deleteStaff = async (id) => {
    if(window.confirm("Delete this staff member?")) {
      await deleteDoc(doc(db, "staff_records", id));
      fetchStaff();
    }
  };

  // --- ATTENDANCE & PDF ---
  const downloadPDF = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(26, 74, 142);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: "center" });
    const tableRows = Object.entries(record.attendance_data).map(([name, status], i) => [i+1, name, status === 'P' ? 'Present' : 'Absent']);
    doc.autoTable({ startY: 40, head: [['Sr.', 'Name', 'Status']], body: tableRows, headStyles: { fillColor: [26, 74, 142] } });
    doc.save(`Attendance_${record.class}.pdf`);
  };

  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('Error'); }
  };

  // --- UI STYLES ---
  const getNavStyle = (targetView) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '9px',
    cursor: 'pointer', backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e', boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', backgroundColor: 'white', padding: '5px' }} />
          <h3>Ali Campus Management</h3>
      </div>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', border:'none', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', borderRadius:'8px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold', fontSize:'16px'}}>LOGIN</button>
      <p style={{fontSize:'10px', marginTop:'10px'}}>{status}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* Header & Navigation */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'white', padding: '2px' }} />
          <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={fetchStaff} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={fetchHistory} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); setStaffData(null); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* WELCOME PROFILE FOR STAFF */}
        {view === 'dashboard' && userRole === 'staff' && staffData && (
          <div style={{...cardStyle, background: 'linear-gradient(135deg, #1a4a8e, #2c3e50)', color:'white', marginBottom:'20px'}}>
            <h4 style={{margin:'0 0 5px 0'}}>Profile: {staffData.name}</h4>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', opacity:0.9}}>
              <span>Designation: {staffData.role}</span>
              <span>Salary: {staffData.salary}</span>
            </div>
          </div>
        )}

        {/* DASHBOARD GRID */}
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

        {/* STAFF LIST (ADMIN) */}
        {view === 'staff_list' && userRole === 'admin' && (
          <div>
            <div style={cardStyle}>
              <h3>Add Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={handleAddStaff} style={actionBtn}>Save Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span><b>{s.name}</b><br/><small>{s.role} | PWD: {s.password}</small></span>
                  <button onClick={() => deleteStaff(s.id)} style={{background:'#dc3545', color:'white', border:'none', padding:'5px', borderRadius:'5px'}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ATTENDANCE WORKFLOW */}
        {view === 'attendance' && (
          <div>
            <h3>Attendance: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
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
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* HISTORY */}
        {view === 'history' && (
          <div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span><b>{h.date}</b><br/>{h.class}</span>
                  <button onClick={() => downloadPDF(h)} style={{background:'#1a4a8e', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px'}}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SELECT CLASS MODALS */}
        {(view === 'sel_view' || view === 'sel_att' || view === 'sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_att' ? 'attendance' : 'view', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width: '100%', padding: '14px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };

export default App;
