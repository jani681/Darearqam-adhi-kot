import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc, writeBatch, onSnapshot, setDoc, getDoc } from "firebase/firestore"; 
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
  // Logo Logic Implementation
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
    totalStudents: 0,
    totalStaff: 0,
    todayStudentAttendance: 0,
    todayTeacherAttendance: 0,
    pendingLeaves: 0
  });

  const [adminNoticeTitle, setAdminNoticeTitle] = useState('');
  const [adminNoticeMessage, setAdminNoticeMessage] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [tickerText, setTickerText] = useState("");
  const [tickerActive, setTickerActive] = useState(false);
  const [adminTickerInput, setAdminTickerInput] = useState("");

  const [schoolStartTime, setSchoolStartTime] = useState(localStorage.getItem('schoolStartTime') || "08:00");
  const [schoolEndTime, setSchoolEndTime] = useState(localStorage.getItem('schoolEndTime') || "14:00");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Task Specific State
  const [isMyDayModalOpen, setIsMyDayModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveTiming = () => {
    localStorage.setItem('schoolStartTime', schoolStartTime);
    localStorage.setItem('schoolEndTime', schoolEndTime);
    addNotification("School timing updated in local storage", "success");
    alert("Timing Saved Locally!");
  };

  const getSchoolStatus = () => {
    const now = new Date();
    const [startH, startM] = schoolStartTime.split(':');
    const [endH, endM] = schoolEndTime.split(':');
    const start = new Date().setHours(startH, startM, 0);
    const end = new Date().setHours(endH, endM, 0);
    
    if (now < start) return { status: "Closed (Starts Soon)", color: "#f39c12" };
    if (now > end) return { status: "Closed (Finished)", color: "#e74c3c" };
    return { status: "School is Open", color: "#2ecc71" };
  };

  const getCountdown = () => {
    const now = new Date();
    const [endH, endM] = schoolEndTime.split(':');
    const end = new Date().setHours(endH, endM, 0);
    const diff = end - now;
    if (diff <= 0) return "00:00:00";
    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "school");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logoUrl) {
          setSchoolLogo(docSnap.data().logoUrl);
          setLogoInput(docSnap.data().logoUrl);
        }

        const tickerRef = doc(db, "settings", "notice");
        const tickerSnap = await getDoc(tickerRef);
        if (tickerSnap.exists()) {
          const data = tickerSnap.data();
          setTickerText(data.text || "");
          setTickerActive(data.active || false);
          setAdminTickerInput(data.text || "");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();

    const unsubTicker = onSnapshot(doc(db, "settings", "notice"), (doc) => {
      if (doc.exists()) {
        setTickerText(doc.data().text || "");
        setTickerActive(doc.data().active || false);
      }
    });

    return () => unsubTicker();
  }, []);

  const handleUpdateNotice = async (statusOverride = null) => {
    try {
      const finalActive = statusOverride !== null ? statusOverride : tickerActive;
      await setDoc(doc(db, "settings", "notice"), {
        text: adminTickerInput,
        active: finalActive
      });
      setTickerActive(finalActive);
      setTickerText(adminTickerInput);
      addNotification("Active notice updated", "success");
      alert("Notice Updated!");
    } catch (e) {
      alert("Failed to update notice");
    }
  };

  const handleClearNotice = async () => {
    setAdminTickerInput("");
    try {
      await setDoc(doc(db, "settings", "notice"), {
        text: "",
        active: false
      });
      setTickerText("");
      setTickerActive(false);
      alert("Notice Cleared!");
    } catch (e) {
      alert("Failed to clear notice");
    }
  };

  const handleSaveLogo = async () => {
    if (!logoInput) return alert("Please enter a valid URL");
    try {
      await setDoc(doc(db, "settings", "school"), { logoUrl: logoInput }, { merge: true });
      setSchoolLogo(logoInput);
      addNotification("School logo updated successfully", "success");
      alert("Logo Updated!");
    } catch (e) {
      alert("Failed to save logo");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const noticesArr = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
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
    const newNotif = {
      id: Date.now(),
      message: msg,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  const handleCreateNotice = async () => {
    if (!adminNoticeTitle || !adminNoticeMessage) return alert("Please enter notice title and message");
    try {
      await addDoc(collection(db, "notices"), {
        title: adminNoticeTitle,
        text: adminNoticeMessage, 
        createdAt: serverTimestamp(),
        createdBy: "admin"
      });
      addNotification("System notice published", "success");
      setAdminNoticeTitle('');
      setAdminNoticeMessage('');
    } catch (e) {
      alert("Failed to publish notice");
    }
  };

  const handleClearAllNotices = async () => {
    if (!window.confirm("Are you sure you want to delete ALL broadcast notices? This action cannot be undone.")) return;
    try {
      const snapshot = await getDocs(collection(db, "notices"));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      addNotification("All broadcast notices cleared", "warning");
      alert("All notices have been deleted successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to clear notices");
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
      csvRows.push(values.join(','));
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

  // --- NEW FEATURE: Generate Fee Slip ---
  const generateFeeSlip = (student) => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header Box
    doc.setDrawColor(26, 74, 142);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 50);
    
    doc.setFontSize(22);
    doc.setTextColor(26, 74, 142);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("STUDENT FEE SLIP", 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });

    // Details Grid
    const details = [
      ["Student Name:", student.student_name.toUpperCase()],
      ["Roll Number:", student.roll_number],
      ["Class:", `${student.class} ${student.section ? '- ' + student.section : ''}`],
      ["Billing Month:", new Date().toLocaleString('default', { month: 'long', year: 'numeric' })],
      ["Status:", student.arrears > 0 ? "Pending" : "Paid"],
      ["Monthly Fee:", `Rs. ${student.base_fee}`],
      ["Previous Arrears:", `Rs. ${student.arrears || 0}`],
      ["Total Payable:", `Rs. ${Number(student.base_fee) + Number(student.arrears || 0)}`]
    ];

    doc.autoTable({
      startY: 70,
      body: details,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.line(20, finalY, 80, finalY);
    doc.text("Principal Signature", 30, finalY + 5);
    
    doc.line(130, finalY, 190, finalY);
    doc.text("Parent Signature", 145, finalY + 5);

    doc.save(`FeeSlip_${student.roll_number}_${student.student_name}.pdf`);
    addNotification(`Fee slip generated for ${student.student_name}`, 'success');
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
      setStatus('Checking records...');
      const qCheck = query(collection(db, "teacher_attendance"), where("name", "==", staffName), where("date", "==", today));
      const checkSnap = await getDocs(qCheck);
      if (!checkSnap.empty) {
        alert("You have already marked attendance today");
        addNotification("Attendance already exists for today", "warning");
        setStatus('Already Marked');
        return;
      }
      setStatus('Verifying Location...');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
        if (dist <= 500) {
          await addDoc(collection(db, "teacher_attendance"), { 
            name: staffName, 
            date: today, 
            time: new Date().toLocaleTimeString(), 
            timestamp: serverTimestamp(), 
            distance: Math.round(dist) + "m" 
          });
          alert("Attendance Marked!"); 
          setStatus('Done');
          fetchStats();
          addNotification("Attendance marked successfully", "success");
        } else { 
          alert(`Too far! ${Math.round(dist)}m.`); 
          setStatus('Out of Range');
          addNotification(`Failed: Out of range (${Math.round(dist)}m)`, "warning");
        }
      }, () => alert("Enable Location Access!"));
    } catch (e) {
      console.error(e);
      alert("Error checking attendance");
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
        setMyProfileData({...teacherData, id: snap.docs[0].id}); 
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
      const studentAttSnap = await getDocs(query(collection(db, "daily_attendance"), where("date", "==", today)));
      const todayClasses = studentAttSnap.size;
      const myAtt = await getDocs(query(collection(db, "teacher_attendance"), where("name", "==", staffName), where("date", "==", today)));
      const myPendingLeaves = await getDocs(query(collection(db, "teacher_leaves"), where("name", "==", staffName), where("status", "==", "pending")));
      
      const allMyAtt = await getDocs(query(collection(db, "teacher_attendance"), where("name", "==", staffName)));
      setMyAttendanceRecords(allMyAtt.docs.map(d => d.data()));

      setTeacherSummary({
        todayClasses: todayClasses,
        attendanceMarked: !myAtt.empty,
        pendingLeaves: myPendingLeaves.size
      });
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

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return alert("All fields are required");
    }
    if (newPassword !== confirmNewPassword) {
      return alert("New passwords do not match");
    }

    setIsChangingPass(true);
    try {
      if (userRole === 'admin') {
        if (currentPassword !== ADMIN_PASSWORD) {
          throw new Error("Current admin password incorrect");
        }
        alert("CRITICAL: Manual environment update required for ADMIN_PASSWORD variable in code. Feature is restricted for hardcoded admin credentials.");
      } else {
        const q = query(collection(db, "staff_records"), where("name", "==", staffName), where("password", "==", currentPassword));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          throw new Error("Current password verification failed");
        }

        const staffDocId = snap.docs[0].id;
        await updateDoc(doc(db, "staff_records", staffDocId), {
          password: newPassword
        });
        
        addNotification("Password updated successfully", "success");
        alert("Password updated successfully!");
        setView('dashboard');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      alert(err.message);
      addNotification("Password update failed", "warning");
    } finally {
      setIsChangingPass(false);
    }
  };

  const tickerContainerStyle = {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    position: 'relative',
    background: '#fff9c4', 
    padding: '10px 0',
    marginBottom: '10px',
    borderRadius: '10px',
    border: '1px solid #ffe082',
    display: 'flex',
    alignItems: 'center'
  };

  const tickerTextStyle = {
    display: 'inline-block',
    paddingLeft: '100%',
    animation: 'scrollText 20s linear infinite',
    color: '#d35400',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const tickerKeyframes = `
    @keyframes scrollText {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }
  `;

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img 
        src={schoolLogo} 
        alt="School Logo" 
        onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=Logo"; }}
        style={{ 
          height: '60px', 
          width: 'auto',
          borderRadius: '50%', 
          background:'white', 
          padding:'5px',
          marginBottom: '10px',
          objectFit: 'contain'
        }} 
      />
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
      <div style={{ fontSize: "12px", color: "#888", textAlign: "center", marginTop: "10px" }}>Developed by : Touqeer Iqbal Baghoor<br/>Contact: 923015800630</div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{tickerKeyframes}</style>
      
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

      {isMyDayModalOpen && (
        <div 
          onClick={() => setIsMyDayModalOpen(false)}
          style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background:'white', width:'100%', maxWidth:'450px', borderRadius:'15px', padding:'20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1a4a8e' }}>📅 My Day</h3>
              <button onClick={() => setIsMyDayModalOpen(false)} style={{ background: '#eee', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#f39c12', marginBottom: '5px' }}>Daily Focus</h4>
              <div style={{ height: '40px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}></div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#1a4a8e', marginBottom: '5px' }}>Teacher Plan</h4>
              <div style={{ height: '60px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}></div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#666', marginBottom: '5px' }}>Notes</h4>
              <div style={{ height: '80px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}></div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ color: '#e74c3c', marginBottom: '5px' }}>Reminders</h4>
              <div style={{ height: '40px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}></div>
            </div>

            <button onClick={() => setIsMyDayModalOpen(false)} style={{ ...actionBtn, marginTop: '10px' }}>Close Window</button>
          </div>
        </div>
      )}

      {showPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', boxSizing:'border-box' }}>
          <div style={{ background:'white', width:'100%', maxWidth:'600px', borderRadius:'15px', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ background:'#1a4a8e', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{margin:0, fontSize:'16px'}}>📊 CSV Data Preview</h3>
              <button onClick={() => {setShowPreview(false); setPreviewData([]);}} style={{ background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer' }}>×</button>
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
              {previewData.length > 50 && <p style={{ textAlign:'center', fontSize:'11px', color:'#666', marginTop:'10px' }}>Showing first 50 of {previewData.length} records...</p>}
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
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img 
            src={schoolLogo} 
            alt="School Logo" 
            onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=Logo"; }}
            style={{ 
              height: '40px', 
              width: 'auto', 
              objectFit: 'contain'
            }} 
          />
          <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        </div>

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
          {userRole === 'staff' && <button onClick={() => setIsMyDayModalOpen(true)} style={getNavStyle('myday')}>📅 My Day</button>}
          <button onClick={() => setView('security')} style={getNavStyle('security')}>🔒 Security</button>
          <button onClick={() => { setIsLoggedIn(false); setNotifications([]); }} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        {userRole === 'staff' && view === 'dashboard' && tickerActive && tickerText !== "" && (
          <div style={tickerContainerStyle}>
            <span style={{position:'absolute', left:0, background:'#fff9c4', padding:'0 10px', zIndex:5, fontWeight:'bold', fontSize:'12px', color:'#1a4a8e', borderRight:'2px solid #ffe082'}}>📢 NOTICE</span>
            <div style={tickerTextStyle}>
              {tickerText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {tickerText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {tickerText}
            </div>
          </div>
        )}

        {view === 'security' && (
          <div style={cardStyle}>
            <h3 style={{marginTop:0}}>Change Account Password</h3>
            <p style={{fontSize: '12px', color: '#666'}}>Please verify your current password to set a new one.</p>
            
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Current Password</label>
            <input 
              type="password" 
              placeholder="Enter current password" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              style={inputStyle} 
            />
            
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>New Password</label>
            <input 
              type="password" 
              placeholder="Enter new password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              style={inputStyle} 
            />
            
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="Confirm new password" 
              value={confirmNewPassword} 
              onChange={(e) => setConfirmNewPassword(e.target.value)} 
              style={inputStyle} 
            />
            
            <button 
              disabled={isChangingPass}
              onClick={handleUpdatePassword} 
              style={{...actionBtn, background: '#e67e22'}}
            >
              {isChangingPass ? "Processing..." : "Update Password"}
            </button>
            
            <button 
              onClick={() => setView('dashboard')} 
              style={{...actionBtn, background:'#7f8c8d', marginTop:'10px'}}
            >
              Cancel
            </button>
          </div>
        )}

        {userRole === 'staff' && view === 'dashboard' && (
          <div>
            <div style={{ ...cardStyle, background: '#1a4a8e', color: 'white', borderLeft: '6px solid #f39c12' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>⏰ School Time Widget</h4>
                <small style={{ opacity: 0.8 }}>{currentTime.toLocaleDateString()}</small>
              </div>
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getSchoolStatus().color }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{getSchoolStatus().status}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <small style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>Time Left to Closing</small>
                  <b style={{ fontSize: '16px' }}>{getCountdown()}</b>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <small style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>Today's Classes</small>
                  <b style={{ fontSize: '16px' }}>{teacherSummary.todayClasses}</b>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, borderLeft: '6px solid #e74c3c' }}>
              <h4 style={{ marginTop: 0, fontSize: '14px' }}>⚠️ Pending Tasks</h4>
              {!teacherSummary.attendanceMarked && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '5px' }}>• Your attendance is not marked today.</div>}
              {teacherSummary.pendingLeaves > 0 && <div style={{ fontSize: '12px', color: '#f39c12', marginBottom: '5px' }}>• You have {teacherSummary.pendingLeaves} leave request(s) awaiting approval.</div>}
              {teacherSummary.attendanceMarked && teacherSummary.pendingLeaves === 0 && <div style={{ fontSize: '12px', color: '#2ecc71' }}>No urgent tasks pending!</div>}
            </div>

            <div style={{ ...cardStyle, borderLeft: '6px solid #9b59b6', fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
              "{dailyQuote}"
            </div>

            {systemMessages.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '6px solid #3498db' }}>
                <h4 style={{ marginTop: 0, fontSize: '14px' }}>📢 System Notices</h4>
                {systemMessages.map(m => (
                  <div key={m.id} style={{ fontSize: '11px', background: '#f8f9fa', padding: '6px', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid #3498db' }}>
                    <strong>{m.title}</strong>: {m.text}
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...cardStyle, borderLeft: '6px solid #1a4a8e' }}>
              <h4 style={{ marginTop: 0, fontSize: '14px' }}>🚀 Quick Class Switch</h4>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {CLASSES.slice(0, 5).map(c => (
                  <button key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={{ padding: '6px 10px', fontSize: '10px', background: '#e8f0fe', border: '1px solid #1a4a8e', borderRadius: '5px', color: '#1a4a8e', cursor: 'pointer' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {userRole === 'admin' && view === 'dashboard' && (
          <>
            <div style={{...cardStyle, background: '#1a4a8e', color: 'white', borderLeft: '6px solid #f39c12'}}>
              <h4 style={{marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center'}}>📊 Admin Overview Panel</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small style={{display: 'block', opacity: 0.8}}>Total Students</small><b style={{fontSize: '18px'}}>{adminAnalytics.totalStudents}</b></div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small style={{display: 'block', opacity: 0.8}}>Total Staff</small><b style={{fontSize: '18px'}}>{adminAnalytics.totalStaff}</b></div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small style={{display: 'block', opacity: 0.8}}>Today Stud. Present</small><b style={{fontSize: '18px'}}>{adminAnalytics.todayStudentAttendance}</b></div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}><small style={{display: 'block', opacity: 0.8}}>Today Teach. Present</small><b style={{fontSize: '18px'}}>{adminAnalytics.todayTeacherAttendance}</b></div>
              </div>
              
              <div style={{marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px'}}>
                <small style={{display: 'block', opacity: 0.8, marginBottom: '5px'}}>System Logo URL</small>
                <input 
                  placeholder="Enter Logo URL" 
                  value={logoInput} 
                  onChange={(e) => setLogoInput(e.target.value)} 
                  style={{ ...inputStyle, padding: '8px', margin: '0 0 8px 0', fontSize: '12px' }} 
                />
                <button onClick={handleSaveLogo} style={{ ...actionBtn, padding: '8px', fontSize: '12px', background: '#f39c12' }}>Save Logo</button>
              </div>
            </div>

            <div style={{...cardStyle, borderLeft: '6px solid #2ecc71'}}>
              <h4 style={{marginTop:0}}>⚙️ School Timing Control</h4>
              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '10px', fontWeight: 'bold'}}>Start Time</label>
                  <input type="time" value={schoolStartTime} onChange={(e) => setSchoolStartTime(e.target.value)} style={inputStyle} />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize: '10px', fontWeight: 'bold'}}>End Time</label>
                  <input type="time" value={schoolEndTime} onChange={(e) => setSchoolEndTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button onClick={handleSaveTiming} style={{...actionBtn, padding: '10px', background: '#2ecc71', fontSize: '12px', marginTop: '5px'}}>Save Timing to localStorage</button>
            </div>

            <div style={{...cardStyle, borderLeft: '6px solid #ffe082'}}>
              <h4 style={{marginTop:0}}>🔔 Single Active Notice System</h4>
              <textarea 
                placeholder="Enter notice text (max 200 characters)..." 
                maxLength="200"
                value={adminTickerInput} 
                onChange={(e)=>setAdminTickerInput(e.target.value)} 
                style={{...inputStyle, height:'70px', background:'#fff9c4', color:'#1a4a8e', fontWeight:'bold'}} 
              />
              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button onClick={() => handleUpdateNotice(true)} style={{...actionBtn, flex:1, padding:'10px', fontSize:'12px', background:'#2ecc71'}}>Save & Active</button>
                <button onClick={() => handleUpdateNotice(!tickerActive)} style={{...actionBtn, flex:1, padding:'10px', fontSize:'12px', background:'#e67e22'}}>{tickerActive ? "Deactivate" : "Activate"}</button>
                <button onClick={handleClearNotice} style={{...actionBtn, flex:1, padding:'10px', fontSize:'12px', background:'#7f8c8d'}}>Clear Notice</button>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{marginTop:0}}>📢 Broadcast Notice</h4>
              <input placeholder="Notice Title" value={adminNoticeTitle} onChange={(e)=>setAdminNoticeTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Message for all teachers..." value={adminNoticeMessage} onChange={(e)=>setAdminNoticeMessage(e.target.value)} style={{...inputStyle, height: '60px'}} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleCreateNotice} style={{...actionBtn, padding:'10px', fontSize:'12px', flex: 2}}>Publish Notice</button>
                <button onClick={handleClearAllNotices} style={{...actionBtn, padding:'10px', fontSize:'12px', background: '#e74c3c', flex: 1}}>Clear All</button>
              </div>
            </div>

            <div style={{...cardStyle, borderLeft: '6px solid #9b59b6'}}>
              <h4 style={{marginTop:0}}>🛡️ Data Protection</h4>
              <button onClick={handleDownloadBackup} style={{...actionBtn, padding:'10px', fontSize:'12px', marginBottom:'8px', background:'#9b59b6'}}>Download Full Backup (JSON)</button>
              <input type="file" accept=".json" onChange={handleRestoreBackup} style={{display: 'none'}} ref={fileInputRef} />
              <button onClick={() => fileInputRef.current.click()} style={{...actionBtn, padding:'10px', fontSize:'12px', background:'#34495e'}}>Upload Backup & Restore</button>
            </div>
            <div style={cardStyle}>
              <h4 style={{marginTop:0}}>📥 Data Backup (CSV)</h4>
              <button onClick={handleExportStudents} style={{...actionBtn, padding:'10px', fontSize:'12px', marginBottom:'8px'}}>Download Students CSV</button>
              <button onClick={handleExportStaff} style={{...actionBtn, padding:'10px', fontSize:'12px', marginBottom:'8px', background:'#2ecc71'}}>Download Staff CSV</button>
              <button onClick={handleExportTodayAttendance} style={{...actionBtn, padding:'10px', fontSize:'12px', background:'#7f8c8d'}}>Download Today Attendance CSV</button>
            </div>
          </>
        )}

        {view === 'teacher_directory' && (
          <div>
            <div style={{...cardStyle, borderLeft:'6px solid #1a4a8e'}}>
              <h3 style={{marginTop:0}}>📇 Teacher Directory</h3>
              <input placeholder="Search Teacher Name..." value={dirSearch} onChange={(e) => setDirSearch(e.target.value)} style={{...inputStyle, marginBottom:0}} />
            </div>
            {teacherDirectory.filter(t => t.name?.toLowerCase().includes(dirSearch.toLowerCase())).map(t => (
                <div key={t.id} style={cardStyle}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <b style={{fontSize:'18px', color:'#1a4a8e'}}>{t.name}</b>
                      <div style={{color:'#666', fontSize:'14px'}}>{t.role}</div>
                      {t.whatsapp && <div style={{fontSize:'12px', color:'#999', marginTop:'5px'}}>📞 {t.whatsapp}</div>}
                    </div>
                    {t.whatsapp && <a href={`https://wa.me/${t.whatsapp}`} target="_blank" rel="noreferrer" style={{textDecoration:'none', background:'#25D366', color:'white', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><span>🟢</span> Chat</a>}
                  </div>
                </div>
            ))}
            <button onClick={() => setView('dashboard')} style={{...actionBtn, background:'#7f8c8d'}}>Back to Dashboard</button>
          </div>
        )}

        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'#e8f0fe', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'10px', border:'1px dashed #1a4a8e' }}>
            <button onClick={handleTeacherAttendance} style={{ width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📍 Mark My Attendance</button>
            <p style={{fontSize:'10px', color:'#666', marginTop:'5px'}}>Range: 500m | Status: {status}</p>
            <button onClick={async () => {
                try {
                  if (!myProfileData && staffName) {
                    const qStaff = query(collection(db, "staff_records"), where("name", "==", staffName));
                    const staffSnap = await getDocs(qStaff);
                    if(!staffSnap.empty) setMyProfileData({...staffSnap.docs[0].data(), id: staffSnap.docs[0].id});
                  }
                  const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", staffName));
                  const attSnap = await getDocs(qAtt);
                  const sortedAtt = attSnap.docs.map(d => d.data()).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                  setMyAttendanceRecords(sortedAtt);
                  const qLeaves = query(collection(db, "teacher_leaves"), where("name", "==", staffName));
                  const leaveSnap = await getDocs(qLeaves);
                  setMyLeaveRecords(leaveSnap.docs.map(d => d.data()));
                  setView('teacher_profile_view');
                } catch (err) { alert("Error loading profile."); }
              }} style={{ width:'100%', padding:'12px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', marginTop:'10px' }}>👤 View My Profile</button>
            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
               <button onClick={() => setView('apply_leave')} style={{ flex:1, padding:'12px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📄 Apply Leave</button>
               <button onClick={async () => {
                 const qL = query(collection(db, "teacher_leaves"), where("name", "==", staffName));
                 const lSnap = await getDocs(qL);
                 setMyLeaves(lSnap.docs.map(d => ({id: d.id, ...d.data()})));
                 setView('my_leaves');
               }} style={{ flex:1, padding:'12px', background:'#7f8c8d', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📜 My Leaves</button>
            </div>
          </div>
        )}

        {view === 'apply_leave' && (
          <div style={cardStyle}>
            <h3 style={{marginTop:0}}>Apply for Leave</h3>
            <label style={{fontSize:'12px', color:'#666'}}>From Date</label>
            <input type="date" value={leaveFrom} onChange={(e)=>setLeaveFrom(e.target.value)} style={inputStyle} />
            <label style={{fontSize:'12px', color:'#666'}}>To Date</label>
            <input type="date" value={leaveTo} onChange={(e)=>setLeaveTo(e.target.value)} style={inputStyle} />
            <textarea placeholder="Reason for leave..." value={leaveReason} onChange={(e)=>setLeaveReason(e.target.value)} style={{...inputStyle, height:'80px', fontFamily:'inherit'}} />
            <button onClick={async () => {
              if(!leaveFrom || !leaveTo || !leaveReason) return alert("Fill all fields");
              try {
                await addDoc(collection(db, "teacher_leaves"), { name: staffName, fromDate: leaveFrom, toDate: leaveTo, reason: leaveReason, status: "pending", appliedAt: serverTimestamp() });
                alert("Leave application submitted!");
                addNotification("Leave request submitted successfully", "success");
                setLeaveFrom(''); setLeaveTo(''); setLeaveReason(''); setView('dashboard');
              } catch(e) { alert("Submission failed"); }
            }} style={actionBtn}>Submit Application</button>
            <button onClick={()=>setView('dashboard')} style={{...actionBtn, background:'#7f8c8d', marginTop:'10px'}}>Cancel</button>
          </div>
        )}

        {view === 'my_leaves' && (
          <div>
            <h3>My Leave Requests</h3>
            {myLeaves.length === 0 && <p style={{textAlign:'center', color:'#999'}}>No leaves applied yet.</p>}
            {myLeaves.map(l => (
              <div key={l.id} style={l.status === 'approved' ? {...cardStyle, borderLeft:'6px solid #2ecc71'} : l.status === 'rejected' ? {...cardStyle, borderLeft:'6px solid #e74c3c'} : cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                  <span>{l.fromDate} → {l.toDate}</span>
                  <span style={{color: l.status === 'approved' ? '#2ecc71' : l.status === 'rejected' ? '#e74c3c' : '#f39c12'}}>{l.status.toUpperCase()}</span>
                </div>
                <p style={{fontSize:'14px', margin:'10px 0', color:'#444'}}>{l.reason}</p>
              </div>
            ))}
            <button onClick={()=>setView('dashboard')} style={actionBtn}>Back</button>
          </div>
        )}

        {view === 'teacher_profile_view' && (myProfileData || selectedTeacherProfile) && (
          <div>
            <div style={cardStyle}>
              <h2 style={{margin:0, color:'#1a4a8e'}}>{(myProfileData || selectedTeacherProfile).name}</h2>
              <p style={{color:'#666', margin:'5px 0'}}>Role: {(myProfileData || selectedTeacherProfile).role}</p>
              { (myProfileData || selectedTeacherProfile).salary && <p style={{color:'#666', margin:'5px 0'}}>Salary/Pay: {(myProfileData || selectedTeacherProfile).salary}</p> }
              <div style={{marginTop:'10px', padding:'10px', background:'#f8f9fa', borderRadius:'8px', fontSize:'13px'}}>
                <strong>Attendance Summary:</strong><br/>
                Present: {getTeacherStats(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords, userRole === 'staff' ? myLeaveRecords : allLeaves.filter(al => al.name === (myProfileData || selectedTeacherProfile).name)).totalPresent} | Leave: {getTeacherStats(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords, userRole === 'staff' ? myLeaveRecords : allLeaves.filter(al => al.name === (myProfileData || selectedTeacherProfile).name)).totalLeave} | Absent: {getTeacherStats(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords, userRole === 'staff' ? myLeaveRecords : allLeaves.filter(al => al.name === (myProfileData || selectedTeacherProfile).name)).totalAbsent}
              </div>
              <button onClick={async () => {
                   const currentStaffName = (myProfileData || selectedTeacherProfile).name;
                   const qApproved = query(collection(db, "teacher_leaves"), where("name", "==", currentStaffName), where("status", "==", "approved"));
                   const leaveSnap = await getDocs(qApproved);
                   const approvedLeaveCount = leaveSnap.size;
                   const presentCount = (userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).length;
                   const reportBody = [
                     ["--- SECTION 1: TEACHER INFO ---", "", "", ""],
                     ["Name:", currentStaffName, "Role:", (myProfileData || selectedTeacherProfile).role],
                     ["Salary/Pay:", (myProfileData || selectedTeacherProfile).salary || "N/A", "", ""],
                     ["", "", "", ""],
                     ["--- SECTION 2: ATTENDANCE SUMMARY ---", "", "", ""],
                     ["Total Present:", presentCount, "Total Leave:", approvedLeaveCount],
                     ["Total Absent:", 0, "", ""],
                     ["", "", "", ""],
                     ["--- SECTION 3: ATTENDANCE DETAILS ---", "", "", ""],
                     ["Name", "Date", "Time", "Distance"],
                     ...(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).map(r => [currentStaffName, r.date, r.time, r.distance])
                   ];
                   downloadPDF("Teacher Professional Report", ["Field", "Value", "Field", "Value"], reportBody, `${currentStaffName}_Report`);
                }} style={{marginTop:'10px', padding:'10px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', width:'100%', fontWeight:'bold'}}>Download My Profile PDF</button>
            </div>
            <h4 style={{marginTop:'20px'}}>Attendance History</h4>
            {(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).map((r, idx) => (
              <div key={idx} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}><b>{r.date}</b><span>{r.time}</span></div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>📍 Distance: {r.distance}</div>
              </div>
            ))}
            <button onClick={() => setView(userRole === 'admin' ? 'teacher_attendance_view' : 'dashboard')} style={{...actionBtn, marginTop:'10px', background:'#7f8c8d'}}>Back</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{ 
            display:'grid', 
            gridTemplateColumns:'1fr 1fr', 
            gap:'6px',
            marginTop: '5px' 
          }}>
            {CLASSES.map(c => (
              <div 
                key={c} 
                onClick={async () => {
                  setFilterClass(c);
                  const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                  const snap = await getDocs(q);
                  setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                  setView(userRole === 'admin' ? 'view' : 'attendance');
                }} 
                style={{
                  background: 'white',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  borderLeft: '4px solid #f39c12',
                  cursor: 'pointer',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <small style={{ color: '#1a4a8e', fontSize: '11px', fontWeight: 'bold' }}>{c}</small>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{marginTop:0}}>{editingStudent ? "Edit Student" : "New Admission"}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (e.g. 92300...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears (Baqaya)" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedSection} onChange={(e)=>setSelectedSection(e.target.value)} style={inputStyle}>
              <option value="">No Section (General)</option>{SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>
            <button onClick={async () => {
              if(!name || !rollNo) return alert("Fill Name and Roll Number");
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, section:selectedSection, base_fee:Number(baseFee), arrears:Number(arrears) };
              try {
                if (editingStudent) {
                   await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d);
                   addNotification(`Updated student: ${name}`, "success");
                } else {
                   await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
                   addNotification(`New admission: ${name} (Roll: ${rollNo})`, "success");
                }
                alert("Saved!"); setView('dashboard'); clearInputs();
              } catch (e) { alert("Error Saving Data"); }
            }} style={actionBtn}>Save Student</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <div style={{...cardStyle, borderLeft:'6px solid #1a4a8e'}}>
                <h4 style={{margin:'0 0 10px 0'}}>Smart Filter</h4>
                <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}><input placeholder="Search Name or Roll No..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{...inputStyle, margin:0}} /></div>
                <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                    <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{...inputStyle, margin:0, flex:1, minWidth:'120px'}}><option value="All">All Classes</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} style={{...inputStyle, margin:0, flex:1, minWidth:'100px'}}><option value="All">All Sections</option><option value="General">General</option>{SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}</select>
                    <button onClick={() => { setSearchQuery(''); setClassFilter('All'); setFilterSection('All'); }} style={{background:'#7f8c8d', color:'white', border:'none', borderRadius:'10px', padding:'10px 15px', fontWeight:'bold', width:'100%', marginTop:'5px'}}>Clear Filters</button>
                </div>
            </div>
            {getFilteredRecords().map(r => (
              <div key={r.id} style={{ ...cardStyle, borderLeft: '6px solid #1a4a8e', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a4a8e' }}>{r.student_name}</div>
                    <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>Roll: <span style={{ fontWeight: '600' }}>{r.roll_number}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => generateFeeSlip(r)} 
                      style={{ background: '#2ecc71', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Generate Fee Slip"
                    >
                      📄
                    </button>
                    {r.parent_whatsapp && (
                      <a 
                        href={`https://wa.me/${r.parent_whatsapp}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ background: '#25D366', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" style={{ width: '18px', height: '18px' }} />
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '10px', marginBottom: '12px', fontSize: '12px', color: '#444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{r.class} {r.section ? `(Sec ${r.section})` : '(Gen)'}</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: r.arrears > 0 ? '#e74c3c' : '#2ecc71',
                      background: r.arrears > 0 ? '#fdeaea' : '#eafaf1',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {r.arrears > 0 ? 'Overdue' : 'Paid'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <span>Fee: <b>{r.base_fee}</b></span>
                    <span>Pending: <b>{r.arrears || 0}</b></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={()=>{setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setSelectedSection(r.section || ''); setView('add');}} 
                    style={{ flex: 1, background: '#f39c12', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={async ()=>{if(window.confirm(`Are you sure you want to delete ${r.student_name}?`)){await deleteDoc(doc(db,"ali_campus_records",r.id)); addNotification(`Deleted student: ${r.student_name}`, "warning"); fetchStats();}}} 
                    style={{ flex: 1, background: '#e74c3c', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center', margin:'0 0 5px 0'}}>{filterClass} - {today}</h3>
            {getFilteredRecords().map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><div style={{fontWeight:'bold'}}>{r.student_name} {r.section ? <small style={{color:'#1a4a8e', background:'#e8f0fe', padding:'2px 5px', borderRadius:'4px'}}>Sec {r.section}</small> : ''}</div><div style={{fontSize:'11px', color:'#666'}}>Roll: {r.roll_number}</div></div>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})} style={{background:attendance[r.id]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})} style={{background:attendance[r.id]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              try {
                const qCheck = query(collection(db, "daily_attendance"), where("class", "==", filterClass), where("date", "==", today));
                const checkSnap = await getDocs(qCheck);
                if (!checkSnap.empty) {
                  const existingDoc = checkSnap.docs[0];
                  await updateDoc(doc(db, "daily_attendance", existingDoc.id), { attendance_data: { ...existingDoc.data().attendance_data, ...attendance }, timestamp: serverTimestamp() });
                } else {
                  await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() });
                }
                alert("Attendance Saved!"); setView('dashboard'); setAttendance({}); fetchStats();
              } catch (e) { alert("Error saving attendance"); }
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            <h3 style={{margin:0, marginBottom: '10px'}}>Attendance History</h3>
            {history.map(h => (
              <div key={h.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><b>{h.date}</b> - {h.class}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => {
                    const headers = ["Roll No", "Student Name", "Status"];
                    const body = Object.entries(h.attendance_data || {}).map(([id, status]) => {
                      const std = records.find(r => r.id === id);
                      return [std?.roll_number || 'N/A', std?.student_name || 'N/A', status === 'P' ? 'Present' : 'Absent'];
                    });
                    downloadPDF(`Attendance Report: ${h.class}`, headers, body, `Attendance_${h.class}_${h.date}`);
                  }} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>PDF</button>
                  {userRole === 'admin' && <button onClick={() => requestDelete(h)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', fontSize:'11px', fontWeight:'bold', cursor:'pointer'}}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'teacher_attendance_view' && (
          <div>
            <h3 style={{margin:0, marginBottom: '10px'}}>Teacher Attendance</h3>
            <input type="date" value={tAttSearchDate} onChange={(e)=>setTAttSearchDate(e.target.value)} style={inputStyle} placeholder="Filter by Date" />
            {getUnifiedTeacherAttendanceList().map(t => (
              <div key={t.id} style={{...cardStyle, borderLeft: t.time ? '6px solid #2ecc71' : '6px solid #e74c3c'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}><span>{t.name}</span><span style={{color: t.time ? '#1a4a8e' : '#e74c3c'}}>{t.time ? t.time : "❌ Absent (Auto Detected)"}</span></div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>📅 {t.date} | 📍 Dist: {t.distance}</div>
              </div>
            ))}
            <hr style={{margin:'30px 0', border:'none', height:'2px', background:'#ddd'}}/>
            <h3 style={{color:'#1a4a8e'}}>Teacher Leave Applications</h3>
            {allLeaves.map(l => (
              <div key={l.id} style={{...cardStyle, borderLeft:'6px solid #1a4a8e'}}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}><div><b>{l.name}</b><div style={{fontSize:'12px', color:'#666'}}>{l.fromDate} → {l.toDate}</div></div><span style={{padding:'4px 8px', borderRadius:'5px', fontSize:'10px', fontWeight:'bold', background: l.status === 'approved' ? '#2ecc71' : l.status === 'rejected' ? '#e74c3c' : '#f39c12', color:'white'}}>{l.status.toUpperCase()}</span></div>
                 <p style={{fontSize:'13px', color:'#333', background:'#f9f9f9', padding:'8px', borderRadius:'5px', margin:'10px 0'}}>{l.reason}</p>
                 {l.status === 'pending' && <div style={{display:'flex', gap:'10px'}}><button onClick={async () => { await updateDoc(doc(db, "teacher_leaves", l.id), { status: 'approved' }); addNotification(`Approved leave for ${l.name}`, "success"); setAllLeaves(allLeaves.map(item => item.id === l.id ? {...item, status:'approved'} : item)); fetchStats(); }} style={{flex:1, background:'#2ecc71', color:'white', border:'none', padding:'8px', borderRadius:'5px', fontWeight:'bold'}}>✅ Approve</button><button onClick={async () => { await updateDoc(doc(db, "teacher_leaves", l.id), { status: 'rejected' }); addNotification(`Rejected leave for ${l.name}`, "warning"); setAllLeaves(allLeaves.map(item => item.id === l.id ? {...item, status:'rejected'} : item)); fetchStats(); }} style={{flex:1, background:'#e74c3c', color:'white', border:'none', padding:'8px', borderRadius:'5px', fontWeight:'bold'}}>❌ Reject</button></div>}
              </div>
            ))}
          </div>
        )}

        {view === 'monthly_report' && (
          <div style={cardStyle}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
               <h4 style={{margin:0}}>{filterClass} Report</h4>
               <button onClick={() => {
                  const headers = ["Roll No", "Student Name", "Present", "Absent"];
                  const body = monthlyData.map(([info, s]) => [info.roll, info.name, s.p, s.a]);
                  downloadPDF(`${filterClass} Monthly Report (${selectedMonth})`, headers, body, `${filterClass}_Report_${selectedMonth}`);
               }} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>Download PDF</button>
             </div>
             <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}><thead><tr style={{background:'#eee'}}><th style={{padding:'5px', textAlign:'left'}}>Roll-Name</th><th>P</th><th>A</th></tr></thead><tbody>{monthlyData.map(([info, s])=>(<tr key={info.name} style={{borderBottom:'1px solid #ddd'}}><td style={{padding:'8px'}}>{info.roll} - {info.name}</td><td style={{textAlign:'center'}}>{s.p}</td><td style={{textAlign:'center'}}>{s.a}</td></tr>))}</tbody></table>
             <button onClick={()=>setView('dashboard')} style={{...actionBtn, marginTop:'15px'}}>Back Home</button>
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={async ()=> {
              setMonthlyData([]); setRecords([]); setFilterSection('All'); 
              const qRec = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
              const recSnap = await getDocs(qRec);
              const studentMap = {};
              recSnap.docs.forEach(d => { studentMap[d.id] = { name: d.data().student_name, roll: d.data().roll_number }; });
              if(view==='sel_report') {
                const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
                const snap = await getDocs(q);
                const summary = {};
                snap.docs.forEach(d => {
                  const data = d.data();
                  if (data.date?.startsWith(selectedMonth)) {
                    Object.entries(data.attendance_data).forEach(([id, stat]) => {
                      const stdInfo = studentMap[id] || { name: id, roll: 'N/A' };
                      const key = JSON.stringify(stdInfo); 
                      if (!summary[key]) summary[key] = { p: 0, a: 0 };
                      stat === 'P' ? summary[key].p++ : summary[key].a++;
                    });
                  }
                });
                setMonthlyData(Object.entries(summary).map(([k, v]) => [JSON.parse(k), v]));
                setView('monthly_report');
              } else {
                setRecords(recSnap.docs.map(d => ({ id: d.id, ...d.data(), class: filterClass })));
                setView(view==='sel_view'?'view':'attendance');
              }
            }} style={actionBtn}>Proceed</button>
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/><input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle}/><input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle}/><input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{
                await addDoc(collection(db, "staff_records"), {name:sName, role:sRole, salary:sSalary, password:sPass});
                addNotification(`Staff added: ${sName}`, "success");
                const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
                setSName(''); setSRole(''); setSSalary(''); setSPass('');
              }} style={actionBtn}>Add Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><b>{s.name}</b><button onClick={async ()=>{if(window.confirm("Remove staff?")) { await deleteDoc(doc(db, "staff_records", s.id)); const snap = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }}} style={{background:'#e74c3c', color:'white', border:'none', padding:'4px 8px', borderRadius:'5px', fontSize:'10px'}}>Remove</button></div>
                <div style={{fontSize:'12px', color:'#666'}}>Role: {s.role} | PWD: {s.password}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ fontSize: "12px", color: "#666", textAlign: "center", padding: "8px 0" }}>Developed by : Touqeer Iqbal Baghoor<br/>Contact: 923015800630</footer>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', marginBottom:'12px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box', fontSize:'14px' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer', fontSize:'16px' };

export default App;
