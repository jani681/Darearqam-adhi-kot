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

  // --- LEAVE STATES ---
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [myLeaveRecords, setMyLeaveRecords] = useState([]);

  // PRO LOGIC: Salary & Stats Calculation
  const getTeacherStats = (attendanceList, leaveList) => {
    const totalPresent = attendanceList.length;
    const totalLeave = leaveList.filter(l => l.status === "approved").length;
    // Assuming a standard 26-day working month for logic, otherwise 0 fallback
    const totalAbsent = Math.max(0, 26 - (totalPresent + totalLeave));
    return { totalPresent, totalLeave, totalAbsent };
  };

  const today = new Date().toISOString().split('T')[0];

  // UPGRADED PRO PDF FUNCTION
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    // Header Style
    doc.setFillColor(26, 74, 142);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("DAR-E-ARQAM SCHOOL", 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text("ALI CAMPUS - ADHI KOT", 105, 25, { align: 'center' });
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), 105, 34, { align: 'center' });
    
    doc.autoTable({ 
      head: [headers], 
      body: bodyData, 
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [26, 74, 142], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Official Document | Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    doc.save(`${fileName}.pdf`);
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
        {userRole === 'staff' && view === 'dashboard' && (
          <div style={{ background:'#e8f0fe', padding:'15px', borderRadius:'12px', textAlign:'center', marginBottom:'10px', border:'1px dashed #1a4a8e' }}>
            <button onClick={handleTeacherAttendance} style={{ width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' }}>📍 Mark My Attendance</button>
            <p style={{fontSize:'10px', color:'#666', marginTop:'5px'}}>Range: 500m | Status: {status}</p>
            <button 
              onClick={async () => {
                try {
                  const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", staffName));
                  const attSnap = await getDocs(qAtt);
                  const sortedAtt = attSnap.docs.map(d => d.data()).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                  setMyAttendanceRecords(sortedAtt);
                  const qLeaves = query(collection(db, "teacher_leaves"), where("name", "==", staffName));
                  const leaveSnap = await getDocs(qLeaves);
                  setMyLeaveRecords(leaveSnap.docs.map(d => d.data()));
                  setView('teacher_profile_view');
                } catch (err) { alert("Error loading profile."); }
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
            <h3 style={{marginTop:0}}>Apply for Leave</h3>
            <label style={{fontSize:'12px', color:'#666'}}>From Date</label>
            <input type="date" value={leaveFrom} onChange={(e)=>setLeaveFrom(e.target.value)} style={inputStyle} />
            <label style={{fontSize:'12px', color:'#666'}}>To Date</label>
            <input type="date" value={leaveTo} onChange={(e)=>setLeaveTo(e.target.value)} style={inputStyle} />
            <textarea placeholder="Reason..." value={leaveReason} onChange={(e)=>setLeaveReason(e.target.value)} style={{...inputStyle, height:'80px'}} />
            <button onClick={async () => {
              if(!leaveFrom || !leaveTo || !leaveReason) return alert("Fill all fields");
              await addDoc(collection(db, "teacher_leaves"), { name: staffName, fromDate: leaveFrom, toDate: leaveTo, reason: leaveReason, status: "pending", appliedAt: serverTimestamp() });
              alert("Submitted!"); setView('dashboard');
            }} style={actionBtn}>Submit Application</button>
          </div>
        )}

        {view === 'my_leaves' && (
          <div>
            <h3>My Leave History</h3>
            {myLeaves.map(l => (
              <div key={l.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}><b>{l.fromDate} to {l.toDate}</b><span style={{color: l.status==='approved'?'green':'orange'}}>{l.status}</span></div>
                <p style={{fontSize:'12px'}}>{l.reason}</p>
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
              
              <div style={{marginTop:'10px', padding:'10px', background:'#f8f9fa', borderRadius:'8px', fontSize:'13px'}}>
                <strong>Current Stats:</strong><br/>
                {(() => {
                    const stats = getTeacherStats(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords, userRole === 'staff' ? myLeaveRecords : allLeaves.filter(al => al.name === (myProfileData || selectedTeacherProfile).name));
                    return `Present: ${stats.totalPresent} | Leave: ${stats.totalLeave} | Absent: ${stats.totalAbsent}`;
                })()}
              </div>

              <button 
                onClick={async () => {
                   const currentStaff = (myProfileData || selectedTeacherProfile);
                   const qApproved = query(collection(db, "teacher_leaves"), where("name", "==", currentStaff.name), where("status", "==", "approved"));
                   const leaveSnap = await getDocs(qApproved);
                   const approvedLeaveCount = leaveSnap.size;
                   const attRecords = userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords;
                   const stats = getTeacherStats(attRecords, leaveSnap.docs.map(d=>d.data()));

                   const reportBody = [
                     ["--- PROFILE INFORMATION ---", "", "", ""],
                     ["Name:", currentStaff.name, "Designation:", currentStaff.role],
                     ["Salary/Pay:", currentStaff.salary || "N/A", "Report Date:", today],
                     ["", "", "", ""],
                     ["--- MONTHLY PERFORMANCE SUMMARY ---", "", "", ""],
                     ["Days Present:", stats.totalPresent, "Days on Leave:", stats.totalLeave],
                     ["Days Absent:", stats.totalAbsent, "Total Records:", attRecords.length],
                     ["", "", "", ""],
                     ["--- LOGGED ATTENDANCE LOG ---", "", "", ""],
                     ["Date", "Time", "Location Status", "Distance"],
                     ...attRecords.map(r => [r.date, r.time, "Verified", r.distance])
                   ];

                   downloadPDF("Teacher Performance & Attendance Report", ["Category", "Details", "Category", "Details"], reportBody, `${currentStaff.name}_Profile`);
                }}
                style={{marginTop:'15px', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', width:'100%', fontWeight:'bold'}}
              >
                Download My Profile PDF
              </button>
            </div>

            <h4 style={{marginTop:'20px'}}>Verified Attendance Log</h4>
            {(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).map((r, idx) => (
              <div key={idx} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}><b>{r.date}</b><span>{r.time}</span></div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>📍 Distance from Campus: {r.distance}</div>
              </div>
            ))}
            <button onClick={() => setView(userRole === 'admin' ? 'teacher_attendance_view' : 'dashboard')} style={{...actionBtn, marginTop:'10px', background:'#7f8c8d'}}>Back</button>
          </div>
        )}

        {view === 'dashboard' && (
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

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Update Records" : "New Admission"}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              alert("Success!"); setView('dashboard'); clearInputs();
            }} style={actionBtn}>Save Changes</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="Search Students..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r=>r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <b>{r.student_name}</b> ({r.roll_number})
                <div style={{marginTop:'10px'}}>
                  <button onClick={()=>{setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setView('add');}} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px', marginRight:'5px'}}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'teacher_attendance_view' && (
          <div>
            <h3>Teacher Attendance Monitor</h3>
            {teacherAttendanceList.map(t => (
              <div key={t.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}><b>{t.name}</b><span>{t.time}</span></div>
                <div style={{fontSize:'12px', color:'#666'}}>{t.date} | Dist: {t.distance}</div>
                <button 
                  onClick={async () => {
                    const qStaff = query(collection(db, "staff_records"), where("name", "==", t.name));
                    const staffSnap = await getDocs(qStaff);
                    const staffData = !staffSnap.empty ? staffSnap.docs[0].data() : { name: t.name, role: "Staff" };
                    const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", t.name));
                    const attSnap = await getDocs(qAtt);
                    setSelectedTeacherProfile(staffData);
                    setTeacherProfileRecords(attSnap.docs.map(d => d.data()).sort((a,b)=> (b.timestamp?.seconds||0)-(a.timestamp?.seconds||0)));
                    setView('teacher_profile_view');
                  }} 
                  style={{marginTop:'10px', background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px', width:'100%'}}
                >
                  Inspect Detailed Profile
                </button>
              </div>
            ))}
            <h3 style={{marginTop:'30px'}}>Manage Leaves</h3>
            {allLeaves.map(l => (
              <div key={l.id} style={cardStyle}>
                <b>{l.name}</b>: {l.fromDate} → {l.toDate}
                <div style={{fontSize:'12px', margin:'5px 0'}}>{l.reason}</div>
                {l.status === 'pending' && (
                  <div style={{display:'flex', gap:'5px'}}>
                    <button onClick={async() => { await updateDoc(doc(db,"teacher_leaves",l.id), {status:'approved'}); alert("Approved"); }} style={{flex:1, background:'green', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Approve</button>
                    <button onClick={async() => { await updateDoc(doc(db,"teacher_leaves",l.id), {status:'rejected'}); alert("Rejected"); }} style={{flex:1, background:'red', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Reject</button>
                  </div>
                )}
              </div>
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
