import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc, setDoc, onSnapshot } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const SECTIONS = ["A", "B", "C"]; 
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; 

const MOTIVATIONS = [
  "Teaching is the one profession that creates all other professions.",
  "Your influence as a teacher can never be erased.",
  "The art of teaching is the art of assisting discovery.",
  "Every student has a spark; you are the one who lights it.",
  "Education is the most powerful weapon which you can use to change the world.",
  "Small steps in the classroom lead to big leaps in the future.",
  "A good teacher is like a candle—it consumes itself to light the way for others."
];

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
  const [filterSection, setFilterSection] = useState('All'); 
  const [status, setStatus] = useState('Online');
  const [classStats, setClassStats] = useState({});
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState(''); 
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

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewFileName, setPreviewFileName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [teacherDirectory, setTeacherDirectory] = useState([]);
  const [dirSearch, setDirSearch] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Corrected Extension States for Sync Issues
  const [dailyQuote, setDailyQuote] = useState('');
  const [teacherSummary, setTeacherSummary] = useState({ todayClasses: 0, attendanceMarked: false, pendingLeaves: 0 });
  const [systemMessages, setSystemMessages] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]); // Fix for Empty Calendar

  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    totalStaff: 0,
    todayStudentAttendance: 0,
    todayTeacherAttendance: 0,
    pendingLeaves: 0
  });

  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // Fix 5: Dynamic Motivational Line (Date-based rotation)
  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setDailyQuote(MOTIVATIONS[dayOfYear % MOTIVATIONS.length]);
  }, [today]);

  // Fix 2 & 3: Real-time sync for Reminders and Pending Tasks
  useEffect(() => {
    if (isLoggedIn && userRole === 'staff') {
      const q = query(collection(db, "teacher_attendance"), where("name", "==", staffName), where("date", "==", today));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTeacherSummary(prev => ({ ...prev, attendanceMarked: !snapshot.empty }));
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn, userRole, staffName, today]);

  // Fix 4: Calendar Event Synchronization
  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, "school_events"), orderBy("date", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCalendarEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const addNotification = (msg, type = 'success') => {
    const newNotif = {
      id: Date.now(),
      message: msg,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

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
        if (!data.students || !data.staff || !data.attendance) {
          throw new Error("Invalid backup file format");
        }
        if (window.confirm(`Found ${data.students.length} students and ${data.staff.length} staff records. This will ADD them to the database. Continue?`)) {
          addNotification("Restoring data...", "info");
          for (const student of data.students) await addDoc(collection(db, "ali_campus_records"), student);
          for (const s of data.staff) await addDoc(collection(db, "staff_records"), s);
          for (const att of data.attendance) await addDoc(collection(db, "daily_attendance"), att);
          if (data.teacher_attendance) {
            for (const tAtt of data.teacher_attendance) await addDoc(collection(db, "teacher_attendance"), tAtt);
          }
          addNotification("Data restored successfully", "success");
          fetchStats();
        }
      } catch (err) {
        alert("Restore failed: " + err.message);
        addNotification("Restore failed!", "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const getFilteredRecords = () => {
    return records.filter(r => {
      const matchesSearch = r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.roll_number.toString().includes(searchQuery);
      const matchesClass = classFilter === 'All' || r.class === classFilter;
      const matchesSection = filterSection === 'All' || (r.section || 'General') === filterSection;
      return matchesSearch && matchesClass && matchesSection;
    });
  };

  const downloadCSV = (data, headers, fileName) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join('\n'));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowPreview(false);
    addNotification(`Exported ${fileName} successfully`, 'info');
  };

  const handleExportStudents = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const data = snap.docs.map(d => ({
        student_name: d.data().student_name,
        roll_number: d.data().roll_number,
        class: d.data().class,
        section: d.data().section || 'General',
        base_fee: d.data().base_fee,
        arrears: d.data().arrears
      }));
      setPreviewData(data);
      setPreviewHeaders(["student_name", "roll_number", "class", "section", "base_fee", "arrears"]);
      setPreviewFileName("All_Students_Data");
      setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const handleExportStaff = async () => {
    try {
      const snap = await getDocs(collection(db, "staff_records"));
      const data = snap.docs.map(d => ({
        name: d.data().name,
        role: d.data().role,
        salary: d.data().salary,
        password: d.data().password
      }));
      setPreviewData(data);
      setPreviewHeaders(["name", "role", "salary", "password"]);
      setPreviewFileName("Staff_Records");
      setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const handleExportTodayAttendance = async () => {
    try {
      const q = query(collection(db, "daily_attendance"), where("date", "==", today));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        class: d.data().class,
        date: d.data().date,
        total_marked: Object.keys(d.data().attendance_data || {}).length
      }));
      setPreviewData(data);
      setPreviewHeaders(["class", "date", "total_marked"]);
      setPreviewFileName(`Attendance_${today}`);
      setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const getTeacherStats = (attendanceList, leaveList) => {
    const totalPresent = attendanceList.length;
    const totalLeave = leaveList.filter(l => l.status === "approved").length;
    const totalAbsent = 0; 
    return { totalPresent, totalLeave, totalAbsent };
  };

  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.setFillColor(26, 74, 142);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(title, 105, 25, { align: 'center' });
    doc.autoTable({ 
      head: [headers], 
      body: bodyData, 
      startY: 40,
      headStyles: { fillColor: [26, 74, 142], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 40 }
    });
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 14, 285);
    }
    doc.save(`${fileName}.pdf`);
    addNotification(`Generated PDF: ${fileName}`, 'info');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = async () => {
    if (!navigator.geolocation) return alert("Location not supported");
    try {
      setStatus('Verifying Location...');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
        if (dist <= 500) {
          // Fix 1: Ensure ONE record per date via doc key naming convention
          const docId = `${today}_${staffName.replace(/\s+/g, '_')}`;
          await setDoc(doc(db, "teacher_attendance", docId), { 
            name: staffName, 
            date: today, 
            time: new Date().toLocaleTimeString(), 
            timestamp: serverTimestamp(), 
            distance: Math.round(dist) + "m" 
          });
          
          alert("Attendance Marked!"); 
          setStatus('Done');
          addNotification("Attendance marked successfully", "success");
        } else { 
          alert(`Too far! ${Math.round(dist)}m.`); 
          setStatus('Out of Range');
          addNotification(`Failed: Out of range (${Math.round(dist)}m)`, "warning");
        }
      }, () => alert("Enable Location Access!"));
    } catch (e) {
      console.error(e);
      alert("Error marking attendance");
      setStatus('Error');
    }
  };

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { 
      setUserRole('admin'); 
      setIsLoggedIn(true); 
      addNotification("Logged in as Admin", "info");
      return; 
    }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) { 
        const teacherData = snap.docs[0].data();
        setStaffName(teacherData.name); 
        setMyProfileData(teacherData); 
        setUserRole('staff'); 
        setIsLoggedIn(true); 
        addNotification(`Welcome back, ${teacherData.name}`, "info");
      } else alert("Wrong Password!");
    } catch (e) { alert("Login Error"); }
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
    
    if (userRole === 'admin') {
      try {
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
      } catch (err) { console.error("Analytics fetch failed", err); }
    }

    if (userRole === 'staff') {
      const qLeaves = query(collection(db, "teacher_leaves"), where("name", "==", staffName), where("status", "==", "pending"));
      const leaveSnap = await getDocs(qLeaves);
      
      setTeacherSummary(prev => ({
        ...prev,
        todayClasses: Object.keys(classStats).length,
        pendingLeaves: leaveSnap.size
      }));
      setSystemMessages([
        { id: 1, text: "Reminder: Please complete student attendance by 9:00 AM.", type: 'notice' },
        { id: 2, text: "Admin: Monthly staff meeting scheduled for Saturday.", type: 'admin' }
      ]);
    }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const clearInputs = () => {
    setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setSelectedSection(''); setEditingStudent(null); 
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });

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
        distance: "N/A",
        status: "Absent (Auto Detected)"
      }));
    return [...presentList, ...absentList];
  };

  const requestDelete = (record) => {
    if(userRole !== 'admin') return alert("Access Denied: Admin Only");
    setRecordToDelete(record);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  const confirmFinalDelete = async () => {
    if (userRole !== 'admin') return;
    if (deleteConfirmText !== "DELETE") return alert("Please type DELETE to confirm.");
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "daily_attendance", recordToDelete.id));
      setHistory(prev => prev.filter(h => h.id !== recordToDelete.id));
      addNotification(`Record for ${recordToDelete.class} (${recordToDelete.date}) deleted permanently.`, "warning");
      alert("Record deleted successfully.");
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    } catch (e) {
      alert("Error deleting record: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Extension: Mini Calendar Component
  const MiniCalendar = () => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    return (
      <div style={{ background: '#fff', borderRadius: '15px', padding: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#1a4a8e', textAlign: 'center' }}>
          {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {[...Array(daysInMonth)].map((_, i) => (
            <div key={i} style={{ 
              fontSize: '10px', padding: '4px', textAlign: 'center', borderRadius: '4px',
              backgroundColor: (i + 1) === currentDay ? '#f39c12' : '#f0f2f5',
              color: (i + 1) === currentDay ? '#fff' : '#333'
            }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    );
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
      
      {isDeleteModalOpen && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', boxSizing:'border-box' }}>
            <div style={{ background:'white', width:'100%', maxWidth:'400px', borderRadius:'15px', padding:'20px', textAlign:'center' }}>
                <h3 style={{color:'#e74c3c', marginTop:0}}>⚠️ Critical Warning</h3>
                <p style={{fontSize:'14px', color:'#444', lineHeight:'1.5'}}>Are you sure you want to delete this record? This action cannot be undone.</p>
                <div style={{background:'#f8f9fa', padding:'10px', borderRadius:'8px', margin:'15px 0', fontSize:'13px', border:'1px solid #eee'}}>
                    <b>Class:</b> {recordToDelete?.class}<br/><b>Date:</b> {recordToDelete?.date}
                </div>
                <p style={{fontSize:'12px', color:'#666', marginBottom:'10px'}}>Type <b>DELETE</b> to confirm:</p>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" style={{...inputStyle, textAlign:'center', borderColor:'#e74c3c', color:'#e74c3c', fontWeight:'bold'}} />
                <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <button disabled={deleteConfirmText !== "DELETE" || isDeleting} onClick={confirmFinalDelete} style={{...actionBtn, background: deleteConfirmText === "DELETE" ? '#e74c3c' : '#ccc', flex:1, fontSize:'14px'}}>{isDeleting ? "Deleting..." : "Confirm Permanent Delete"}</button>
                    <button onClick={() => setIsDeleteModalOpen(false)} style={{...actionBtn, background:'#7f8c8d', flex:1, fontSize:'14px'}}>Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', boxSizing:'border-box' }}>
          <div style={{ background:'white', width:'100%', maxWidth:'600px', borderRadius:'15px', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ background:'#1a4a8e', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{margin:0, fontSize:'16px'}}>📊 CSV Data Preview</h3>
              <button onClick={() => setShowPreview(false)} style={{ background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:'15px', overflowX:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead>
                  <tr style={{ background:'#f0f2f5' }}>{previewHeaders.map(h => <th key={h} style={{ padding:'10px', border:'1px solid #ddd', textAlign:'left', textTransform:'capitalize' }}>{h.replace('_',' ')}</th>)}</tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>{previewHeaders.map(h => <td key={h} style={{ padding:'8px', border:'1px solid #ddd' }}>{row[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'15px', borderTop:'1px solid #ddd', display:'flex', gap:'10px' }}>
              <button onClick={() => downloadCSV(previewData, previewHeaders, previewFileName)} style={{ ...actionBtn, flex:1, background:'#2ecc71' }}>Confirm Download CSV</button>
              <button onClick={() => setShowPreview(false)} style={{ ...actionBtn, flex:1, background:'#e74c3c' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showNotifPanel && (
        <div style={{ position: 'fixed', top: '70px', right: '15px', width: '280px', maxHeight: '400px', backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px', background: '#1a4a8e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Notifications</span>
            <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }}>Clear All</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', padding: '20px' }}>No new notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid #eee', position: 'relative', borderLeft: `4px solid ${n.type === 'success' ? '#2ecc71' : n.type === 'warning' ? '#f39c12' : '#3498db'}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{n.message}</div>
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>{n.time}</div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setShowNotifPanel(false)} style={{ padding: '10px', border: 'none', background: '#f8f9fa', color: '#666', fontSize: '12px', cursor: 'pointer' }}>Close</button>
        </div>
      )}

      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white', position: 'relative' }}>
        <div onClick={() => setShowNotifPanel(!showNotifPanel)} style={{ position: 'absolute', top: '15px', right: '20px', cursor: 'pointer', padding: '5px' }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          {notifications.length > 0 && <span style={{ position: 'absolute', top: '0', right: '0', background: 'red', color: 'white', fontSize: '9px', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{notifications.length}</span>}
        </div>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        {userRole === 'staff' && <div style={{background:'rgba(255,255,255,0.2)', padding:'5px', borderRadius:'8px', fontSize:'12px', marginTop:'5px'}}>Teacher: {staffName}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => { clearInputs(); setView('add'); }} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => { setClassFilter('All'); setSearchQuery(''); setView('sel_view'); }} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => { setClassFilter('All'); setSearchQuery(''); setView('sel_att'); }} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => { const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()}))); setView('staff_list'); }} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={async () => { const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp","desc"))); setHistory(h.docs.map(d=>({id:d.id, ...d.data()}))); setView('history'); }} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          {userRole === 'admin' && <button onClick={async () => { 
            const sRec = await getDocs(collection(db, "staff_records"));
            setStaffRecords(sRec.docs.map(d => ({id: d.id, ...d.data()})));
            const t = await getDocs(query(collection(db, "teacher_attendance"), orderBy("timestamp","desc"))); 
            setTeacherAttendanceList(t.docs.map(d=>({id:d.id, ...d.data()}))); 
            const l = await getDocs(query(collection(db, "teacher_leaves"), orderBy("appliedAt", "desc")));
            setAllLeaves(l.docs.map(d=>({id:d.id, ...d.data()})));
            setView('teacher_attendance_view'); 
          }} style={getNavStyle('teacher_attendance_view')}>📍 Teacher Att</button>}
          <button onClick={() => { setIsLoggedIn(false); setNotifications([]); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {/* Fix 2, 3, 5: Dynamic Dashboard Logic */}
        {userRole === 'staff' && view === 'dashboard' && (
          <div>
            <div style={{ ...cardStyle, background: '#1a4a8e', color: 'white', borderLeft: '6px solid #f39c12' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>📅 Today Summary</h4>
                <small style={{ opacity: 0.8 }}>{today}</small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px' }}>
                  <small style={{ fontSize: '10px', display: 'block' }}>Today's Classes</small>
                  <b>{teacherSummary.todayClasses}</b>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px' }}>
                  <small style={{ fontSize: '10px', display: 'block' }}>Attendance</small>
                  <b>{teacherSummary.attendanceMarked ? "✅ Marked" : "❌ Pending"}</b>
                </div>
              </div>
            </div>

            {/* Fix 3: Dynamic Reminder Card */}
            <div style={{ ...cardStyle, borderLeft: teacherSummary.attendanceMarked ? '6px solid #2ecc71' : '6px solid #e74c3c' }}>
              <h4 style={{ marginTop: 0, fontSize: '14px' }}>{teacherSummary.attendanceMarked ? "✅ All caught up!" : "⚠️ Pending Tasks"}</h4>
              {!teacherSummary.attendanceMarked && <div style={{ fontSize: '12px', color: '#e74c3c' }}>• Please mark your attendance for today.</div>}
              {teacherSummary.pendingLeaves > 0 && <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '5px' }}>• You have {teacherSummary.pendingLeaves} leave request(s) awaiting approval.</div>}
            </div>

            {/* Fix 5: Dynamic Motivational Line */}
            <div style={{ ...cardStyle, borderLeft: '6px solid #9b59b6', fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
              "{dailyQuote}"
            </div>

            {/* Fix 4: School Calendar Section */}
            <div style={{ ...cardStyle, borderLeft: '6px solid #3498db' }}>
              <h4 style={{ marginTop: 0, fontSize: '14px' }}>🗓️ School Calendar</h4>
              {calendarEvents.length > 0 ? calendarEvents.map(e => (
                <div key={e.id} style={{ fontSize: '11px', background: '#f8f9fa', padding: '6px', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid #3498db' }}>
                  <strong>{e.date}:</strong> {e.title}
                </div>
              )) : <p style={{fontSize: '11px', color: '#999'}}>No upcoming events.</p>}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <MiniCalendar />
            </div>
          </div>
        )}

        {/* ... Rest of existing views (add, view, history, etc.) ... */}
        {/* NOTE: Ensure handleTeacherAttendance and student marking logic uses setDoc with deterministic IDs like below */}
        
        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center', margin:'0 0 5px 0'}}>{filterClass} - {today}</h3>
            {getFilteredRecords().map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><div style={{fontWeight:'bold'}}>{r.student_name}</div><div style={{fontSize:'11px', color:'#666'}}>Roll: {r.roll_number}</div></div>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})} style={{background:attendance[r.id]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})} style={{background:attendance[r.id]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              try {
                // Fix 1: Unique doc ID for student attendance records
                const docId = `${today}_${filterClass.replace(/\s+/g, '_')}_${filterSection}`;
                const attendancePayload = { class: filterClass, section_filter: filterSection, date: today, attendance_data: attendance, timestamp: serverTimestamp() };
                
                await setDoc(doc(db, "daily_attendance", docId), attendancePayload, { merge: true });
                
                addNotification(`Attendance submitted for ${filterClass}`, "success");
                alert("Attendance Saved!"); setView('dashboard'); setAttendance({});
              } catch (e) { alert("Error saving attendance"); }
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {/* Dynamic Teacher Mark Button (Quick Action) */}
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'#e8f0fe', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'10px', border:'1px dashed #1a4a8e' }}>
            <button onClick={handleTeacherAttendance} style={{ width:'100%', padding:'12px', background: teacherSummary.attendanceMarked ? '#ccc' : '#28a745', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }} disabled={teacherSummary.attendanceMarked}>
              {teacherSummary.attendanceMarked ? "📍 Attendance Marked" : "📍 Mark My Attendance"}
            </button>
            <p style={{fontSize:'10px', color:'#666', marginTop:'5px'}}>Range: 500m | Status: {status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'14px' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer', fontSize:'16px' };

export default App;
