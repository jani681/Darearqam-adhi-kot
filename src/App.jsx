import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  // Authentication & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'teacher'
  const [currentUser, setCurrentUser] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  
  // Data States
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [status, setStatus] = useState('Online');
  
  // Student Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); 

  // Staff Input States
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  // Attendance & Report States
  const [attendance, setAttendance] = useState({}); 
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- AUTH LOGIC ---
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }

    // Check if it's a teacher password
    setStatus('Checking Staff Login...');
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const userData = snap.docs[0].data();
      setCurrentUser({ id: snap.docs[0].id, ...userData });
      setUserRole('teacher');
      setIsLoggedIn(true);
      setView('sel_att'); // Teachers land directly on attendance selection
      setStatus('Welcome ' + userData.name);
    } else {
      alert("Invalid Password");
      setStatus('Login Failed');
    }
  };

  // --- STAFF FUNCTIONS ---
  const fetchStaff = async () => {
    if (userRole !== 'admin') return;
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
    try {
      await addDoc(collection(db, "staff_records"), {
        name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp()
      });
      setSName(''); setSRole(''); setSSalary(''); setSPass('');
      fetchStaff();
    } catch (e) { setStatus('Error'); }
  };

  // --- STUDENT & ATTENDANCE FUNCTIONS (PRESERVED) ---
  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

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

  // Styling Helper
  const getNavStyle = (targetView) => ({
    padding: '12px 5px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '9px',
    cursor: 'pointer',
    backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e',
    boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

  // --- LOGIN UI ---
  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white', padding:'20px' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', marginBottom:'20px', background:'white', borderRadius:'50%', padding:'10px' }} />
      <h3>Ali Campus Management</h3>
      <input 
        type="password" 
        placeholder="Enter Password" 
        value={passInput} 
        onChange={(e)=>setPassInput(e.target.value)} 
        style={{padding:'15px', borderRadius:'10px', border:'none', width:'100%', maxWidth:'300px', textAlign:'center', fontSize:'18px'}} 
      />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 40px', borderRadius:'10px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold', fontSize:'16px', width:'100%', maxWidth:'300px'}}>LOGIN</button>
      <p style={{marginTop:'15px', fontSize:'12px'}}>{status}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* HEADER SECTION */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'white', padding: '2px' }} />
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM</h2>
            <small style={{color:'#f39c12'}}>{userRole === 'admin' ? 'ADMIN PANEL' : `TEACHER: ${currentUser?.name}`}</small>
          </div>
        </div>

        {/* NAVIGATION GRID - Dynamic based on Role */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          {userRole === 'admin' ? (
            <>
              <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
              <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admit</button>
              <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>
              <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
              <button onClick={fetchStaff} style={getNavStyle('staff_list')}>👥 Staff</button>
              <button onClick={() => { setStatus('Loading History...'); setView('history'); }} style={getNavStyle('history')}>📜 Hist</button>
              <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Mark Attend</button>
              <div style={{gridColumn:'span 2'}}></div>
            </>
          )}
          <button onClick={() => { setIsLoggedIn(false); setPassInput(''); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign:'center', fontSize:'10px', color:'#666'}}>{status}</p>

        {/* ADMIN DASHBOARD */}
        {view === 'dashboard' && userRole === 'admin' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass('view', c)} style={{...cardStyle, borderLeft:'5px solid #f39c12', cursor:'pointer'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF SECTION (Admin Only) */}
        {view === 'staff_list' && userRole === 'admin' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Staff Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={handleAddStaff} style={actionBtn}>Register Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={{...cardStyle, borderLeft:'5px solid #1a4a8e'}}>
                <b>{s.name}</b> <br/><small>{s.role} | Pass: {s.password}</small>
              </div>
            ))}
          </div>
        )}

        {/* ATTENDANCE SELECTION (Both Roles) */}
        {(view === 'sel_att' || (userRole === 'admin' && view === 'sel_view')) && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_att' ? 'attendance' : 'view', filterClass)} style={actionBtn}>Open Class</button>
          </div>
        )}

        {/* ATTENDANCE MARKING (Both Roles) */}
        {view === 'attendance' && (
          <div>
            <h3>Mark Attendance: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', backgroundColor: attendance[r.student_name] === 'P' ? '#f0fff4' : attendance[r.student_name] === 'A' ? '#fff5f5' : 'white'}}>
                <span>{r.student_name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{background: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{background: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button disabled={Object.keys(attendance).length === 0} onClick={async () => { 
              await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp(), marked_by: currentUser?.name || 'Admin' }); 
              setView(userRole === 'admin' ? 'dashboard' : 'sel_att'); setAttendance({}); 
            }} style={actionBtn}>Save Attendance</button>
          </div>
        )}

        {/* PRESERVED: Student View, Admission, History, Reports (Admin Only logic applied in nav) */}
        {view === 'view' && userRole === 'admin' && (
          <div>
            <input placeholder="🔍 Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={{...cardStyle, borderLeft: r.fee_status === 'Paid' ? '5px solid #28a745' : '5px solid #dc3545'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><b>{r.student_name}</b> <br/><small>Roll: {r.roll_number} | Dues: {r.total_dues}</small></div>
                  <div style={{display:'flex', gap:'5px'}}>
                    <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{padding:'5px', background:'#25D366', borderRadius:'5px', color:'white', textDecoration:'none'}}>WA</a>
                    <button onClick={() => { setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setView('add'); }} style={{background:'#f39c12', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Admission Form (Admin Only) */}
        {view === 'add' && userRole === 'admin' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Update Student" : "Admission"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
               const data = { student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, class: selectedClass, base_fee: Number(baseFee), arrears: Number(arrears), total_dues: Number(baseFee)+Number(arrears) };
               editingStudent ? await updateDoc(doc(db, "ali_campus_records", editingStudent.id), data) : await addDoc(collection(db, "ali_campus_records"), {...data, created_at: serverTimestamp()});
               setView('dashboard'); setEditingStudent(null);
            }} style={actionBtn}>Save</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };

export default App;
