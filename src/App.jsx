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

  // Report States
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

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

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      fetchStats();
      return;
    }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setStaffData({ id: snap.docs[0].id, ...docData });
        setUserRole('staff');
        setIsLoggedIn(true);
        fetchStats(); 
      } else { alert("Invalid Password!"); }
    } catch (e) { alert("Login Error"); }
  };

  const fetchRecordsByClass = async (target, cls) => {
    try {
      setFilterClass(cls);
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView(target);
    } catch (e) { console.error(e); }
  };

  // --- STYLES ---
  const getNavStyle = (targetView) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === targetView ? '#f39c12' : '#ffffff', color: '#1a4a8e',
    boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });
  const cardStyle = { background: 'white', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '12px' };
  const inputStyle = { width: '100%', padding: '14px', margin: '8px 0', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' };
  const actionBtn = { width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <div style={{background:'white', padding:'10px', borderRadius:'50%', marginBottom:'20px'}}>
        <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '70px' }} />
      </div>
      <h2>Ali Campus Management</h2>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'280px', border:'none', textAlign:'center', fontSize:'18px'}} />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 80px', borderRadius:'10px', border:'none', background:'#f39c12', color:'white', fontWeight:'bold', fontSize:'16px'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '20px 10px', textAlign: 'center' }}>
        <h3 style={{ color: 'white', margin: '0 0 15px 0' }}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background:'rgba(255,255,255,0.1)', padding:'10px', borderRadius:'15px' }}>
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
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {/* STAFF PANEL FIX: Display "Teacher: Name" */}
        {userRole === 'staff' && staffData && (
          <div style={{...cardStyle, background:'#1a4a8e', color:'white', textAlign:'center'}}>
            <h4 style={{margin:0}}>Teacher: {staffData.name}</h4>
            <small>{staffData.role}</small>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass(userRole === 'admin' ? 'view' : 'attendance', c)} 
                   style={{...cardStyle, borderLeft:'6px solid #f39c12', cursor: 'pointer', marginBottom:0}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* DIRECTORY FIX: WhatsApp Button Included */}
        {view === 'view' && userRole === 'admin' && (
          <div>
            <input placeholder="🔍 Search Students..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <b style={{fontSize:'18px'}}>{r.student_name}</b> <br/>
                    <small>Roll: {r.roll_number} | Dues: {r.total_dues}</small>
                    <div style={{marginTop:'8px'}}>
                       <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{textDecoration:'none', background:'#25D366', color:'white', padding:'4px 10px', borderRadius:'5px', fontSize:'12px', fontWeight:'bold'}}>
                         💬 WhatsApp
                       </a>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'5px'}}>
                    <button onClick={() => { setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setSelectedClass(r.class); setView('add'); }} style={{background:'#f39c12', color:'white', border:'none', padding:'8px', borderRadius:'8px'}}>Edit</button>
                    <button onClick={async () => { if(window.confirm("Delete?")) { await deleteDoc(doc(db, "ali_campus_records", r.id)); fetchRecordsByClass('view', filterClass); }}} style={{background:'#dc3545', color:'white', border:'none', padding:'8px', borderRadius:'8px'}}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REMAINING COMPONENTS (Admit, Staff List, etc.) */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? 'Update Student' : 'New Admission'}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (e.g. 923001234567)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears (Pichli Fees)" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              const total = (Number(baseFee) || 0) + (Number(arrears) || 0);
              const data = { student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, class: selectedClass, base_fee: Number(baseFee), arrears: Number(arrears), total_dues: total };
              if(editingStudent) await updateDoc(doc(db, "ali_campus_records", editingStudent.id), data);
              else await addDoc(collection(db, "ali_campus_records"), { ...data, created_at: serverTimestamp() });
              alert("Saved Successfully!"); setView('dashboard'); fetchStats();
            }} style={actionBtn}>SAVE STUDENT</button>
          </div>
        )}

        {view === 'staff_list' && (
           <div>
             <div style={cardStyle}>
               <h3>Add Staff</h3>
               <input placeholder="Full Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
               <input placeholder="Role (e.g. Math Teacher)" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
               <input type="number" placeholder="Monthly Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
               <input placeholder="Set Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
               <button onClick={async () => {
                 await addDoc(collection(db, "staff_records"), { name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp() });
                 alert("Staff Registered!"); setSName(''); setSPass('');
               }} style={actionBtn}>REGISTER STAFF</button>
             </div>
             {staffRecords.map(s => (
               <div key={s.id} style={{...cardStyle, borderLeft:'6px solid #1a4a8e'}}>
                 <b>{s.name}</b> <br/> <small>{s.role} | Salary: {s.salary}</small>
               </div>
             ))}
           </div>
        )}

        {(view === 'sel_view' || view === 'sel_att' || view === 'sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => {
              if(view === 'sel_report') { /* Logic for report */ }
              else fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass);
            }} style={actionBtn}>OPEN</button>
          </div>
        )}
      </div>
    </div>
  );
}
