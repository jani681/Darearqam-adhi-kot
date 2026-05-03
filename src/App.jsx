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

  // --- PARENT PORTAL STATES ---
  const [announcements, setAnnouncements] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [mediaBanners, setMediaBanners] = useState([]);
  const [searchRoll, setSearchRoll] = useState('');
  const [searchClass, setSearchClass] = useState(CLASSES[0]);
  const [studentResult, setStudentResult] = useState(null);

  // PREVIEW STATES
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewFileName, setPreviewFileName] = useState('');

  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  // NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // TEACHER DIRECTORY STATES
  const [teacherDirectory, setTeacherDirectory] = useState([]);
  const [dirSearch, setDirSearch] = useState('');

  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    totalStaff: 0,
    todayStudentAttendance: 0,
    todayTeacherAttendance: 0,
    pendingLeaves: 0
  });

  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // ===== PARENT PORTAL LOGIC =====
  const fetchParentPortalData = async () => {
    try {
      const annSnap = await getDocs(query(collection(db, "announcements"), orderBy("date", "desc")));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const infoSnap = await getDocs(collection(db, "school_info"));
      if (!infoSnap.empty) setSchoolInfo(infoSnap.docs[0].data());
      const mediaSnap = await getDocs(collection(db, "media_banners"));
      setMediaBanners(mediaSnap.docs.map(d => d.data()));
    } catch (e) { console.error("Portal fetch error", e); }
  };

  const handleStudentLookup = async () => {
    if (!searchRoll) return alert("Enter Roll Number");
    const q = query(collection(db, "ali_campus_records"), where("roll_number", "==", searchRoll), where("class", "==", searchClass));
    const snap = await getDocs(q);
    if (!snap.empty) setStudentResult(snap.docs[0].data());
    else { alert("No record found"); setStudentResult(null); }
  };

  // ===== NOTIFICATION HELPER =====
  const addNotification = (msg, type = 'success') => {
    const newNotif = {
      id: Date.now(),
      message: msg,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  // ===== BACKUP & RESTORE LOGIC =====
  const handleDownloadBackup = async () => {
    try {
      addNotification("Preparing backup...", "info");
      const studentsSnap = await getDocs(collection(db, "ali_campus_records"));
      const staffSnap = await getDocs(collection(db, "staff_records"));
      const dailyAttSnap = await getDocs(collection(db, "daily_attendance"));
      const teacherAttSnap = await getDocs(collection(db, "teacher_attendance"));

      const backupData = {
        students: studentsSnap.docs.map(doc => doc.data()),
        staff: staffSnap.docs.map(doc => doc.data()),
        attendance: dailyAttSnap.docs.map(doc => doc.data()),
        teacher_attendance: teacherAttSnap.docs.map(doc => doc.data()),
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ali_campus_backup_${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification("Backup downloaded successfully", "success");
    } catch (e) {
      console.error(e);
      addNotification("Backup failed!", "warning");
    }
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (window.confirm(`Restore ${data.students.length} students?`)) {
          for (const student of data.students) await addDoc(collection(db, "ali_campus_records"), student);
          for (const s of data.staff) await addDoc(collection(db, "staff_records"), s);
          addNotification("Data restored successfully", "success");
          fetchStats();
        }
      } catch (err) { alert("Restore failed"); }
    };
    reader.readAsText(file);
  };

  const getFilteredRecords = () => {
    return records.filter(r => {
      const matchesSearch = r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.roll_number.toString().includes(searchQuery);
      const matchesClass = classFilter === 'All' || r.class === classFilter;
      return matchesSearch && matchesClass;
    });
  };

  const downloadCSV = (data, headers, fileName) => {
    const csvRows = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
    setShowPreview(false);
  };

  const handleExportStudents = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const data = snap.docs.map(d => ({ student_name: d.data().student_name, roll_number: d.data().roll_number, class: d.data().class, base_fee: d.data().base_fee }));
    setPreviewData(data);
    setPreviewHeaders(["student_name", "roll_number", "class", "base_fee"]);
    setPreviewFileName("Students_Data");
    setShowPreview(true);
  };

  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.text(title, 105, 15, { align: 'center' });
    doc.autoTable({ head: [headers], body: bodyData, startY: 25 });
    doc.save(`${fileName}.pdf`);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
      if (dist <= 500) {
        await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp(), distance: Math.round(dist) + "m" });
        alert("Attendance Marked!"); 
      } else alert("Too far from school!");
    });
  };

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); } 
    else alert("Wrong Password!");
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
    if (userRole === 'admin') {
      const staffSnap = await getDocs(collection(db, "staff_records"));
      setAdminAnalytics(prev => ({ ...prev, totalStudents: snap.size, totalStaff: staffSnap.size }));
    }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const clearInputs = () => { setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setEditingStudent(null); };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });

  const getUnifiedTeacherAttendanceList = () => {
    const selectedDate = tAttSearchDate || today;
    const presentList = teacherAttendanceList.filter(t => t.date === selectedDate);
    const presentNames = new Set(presentList.map(p => p.name));
    const absentList = staffRecords.filter(staff => !presentNames.has(staff.name)).map(staff => ({ id: `abs-${staff.name}`, name: staff.name, date: selectedDate, time: null, distance: "N/A" }));
    return [...presentList, ...absentList];
  };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', borderRadius: '50%', background:'white', padding:'5px' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
      <button onClick={() => { fetchParentPortalData(); setView('parent_portal'); setIsLoggedIn(true); setUserRole('parent'); }} style={{marginTop:'10px', background:'transparent', color:'white', border:'1px solid white', padding:'8px 30px', borderRadius:'8px', fontSize:'12px'}}>VIEW PARENT PORTAL</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      
      {showPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'white', width:'100%', maxWidth:'600px', borderRadius:'15px', padding:'15px' }}>
            <h3>Data Preview</h3>
            <button onClick={() => downloadCSV(previewData, previewHeaders, previewFileName)} style={actionBtn}>Download CSV</button>
            <button onClick={() => setShowPreview(false)} style={{...actionBtn, background:'#e74c3c', marginTop:'10px'}}>Close</button>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        {userRole !== 'parent' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
            <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
            {userRole === 'admin' && <button onClick={() => { clearInputs(); setView('add'); }} style={getNavStyle('add')}>📝 Admit</button>}
            <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
            <button onClick={() => { setIsLoggedIn(false); setView('dashboard'); }} style={getNavStyle('logout')}>🚪 Out</button>
          </div>
        )}
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {/* PARENT PORTAL VIEW */}
        {view === 'parent_portal' && (
          <div>
            <div style={{...cardStyle, background:'#1a4a8e', color:'white', textAlign:'center', borderLeft:'none'}}>
              <h2 style={{margin:0}}>Parent Portal</h2>
            </div>

            {schoolInfo && (
              <div style={cardStyle}>
                <h3 style={{color:'#1a4a8e'}}>{schoolInfo.schoolName}</h3>
                <p>{schoolInfo.about}</p>
                <small><b>Principal:</b> {schoolInfo.principalName}</small>
              </div>
            )}

            <div style={{...cardStyle, borderLeft:'6px solid #2ecc71'}}>
              <h4>📊 Student Result Lookup</h4>
              <input placeholder="Roll Number" value={searchRoll} onChange={(e)=>setSearchRoll(e.target.value)} style={inputStyle} />
              <select value={searchClass} onChange={(e)=>setSearchClass(e.target.value)} style={inputStyle}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={handleStudentLookup} style={{...actionBtn, background:'#2ecc71'}}>Search</button>
              {studentResult && (
                <div style={{marginTop:'10px', padding:'10px', background:'#f0f9f4', borderRadius:'10px'}}>
                  <b>{studentResult.student_name}</b><br/>
                  Fee: {studentResult.base_fee} | Arrears: {studentResult.arrears || 0}
                </div>
              )}
            </div>

            <h4 style={{color:'#1a4a8e'}}>📢 Announcements</h4>
            {announcements.map(ann => (
              <div key={ann.id} style={cardStyle}>
                <small>{ann.date}</small>
                <h4>{ann.title}</h4>
                <p>{ann.message}</p>
              </div>
            ))}

            <button onClick={() => { setIsLoggedIn(false); setView('dashboard'); }} style={actionBtn}>Back to Login</button>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && userRole !== 'parent' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={async () => {
                setFilterClass(c);
                const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                const snap = await getDocs(q);
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView(userRole === 'admin' ? 'view' : 'attendance');
              }} style={cardStyle}>
                <small style={{color:'#1a4a8e'}}>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ATTENDANCE VIEW */}
        {view === 'attendance' && (
          <div>
            <h3>{filterClass} Attendance</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <b>{r.student_name}</b>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})} style={{background:attendance[r.id]==='P'?'#2ecc71':'#ccc', border:'none', color:'white', padding:'5px 10px', borderRadius:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})} style={{background:attendance[r.id]==='A'?'#e74c3c':'#ccc', border:'none', color:'white', padding:'5px 10px', borderRadius:'5px', marginLeft:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db,"daily_attendance"), { class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp() });
              alert("Saved!"); setView('dashboard');
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* ADMIT STUDENT */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Edit" : "New"} Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              if(editingStudent) await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d);
              else await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              setView('dashboard'); clearInputs();
            }} style={actionBtn}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };

export default App;
