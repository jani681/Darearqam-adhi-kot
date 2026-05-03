import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
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
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');
  const [sWhatsapp, setSWhatsapp] = useState(''); // NEW STATE FOR STAFF WHATSAPP

  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [teacherAttendanceList, setTeacherAttendanceList] = useState([]);
  const [tAttSearchDate, setTAttSearchDate] = useState('');

  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState(null);
  const [teacherProfileRecords, setTeacherProfileRecords] = useState([]);

  const [myProfileData, setMyProfileData] = useState(null);
  const [myAttendanceRecords, setMyAttendanceRecords] = useState([]);

  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [myLeaveRecords, setMyLeaveRecords] = useState([]);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewFileName, setPreviewFileName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    totalStaff: 0,
    todayStudentAttendance: 0,
    todayTeacherAttendance: 0,
    pendingLeaves: 0
  });

  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  const addNotification = (msg, type = 'success') => {
    const newNotif = {
      id: Date.now(),
      message: msg,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
    
    if (userRole === 'admin') {
      const staffSnap = await getDocs(collection(db, "staff_records"));
      const todayStudAtt = await getDocs(query(collection(db, "daily_attendance"), where("date", "==", today)));
      const todayTeachAtt = await getDocs(query(collection(db, "teacher_attendance"), where("date", "==", today)));
      const pendingLeavesSnap = await getDocs(query(collection(db, "teacher_leaves"), where("status", "==", "pending")));
      
      let studentAttendanceCount = 0;
      todayStudAtt.docs.forEach(doc => {
        const data = doc.data().attendance_data;
        if (data) studentAttendanceCount += Object.values(data).filter(v => v === 'P').length;
      });

      setAdminAnalytics({
        totalStudents: snap.size,
        totalStaff: staffSnap.size,
        todayStudentAttendance: studentAttendanceCount,
        todayTeacherAttendance: todayTeachAtt.size,
        pendingLeaves: pendingLeavesSnap.size
      });
    }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) { 
        const teacherData = snap.docs[0].data();
        setStaffName(teacherData.name); 
        setMyProfileData(teacherData); 
        setUserRole('staff'); 
        setIsLoggedIn(true); 
      } else alert("Wrong Password!");
    } catch (e) { alert("Login Error"); }
  };

  const handleTeacherAttendance = async () => {
    if (!navigator.geolocation) return alert("Location not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const R = 6371e3;
      const dLat = (SCHOOL_COORDS.lat - pos.coords.latitude) * Math.PI / 180;
      const dLon = (SCHOOL_COORDS.lng - pos.coords.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pos.coords.latitude * Math.PI / 180) * Math.cos(SCHOOL_COORDS.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      
      if (dist <= 500) {
        await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp(), distance: Math.round(dist) + "m" });
        alert("Attendance Marked!"); 
      } else alert(`Too far: ${Math.round(dist)}m`);
    });
  };

  const getUnifiedTeacherAttendanceList = () => {
    const selectedDate = tAttSearchDate || today;
    const presentList = teacherAttendanceList.filter(t => t.date === selectedDate);
    const presentNames = new Set(presentList.map(p => p.name));
    const absentList = staffRecords
      .filter(staff => !presentNames.has(staff.name))
      .map(staff => ({
        id: `absent-${staff.name}`,
        name: staff.name,
        date: selectedDate,
        time: null, 
        distance: "N/A"
      }));
    return [...presentList, ...absentList];
  };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', background:'white', padding:'5px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={{...navBtn, background: view==='dashboard'?'#f39c12':'white'}}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={{...navBtn, background: view==='add'?'#f39c12':'white'}}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={{...navBtn, background: view==='sel_view'?'#f39c12':'white'}}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={{...navBtn, background: view==='sel_att'?'#f39c12':'white'}}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => { const s = await getDocs(collection(db, "staff_records")); setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()}))); setView('staff_list'); }} style={{...navBtn, background: view==='staff_list'?'#f39c12':'white'}}>👥 Staff</button>}
          <button onClick={() => setView('history')} style={{...navBtn, background: view==='history'?'#f39c12':'white'}}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={async () => { 
            const sRec = await getDocs(collection(db, "staff_records"));
            setStaffRecords(sRec.docs.map(d => ({id: d.id, ...d.data()})));
            const t = await getDocs(query(collection(db, "teacher_attendance"), orderBy("timestamp","desc"))); 
            setTeacherAttendanceList(t.docs.map(d=>({id:d.id, ...d.data()}))); 
            const l = await getDocs(collection(db, "teacher_leaves"));
            setAllLeaves(l.docs.map(d=>({id:d.id, ...d.data()})));
            setView('teacher_attendance_view'); 
          }} style={{...navBtn, background: view==='teacher_attendance_view'?'#f39c12':'white'}}>📍 Teach</button>}
          <button onClick={() => setIsLoggedIn(false)} style={navBtn}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView(userRole === 'admin' ? 'view' : 'attendance'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/>
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle}/>
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle}/>
              {/* WHATSAPP INPUT FIELD */}
              <input placeholder="WhatsApp (92300xxxxxxx)" value={sWhatsapp} onChange={(e)=>setSWhatsapp(e.target.value)} style={inputStyle}/>
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{
                await addDoc(collection(db, "staff_records"), {name:sName, role:sRole, salary:sSalary, password:sPass, whatsapp: sWhatsapp});
                alert("Staff Added");
                const s = await getDocs(collection(db, "staff_records")); setStaffRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
                setSName(''); setSRole(''); setSSalary(''); setSPass(''); setSWhatsapp('');
              }} style={actionBtn}>Add Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <b>👨 {s.name} ({s.role})</b>
                   {s.whatsapp && (
                     <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#25D366', fontWeight:'bold', fontSize:'12px'}}>
                       🟢 WhatsApp
                     </a>
                   )}
                </div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>Salary: {s.salary} | Password: {s.password}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'teacher_attendance_view' && (
          <div>
            <h3>Teacher Attendance</h3>
            {getUnifiedTeacherAttendanceList().map(t => (
              <div key={t.id} style={{...cardStyle, borderLeft: t.time ? '6px solid #2ecc71' : '6px solid #e74c3c'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{t.name}</b>
                  <span style={{color: t.time ? '#1a4a8e' : '#e74c3c'}}>{t.time || "❌ Absent"}</span>
                </div>
              </div>
            ))}
            <hr />
            <h3>Leave Applications</h3>
            {allLeaves.map(l => {
              const teacherInfo = staffRecords.find(s => s.name === l.name);
              const teacherWhatsapp = teacherInfo?.whatsapp;

              return (
                <div key={l.id} style={cardStyle}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <b>{l.name}</b>
                    <span style={{color: l.status === 'approved' ? 'green' : 'orange'}}>{l.status}</span>
                  </div>
                  <p style={{fontSize:'12px'}}>{l.fromDate} to {l.toDate}<br/>Reason: {l.reason}</p>
                  
                  {l.status === 'pending' && (
                    <div style={{display:'flex', gap:'5px'}}>
                      <button onClick={async () => {
                        await updateDoc(doc(db, "teacher_leaves", l.id), { status: 'approved' });
                        if(teacherWhatsapp) window.open(`https://wa.me/${teacherWhatsapp}?text=Your%20leave%20has%20been%20approved.%20Regards%20Admin`, '_blank');
                        alert("Approved and WhatsApp link opened!");
                        setView('dashboard');
                      }} style={{flex:1, background:'#2ecc71', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>Approve</button>
                      
                      <button onClick={async () => {
                        await updateDoc(doc(db, "teacher_leaves", l.id), { status: 'rejected' });
                        if(teacherWhatsapp) window.open(`https://wa.me/${teacherWhatsapp}?text=Your%20leave%20has%20been%20rejected.%20Please%20contact%20admin.`, '_blank');
                        alert("Rejected and WhatsApp link opened!");
                        setView('dashboard');
                      }} style={{flex:1, background:'#e74c3c', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>Reject</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };
const navBtn = { padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px', color: '#1a4a8e', cursor:'pointer' };

export default App;
