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

  // =========================
  // ✅ PARENT PORTAL STATES (ADDED)
  // =========================
  const [parentRollInput, setParentRollInput] = useState('');
  const [parentClassInput, setParentClassInput] = useState('');
  const [parentStudentResult, setParentStudentResult] = useState(null);
  const [parentAnnouncements, setParentAnnouncements] = useState([]);
  const [parentBanners, setParentBanners] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);

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

  // =========================
  // ✅ PARENT PORTAL DATA LOADER (ADDED)
  // =========================
  useEffect(() => {
    const loadParentData = async () => {
      if (view !== 'parent_portal') return;
      try {
        const ann = await getDocs(collection(db, "announcements"));
        setParentAnnouncements(ann.docs.map(d => ({ id: d.id, ...d.data() })));

        const ban = await getDocs(collection(db, "media_banners"));
        setParentBanners(ban.docs.map(d => ({ id: d.id, ...d.data() })));

        const info = await getDocs(collection(db, "school_info"));
        if (!info.empty) setSchoolInfo(info.docs[0].data());
      } catch (e) {
        console.log(e);
      }
    };
    loadParentData();
  }, [view]);

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

        if (window.confirm("Restore data?")) {
          for (const s of data.students || []) {
            await addDoc(collection(db, "ali_campus_records"), s);
          }
        }

        addNotification("Restore completed", "success");
      } catch (err) {
        addNotification("Restore failed", "warning");
      }
    };
    reader.readAsText(file);
  };

  // =========================
  // NAV BUTTON (ADDED)
  // =========================
  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none',
    fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff',
    color: '#1a4a8e'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} />
      <button onClick={()=>setIsLoggedIn(true)}>Login</button>
    </div>
  );

  return (
    <div>

      {/* NAV */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
        <button onClick={()=>setView('dashboard')} style={getNavStyle('dashboard')}>Home</button>
        <button onClick={()=>setView('parent_portal')} style={getNavStyle('parent_portal')}>👨‍👩‍👧 Parent Portal</button>
      </div>

      {/* =========================
          ✅ PARENT PORTAL VIEW (ADDED)
          ========================= */}
      {view === 'parent_portal' && (
        <div>

          <div style={cardStyle}>
            <h3>🏫 School Info</h3>
            <b>{schoolInfo?.school_name || "School"}</b>
            <p>{schoolInfo?.about}</p>
          </div>

          <div style={cardStyle}>
            <h3>📢 Announcements</h3>
            {parentAnnouncements.map(a => (
              <div key={a.id}>
                <b>{a.title}</b>
                <p>{a.message}</p>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3>📊 Result Lookup</h3>
            <input placeholder="Roll No" value={parentRollInput} onChange={(e)=>setParentRollInput(e.target.value)} />
            <select value={parentClassInput} onChange={(e)=>setParentClassInput(e.target.value)}>
              {CLASSES.map(c=><option key={c}>{c}</option>)}
            </select>

            <button onClick={async()=>{
              const q = query(collection(db,"ali_campus_records"),
                where("roll_number","==",parentRollInput),
                where("class","==",parentClassInput)
              );
              const snap = await getDocs(q);
              if(!snap.empty) setParentStudentResult(snap.docs[0].data());
            }}>
              Search
            </button>

            {parentStudentResult && (
              <div>
                <b>{parentStudentResult.student_name}</b>
                <p>{parentStudentResult.class}</p>
                <p>Fee: {parentStudentResult.base_fee}</p>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h3>📷 Banners</h3>
            {parentBanners.map(b=>(
              <img key={b.id} src={b.imageUrl} style={{width:'100%'}} />
            ))}
          </div>

          <button onClick={()=>setView('dashboard')} style={actionBtn}>
            Back
          </button>

        </div>
      )}

      {/* =========================
          ORIGINAL APP (UNCHANGED BELOW)
          ========================= */}

      {view === 'dashboard' && (
        <div>
          <h2>Dashboard</h2>
        </div>
      )}

    </div>
  );
}

const cardStyle = { background:'white', padding:15, borderRadius:10 };
const actionBtn = { padding:15, background:'#1a4a8e', color:'white', border:'none', borderRadius:10 };

export default App;
