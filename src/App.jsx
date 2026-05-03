import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
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

  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    totalStaff: 0,
    todayStudentAttendance: 0,
    todayTeacherAttendance: 0,
    pendingLeaves: 0
  });

  const today = new Date().toISOString().split('T')[0];

  // ===== PROFESSIONAL LEDGER GENERATOR =====
  const downloadProfessionalPDF = (title, headers, bodyData, summaryData = null) => {
    const doc = new jsPDF();
    
    // School Header Branding
    doc.setFillColor(26, 74, 142); 
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("DAR-E-ARQAM SCHOOL", 105, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("ALI CAMPUS - ADHI KOT", 105, 28, { align: 'center' });
    
    doc.setFillColor(243, 156, 18); 
    doc.rect(0, 35, 210, 10, 'F');
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), 105, 41, { align: 'center' });

    let startY = 55;

    if (summaryData) {
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      summaryData.forEach(item => {
        doc.setFont(undefined, 'bold');
        doc.text(`${item.label}:`, 15, startY);
        doc.setFont(undefined, 'normal');
        doc.text(`${item.value}`, 55, startY);
        startY += 7;
      });
      startY += 5;
    }

    doc.autoTable({ 
      head: [headers], 
      body: bodyData, 
      startY: startY,
      theme: 'striped',
      headStyles: { fillColor: [26, 74, 142], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
      margin: { top: 45 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Official Ledger | Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportStudentsLedger = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    let totalFee = 0;
    let totalArrears = 0;
    const body = snap.docs.map(d => {
      const data = d.data();
      totalFee += Number(data.base_fee || 0);
      totalArrears += Number(data.arrears || 0);
      return [data.roll_number, data.student_name, data.class || "N/A", `Rs. ${data.base_fee || 0}`, `Rs. ${data.arrears || 0}`];
    });

    const summary = [
      { label: "Total Students", value: snap.size },
      { label: "Total Arrears", value: `Rs. ${totalArrears}` },
      { label: "Estimated Monthly Revenue", value: `Rs. ${totalFee}` }
    ];

    downloadProfessionalPDF("Students Master Ledger", ["Roll No", "Student Name", "Class", "Base Fee", "Arrears"], body, summary);
  };

  const handleExportStaffLedger = async () => {
    const snap = await getDocs(collection(db, "staff_records"));
    const body = snap.docs.map(d => {
      const data = d.data();
      return [data.name, data.role, `Rs. ${data.salary}`, data.password];
    });

    downloadProfessionalPDF("Staff Employment Ledger", ["Staff Name", "Designation", "Base Salary", "Access Pin"], body, [{ label: "Total Employees", value: snap.size }]);
  };

  // Logic helpers
  const getTeacherStats = (attendanceList, leaveList) => {
    const totalPresent = attendanceList.length;
    const totalLeave = leaveList.filter(l => l.status === "approved").length;
    return { totalPresent, totalLeave, totalAbsent: 0 };
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = () => {
    if (!navigator.geolocation) return alert("Location not supported");
    setStatus('Checking...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
      if (dist <= 500) {
        await addDoc(collection(db, "teacher_attendance"), { name: staffName, date: today, time: new Date().toLocaleTimeString(), timestamp: serverTimestamp(), distance: Math.round(dist) + "m" });
        alert("Attendance Marked!"); setStatus('Done');
      } else { alert(`Too far! ${Math.round(dist)}m.`); setStatus('Out of Range'); }
    }, () => alert("Enable Location Access!"));
  };

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
      } catch (err) { console.error("Stats Error", err); }
    }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const clearInputs = () => {
    setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setEditingStudent(null);
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });

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
        {userRole === 'staff' && <div style={{background:'rgba(255,255,255,0.2)', padding:'5px', borderRadius:'8px', fontSize:'12px', marginTop:'5px'}}>Teacher: {staffName}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => { clearInputs(); setView('add'); }} style={getNavStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => { const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()}))); setView('staff_list'); }} style={getNavStyle('staff_list')}>👥 Staff</button>}
          <button onClick={async () => { const h = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp","desc"))); setHistory(h.docs.map(d=>({id:d.id, ...d.data()}))); setView('history'); }} style={getNavStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊 Reprt</button>}
          {userRole === 'admin' && <button onClick={async () => { 
            const t = await getDocs(query(collection(db, "teacher_attendance"), orderBy("timestamp","desc"))); 
            setTeacherAttendanceList(t.docs.map(d=>({id:d.id, ...d.data()}))); 
            const l = await getDocs(query(collection(db, "teacher_leaves"), orderBy("appliedAt", "desc")));
            setAllLeaves(l.docs.map(d=>({id:d.id, ...d.data()})));
            setView('teacher_attendance_view'); 
          }} style={getNavStyle('teacher_attendance_view')}>📍 Teacher Att</button>}
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {userRole === 'admin' && view === 'dashboard' && (
          <>
            <div style={{...cardStyle, background: '#1a4a8e', color: 'white', borderLeft: '6px solid #f39c12'}}>
              <h4 style={{marginTop: 0, marginBottom: '10px'}}>📊 Admin Overview Panel</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}>
                  <small style={{display: 'block', opacity: 0.8}}>Total Students</small>
                  <b style={{fontSize: '18px'}}>{adminAnalytics.totalStudents}</b>
                </div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}>
                  <small style={{display: 'block', opacity: 0.8}}>Total Staff</small>
                  <b style={{fontSize: '18px'}}>{adminAnalytics.totalStaff}</b>
                </div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}>
                  <small style={{display: 'block', opacity: 0.8}}>Today Student P</small>
                  <b style={{fontSize: '18px'}}>{adminAnalytics.todayStudentAttendance}</b>
                </div>
                <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px'}}>
                  <small style={{display: 'block', opacity: 0.8}}>Today Teacher P</small>
                  <b style={{fontSize: '18px'}}>{adminAnalytics.todayTeacherAttendance}</b>
                </div>
                <div onClick={() => setView('teacher_attendance_view')} style={{background: adminAnalytics.pendingLeaves > 0 ? '#e74c3c' : 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', gridColumn: 'span 2', cursor: 'pointer', textAlign: 'center'}}>
                  <small style={{display: 'block', opacity: 0.8}}>Pending Teacher Leaves</small>
                  <b style={{fontSize: '18px'}}>{adminAnalytics.pendingLeaves} Request(s)</b>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{marginTop:0}}>📜 Professional Ledgers (PDF)</h4>
              <button onClick={handleExportStudentsLedger} style={{...actionBtn, padding:'12px', fontSize:'13px', marginBottom:'8px'}}>Print Students Master Ledger</button>
              <button onClick={handleExportStaffLedger} style={{...actionBtn, padding:'12px', fontSize:'13px', background:'#2ecc71'}}>Print Staff Payroll Ledger</button>
            </div>
          </>
        )}

        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'#e8f0fe', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'10px', border:'1px dashed #1a4a8e' }}>
            <button onClick={handleTeacherAttendance} style={{ width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📍 Mark My Attendance</button>
            <p style={{fontSize:'10px', color:'#666', marginTop:'5px'}}>Range: 500m | Status: {status}</p>
            <button 
              onClick={async () => {
                const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", staffName));
                const attSnap = await getDocs(qAtt);
                setMyAttendanceRecords(attSnap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp));
                const qL = query(collection(db, "teacher_leaves"), where("name", "==", staffName));
                const lSnap = await getDocs(qL);
                setMyLeaveRecords(lSnap.docs.map(d => d.data()));
                setView('teacher_profile_view');
              }}
              style={{ width:'100%', padding:'12px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', marginTop:'10px' }}
            >
              👤 View My Profile
            </button>
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
            <h3>Apply for Leave</h3>
            <input type="date" value={leaveFrom} onChange={(e)=>setLeaveFrom(e.target.value)} style={inputStyle} />
            <input type="date" value={leaveTo} onChange={(e)=>setLeaveTo(e.target.value)} style={inputStyle} />
            <textarea placeholder="Reason..." value={leaveReason} onChange={(e)=>setLeaveReason(e.target.value)} style={{...inputStyle, height:'80px'}} />
            <button onClick={async () => {
              await addDoc(collection(db, "teacher_leaves"), { name: staffName, fromDate: leaveFrom, toDate: leaveTo, reason: leaveReason, status: "pending", appliedAt: serverTimestamp() });
              alert("Submitted!"); setView('dashboard');
            }} style={actionBtn}>Submit</button>
            <button onClick={()=>setView('dashboard')} style={{...actionBtn, background:'#7f8c8d', marginTop:'10px'}}>Cancel</button>
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3 style={{marginTop:0}}>{editingStudent ? "Edit Student" : "New Admission"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              alert("Saved!"); setView('dashboard'); clearInputs();
            }} style={actionBtn}>Save</button>
          </div>
        )}

        {view === 'dashboard' && userRole === 'admin' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={async () => {
                setFilterClass(c);
                const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
                const snap = await getDocs(q);
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView('view');
              }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <button onClick={async ()=> {
              const qRec = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
              const recSnap = await getDocs(qRec);
              setRecords(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));
              setView(view==='sel_view'?'view':'attendance');
            }} style={actionBtn}>Proceed</button>
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/>
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle}/>
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle}/>
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{
                await addDoc(collection(db, "staff_records"), {name:sName, role:sRole, salary:sSalary, password:sPass});
                alert("Added"); setView('dashboard');
              }} style={actionBtn}>Add</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}><b>{s.name}</b> - {s.role} (Pin: {s.password})</div>
            ))}
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
