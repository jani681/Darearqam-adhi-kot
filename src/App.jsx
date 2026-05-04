import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc, writeBatch, onSnapshot, setDoc, getDoc, deleteField } from "firebase/firestore"; 
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
  const [schoolLogo, setSchoolLogo] = useState("https://via.placeholder.com/150");
  const [logoInput, setLogoInput] = useState("");
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
  const [dailyQuote, setDailyQuote] = useState('');
  const [teacherSummary, setTeacherSummary] = useState({ todayClasses: 0, attendanceMarked: false, pendingLeaves: 0 });
  const [systemMessages, setSystemMessages] = useState([]);
  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0, totalStaff: 0, todayStudentAttendance: 0, todayTeacherAttendance: 0, pendingLeaves: 0
  });
  const [adminNoticeTitle, setAdminNoticeTitle] = useState('');
  const [adminNoticeMessage, setAdminNoticeMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, "settings", "school");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logoUrl) {
          setSchoolLogo(docSnap.data().logoUrl);
          setLogoInput(docSnap.data().logoUrl);
        }
      } catch (error) { console.error("Error fetching logo:", error); }
    };
    fetchLogo();
  }, []);

  const handleSaveLogo = async () => {
    if (!logoInput) return alert("Please enter a valid URL");
    try {
      await setDoc(doc(db, "settings", "school"), { logoUrl: logoInput }, { merge: true });
      setSchoolLogo(logoInput);
      addNotification("School logo updated successfully", "success");
      alert("Logo Updated!");
    } catch (e) { alert("Failed to save logo"); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const noticesArr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSystemMessages(noticesArr);
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const dayOfMonth = new Date().getDate();
    const quoteIndex = dayOfMonth % MOTIVATIONS.length;
    setDailyQuote(MOTIVATIONS[quoteIndex]);
  }, [today]);

  const addNotification = (msg, type = 'success') => {
    const newNotif = { id: Date.now(), message: msg, type: type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  const handleCreateNotice = async () => {
    if (!adminNoticeTitle || !adminNoticeMessage) return alert("Please enter notice title and message");
    try {
      await addDoc(collection(db, "notices"), { title: adminNoticeTitle, text: adminNoticeMessage, createdAt: serverTimestamp(), createdBy: "admin" });
      addNotification("System notice published", "success");
      setAdminNoticeTitle('');
      setAdminNoticeMessage('');
    } catch (e) { alert("Failed to publish notice"); }
  };

  // ✅ NEW FUNCTION TO CLEAR ALL ANNOUNCEMENTS
  const handleClearAllNotices = async () => {
    if (!window.confirm("Are you sure you want to delete ALL announcements? This cannot be undone.")) return;
    try {
      const q = query(collection(db, "notices"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(doc(db, "notices", d.id));
      });
      await batch.commit();
      addNotification("All announcements cleared", "warning");
      alert("All notices have been deleted.");
    } catch (e) {
      alert("Failed to clear notices: " + e.message);
    }
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
    } catch (e) { addNotification("Backup failed!", "warning"); }
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.students || !data.staff || !data.attendance) throw new Error("Invalid backup file format");
        if (window.confirm(`Found ${data.students.length} students and ${data.staff.length} staff records. Continue?`)) {
          addNotification("Restoring data...", "info");
          for (const student of data.students) await addDoc(collection(db, "ali_campus_records"), student);
          for (const s of data.staff) await addDoc(collection(db, "staff_records"), s);
          for (const att of data.attendance) await addDoc(collection(db, "daily_attendance"), att);
          if (data.teacher_attendance) for (const tAtt of data.teacher_attendance) await addDoc(collection(db, "teacher_attendance"), tAtt);
          addNotification("Data restored successfully", "success");
          fetchStats();
        }
      } catch (err) { alert("Restore failed: " + err.message); }
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
      const data = snap.docs.map(d => ({ student_name: d.data().student_name, roll_number: d.data().roll_number, class: d.data().class, section: d.data().section || 'General', base_fee: d.data().base_fee, arrears: d.data().arrears }));
      setPreviewData(data); setPreviewHeaders(["student_name", "roll_number", "class", "section", "base_fee", "arrears"]); setPreviewFileName("All_Students_Data"); setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const handleExportStaff = async () => {
    try {
      const snap = await getDocs(collection(db, "staff_records"));
      const data = snap.docs.map(d => ({ name: d.data().name, role: d.data().role, salary: d.data().salary, password: d.data().password }));
      setPreviewData(data); setPreviewHeaders(["name", "role", "salary", "password"]); setPreviewFileName("Staff_Records"); setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const handleExportTodayAttendance = async () => {
    try {
      const q = query(collection(db, "daily_attendance"), where("date", "==", today));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ class: d.data().class, date: d.data().date, total_marked: Object.keys(d.data().attendance_data || {}).length }));
      setPreviewData(data); setPreviewHeaders(["class", "date", "total_marked"]); setPreviewFileName(`Attendance_${today}`); setShowPreview(true);
    } catch (e) { alert("Export failed"); }
  };

  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.setFillColor(26, 74, 142); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: 'center' });
    doc.setFontSize(12); doc.text(title, 105, 25, { align: 'center' });
    doc.autoTable({ head: [headers], body: bodyData, startY: 40, headStyles: { fillColor: [26, 74, 142], textColor: [255, 255, 255], fontStyle: 'bold' }, styles: { fontSize: 10, cellPadding: 3 }, alternateRowStyles: { fillColor: [240, 240, 240] }, margin: { top: 40 } });
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(100); doc.text(`Generated on: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 14, 285); }
    doc.save(`${fileName}.pdf`);
    addNotification(`Generated PDF: ${fileName}`, 'info');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; const dLat = (lat2-lat1) * Math.PI/180; const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = async () => {
    if (!navigator.geolocation) return alert("Location not supported");
    try {
      setStatus('Checking records...');
      const qCheck = query(collection(db, "teacher_attendance"), where("name", "==", staffName), where("date", "==", today));
      const checkSnap = await getDocs(qCheck);
      if (!checkSnap.empty) { alert("You have already marked attendance today"); setStatus('Already Marked'); return; }
      setStatus('Verifying Location...');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
        if (dist <= 500) {
          await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp(), distance: Math.round(dist) + "m" });
          alert("Attendance Marked!"); setStatus('Done'); fetchStats(); addNotification("Attendance marked successfully", "success");
        } else { alert(`Too far! ${Math.round(dist)}m.`); setStatus('Out of Range'); }
      }, () => alert("Enable Location Access!"));
    } catch (e) { setStatus('Error'); }
  };

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); addNotification("Logged in as Admin", "info"); return; }
    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);
      if (!snap.empty) { 
        const teacherData = snap.docs[0].data();
        setStaffName(teacherData.name); setMyProfileData({...teacherData, id: snap.docs[0].id}); setUserRole('staff'); setIsLoggedIn(true); addNotification(`Welcome back, ${teacherData.name}`, "info");
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
        todayStudAtt.docs.forEach(doc => { const data = doc.data().attendance_data; if (data) studentAttendanceCount += Object.values(data).filter(v => v === 'P').length; });
        setAdminAnalytics({ totalStudents: snap.size, totalStaff: staffSnap.size, todayStudentAttendance: studentAttendanceCount, todayTeacherAttendance: todayTeachAtt.size, pendingLeaves: pendingLeavesSnap.size });
      } catch (err) { console.error(err); }
    }
    if (userRole === 'staff') {
      const studentAttSnap = await getDocs(query(collection(db, "daily_attendance"), where("date", "==", today)));
      const myAtt = await getDocs(query(collection(db, "teacher_attendance"), where("name", "==", staffName), where("date", "==", today)));
      const myPendingLeaves = await getDocs(query(collection(db, "teacher_leaves"), where("name", "==", staffName), where("status", "==", "pending")));
      const allMyAtt = await getDocs(query(collection(db, "teacher_attendance"), where("name", "==", staffName)));
      setMyAttendanceRecords(allMyAtt.docs.map(d => d.data()));
      setTeacherSummary({ todayClasses: studentAttSnap.size, attendanceMarked: !myAtt.empty, pendingLeaves: myPendingLeaves.size });
    }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const clearInputs = () => { setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setSelectedSection(''); setEditingStudent(null); };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px', backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });

  const confirmFinalDelete = async () => {
    if (userRole !== 'admin' || deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "daily_attendance", recordToDelete.id));
      setHistory(prev => prev.filter(h => h.id !== recordToDelete.id));
      addNotification("Record deleted permanently.", "warning");
      setIsDeleteModalOpen(false); setRecordToDelete(null);
    } catch (e) { alert(e.message); } finally { setIsDeleting(false); }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) return alert("All fields required");
    if (newPassword !== confirmNewPassword) return alert("Passwords mismatch");
    setIsChangingPass(true);
    try {
      const q = query(collection(db, "staff_records"), where("name", "==", staffName), where("password", "==", currentPassword));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Current password incorrect");
      await updateDoc(doc(db, "staff_records", snap.docs[0].id), { password: newPassword });
      addNotification("Password updated", "success"); setView('dashboard');
    } catch (err) { alert(err.message); } finally { setIsChangingPass(false); }
  };

  const MiniCalendar = ({ events = [] }) => {
    const now = new Date(); const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const attendedDays = events.filter(r => r.date && r.date.startsWith(currentMonthStr)).map(r => parseInt(r.date.split('-')[2], 10));
    return (
      <div style={{ background: '#fff', borderRadius: '15px', padding: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#1a4a8e', textAlign: 'center' }}>{now.toLocaleString('default', { month: 'long' })} {now.getFullYear()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {[...Array(daysInMonth)].map((_, i) => (
            <div key={i} style={{ fontSize: '10px', padding: '4px', textAlign: 'center', borderRadius: '4px', backgroundColor: (i+1) === now.getDate() ? '#f39c12' : (attendedDays.includes(i+1) ? '#2ecc71' : '#f0f2f5'), color: (i+1) === now.getDate() || attendedDays.includes(i+1) ? '#fff' : '#333' }}>{i+1}</div>
          ))}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src={schoolLogo} alt="Logo" style={{ height: '60px', width: 'auto', borderRadius: '50%', background:'white', padding:'5px', marginBottom: '10px', objectFit: 'contain' }} />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
      <div style={{ fontSize: "12px", color: "#888", textAlign: "center", marginTop: "10px" }}>Developed by : Touqeer Iqbal Baghoor</div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {isDeleteModalOpen && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <div style={{ background:'white', width:'100%', maxWidth:'400px', borderRadius:'15px', padding:'20px', textAlign:'center' }}>
                <h3 style={{color:'#e74c3c'}}>⚠️ Critical Warning</h3>
                <p>Are you sure? This cannot be undone.</p>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" style={{...inputStyle, textAlign:'center'}} />
                <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <button disabled={deleteConfirmText !== "DELETE"} onClick={confirmFinalDelete} style={{...actionBtn, background:'#e74c3c', flex:1}}>Confirm</button>
                    <button onClick={() => setIsDeleteModalOpen(false)} style={{...actionBtn, background:'#7f8c8d', flex:1}}>Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'white', width:'100%', maxWidth:'600px', borderRadius:'15px', maxHeight:'90vh', overflow:'hidden' }}>
            <div style={{ background:'#1a4a8e', color:'white', padding:'15px' }}><h3>📊 CSV Data Preview</h3></div>
            <div style={{ padding:'15px', overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead><tr style={{ background:'#f0f2f5' }}>{previewHeaders.map(h => <th key={h} style={{ padding:'10px', border:'1px solid #ddd' }}>{h}</th>)}</tr></thead>
                <tbody>{previewData.slice(0, 50).map((row, idx) => (<tr key={idx}>{previewHeaders.map(h => <td key={h} style={{ padding:'8px', border:'1px solid #ddd' }}>{row[h]}</td>)}</tr>))}</tbody>
              </table>
            </div>
            <div style={{ padding:'15px', display:'flex', gap:'10px' }}>
              <button onClick={() => downloadCSV(previewData, previewHeaders, previewFileName)} style={{ ...actionBtn, flex:1, background:'#2ecc71' }}>Download</button>
              <button onClick={() => setShowPreview(false)} style={{ ...actionBtn, flex:1, background:'#e74c3c' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src={schoolLogo} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => { clearInputs(); setView('add'); }} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => { setClassFilter('All'); setSearchQuery(''); setView('sel_view'); }} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => { setClassFilter('All'); setSearchQuery(''); setView('sel_att'); }} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => { const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()}))); setView('staff_list'); }} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={async () => { const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp","desc"))); setHistory(h.docs.map(d=>({id:d.id, ...d.data()}))); setView('history'); }} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          {userRole === 'admin' && <button onClick={async () => { 
            const sRec = await getDocs(collection(db, "staff_records")); setStaffRecords(sRec.docs.map(d => ({id: d.id, ...d.data()})));
            const t = await getDocs(query(collection(db, "teacher_attendance"), orderBy("timestamp","desc"))); setTeacherAttendanceList(t.docs.map(d=>({id:d.id, ...d.data()}))); 
            const l = await getDocs(query(collection(db, "teacher_leaves"), orderBy("appliedAt", "desc"))); setAllLeaves(l.docs.map(d=>({id:d.id, ...d.data()}))); setView('teacher_attendance_view'); 
          }} style={getNavStyle('teacher_attendance_view')}>📍 Teach</button>}
          <button onClick={() => setView('security')} style={getNavStyle('security')}>🔒 Pass</button>
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        {view === 'dashboard' && userRole === 'admin' && (
          <>
            <div style={{...cardStyle, background: '#1a4a8e', color: 'white'}}>
              <h4 style={{marginTop: 0}}>📊 Admin Panel</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small>Students</small><br/><b>{adminAnalytics.totalStudents}</b></div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small>Staff</small><br/><b>{adminAnalytics.totalStaff}</b></div>
              </div>
              <div style={{marginTop: '15px'}}>
                <small>Update Logo URL</small>
                <input value={logoInput} onChange={(e) => setLogoInput(e.target.value)} style={{ ...inputStyle, padding: '8px', fontSize: '12px' }} />
                <button onClick={handleSaveLogo} style={{ ...actionBtn, padding: '8px', background: '#f39c12' }}>Save Logo</button>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{marginTop:0}}>📢 Broadcast Notice</h4>
              <input placeholder="Notice Title" value={adminNoticeTitle} onChange={(e)=>setAdminNoticeTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Message for teachers..." value={adminNoticeMessage} onChange={(e)=>setAdminNoticeMessage(e.target.value)} style={{...inputStyle, height: '60px'}} />
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handleCreateNotice} style={{...actionBtn, padding:'10px', flex: 2}}>Publish</button>
                <button onClick={handleClearAllNotices} style={{...actionBtn, padding:'10px', background: '#e74c3c', flex: 1}}>Clear All</button>
              </div>
            </div>

            <div style={{...cardStyle, borderLeft: '6px solid #9b59b6'}}>
              <h4>🛡️ Database Control</h4>
              <button onClick={handleDownloadBackup} style={{...actionBtn, padding:'10px', background:'#9b59b6', marginBottom:'8px'}}>Download Backup</button>
              <input type="file" accept=".json" onChange={handleRestoreBackup} style={{display: 'none'}} ref={fileInputRef} />
              <button onClick={() => fileInputRef.current.click()} style={{...actionBtn, padding:'10px', background:'#34495e'}}>Restore Backup</button>
            </div>
          </>
        )}

        {view === 'dashboard' && userRole === 'staff' && (
          <div>
            <div style={{ ...cardStyle, background: '#1a4a8e', color: 'white' }}>
              <h4>📅 Teacher Summary</h4>
              <p>Attendance: {teacherSummary.attendanceMarked ? "✅ Marked" : "❌ Pending"}</p>
            </div>
            <div style={cardStyle}>
              <h4>📢 Notices</h4>
              {systemMessages.length === 0 ? <p style={{fontSize:'12px'}}>No active notices</p> : systemMessages.map(m => (
                <div key={m.id} style={{ fontSize: '11px', background: '#f8f9fa', padding: '8px', borderRadius: '6px', marginBottom: '5px', borderLeft:'4px solid #1a4a8e', color:'#333' }}>
                  <strong>{m.title}</strong>: {m.text}
                </div>
              ))}
            </div>
            <div style={{...cardStyle, fontStyle:'italic', textAlign:'center'}}>"{dailyQuote}"</div>
            <button onClick={handleTeacherAttendance} style={{...actionBtn, background:'#28a745', marginBottom:'10px'}}>📍 Mark My Attendance</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            {CLASSES.map(c => (
              <div key={c} onClick={async () => {
                setFilterClass(c); const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                const snap = await getDocs(q); setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setView(userRole === 'admin' ? 'view' : 'attendance');
              }} style={{ background: 'white', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #f39c12', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <small style={{ fontWeight: 'bold' }}>{c}</small><b>{classStats[c] || 0}</b>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Edit Student" : "New Admission"}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              alert("Saved!"); setView('dashboard'); clearInputs(); fetchStats();
            }} style={actionBtn}>Save</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <div style={cardStyle}>
              <input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} />
            </div>
            {getFilteredRecords().map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> ({r.roll_number})
                <div style={{marginTop:'10px'}}>
                  <button onClick={()=>{setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setView('add');}} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px', marginRight:'5px'}}>Edit</button>
                  <button onClick={async ()=>{if(window.confirm("Delete?")){await deleteDoc(doc(db,"ali_campus_records",r.id)); setView('dashboard'); fetchStats();}}} style={{background:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div>
            <h3>{filterClass} - {today}</h3>
            {getFilteredRecords().map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <b>{r.student_name}</b>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})} style={{background:attendance[r.id]==='P'?'#2ecc71':'#ccc', border:'none', padding:'5px 10px', borderRadius:'5px', color:'white'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})} style={{background:attendance[r.id]==='A'?'#e74c3c':'#ccc', border:'none', padding:'5px 10px', borderRadius:'5px', color:'white', marginLeft:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() });
              alert("Attendance Saved!"); setView('dashboard'); setAttendance({});
            }} style={actionBtn}>Submit</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            <h3>History</h3>
            {history.map(h => <div key={h.id} style={cardStyle}>{h.date} - {h.class}</div>)}
          </div>
        )}

        {view === 'security' && (
          <div style={cardStyle}>
            <h3>Change Password</h3>
            <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} style={inputStyle} />
            <button onClick={handleUpdatePassword} style={actionBtn}>Update</button>
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/><input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{await addDoc(collection(db, "staff_records"), {name:sName, role:'Teacher', password:sPass}); setSName(''); setSPass(''); fetchStats();}} style={actionBtn}>Add</button>
            </div>
            {staffRecords.map(s => <div key={s.id} style={cardStyle}><b>{s.name}</b> (PWD: {s.password})</div>)}
          </div>
        )}

      </div>
      <footer style={{ fontSize: "10px", textAlign: "center", padding: "10px" }}>Developed by Touqeer Iqbal Baghoor</footer>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:'10px', borderLeft:'5px solid #f39c12' };
const inputStyle = { width:'100%', padding:'10px', margin:'5px 0', borderRadius:'8px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'12px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' };

export default App;
