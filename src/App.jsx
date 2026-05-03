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

  const today = new Date().toISOString().split('T')[0];

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
        setStaffName(snap.docs[0].data().name); 
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
          {userRole === 'admin' && <button onClick={async () => { const t = await getDocs(query(collection(db, "teacher_attendance"), orderBy("timestamp","desc"))); setTeacherAttendanceList(t.docs.map(d=>({id:d.id, ...d.data()}))); setView('teacher_attendance_view'); }} style={getNavStyle('teacher_attendance_view')}>📍 Teacher Att</button>}
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
                  const qStaff = query(collection(db, "staff_records"), where("name", "==", staffName));
                  const staffSnap = await getDocs(qStaff);
                  if(!staffSnap.empty) {
                    setMyProfileData(staffSnap.docs[0].data());
                  } else {
                    setMyProfileData({ name: staffName, role: "Teacher", salary: "N/A" });
                  }
                  
                  // Query simplified to avoid Index requirement errors
                  const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", staffName));
                  const attSnap = await getDocs(qAtt);
                  const sortedAtt = attSnap.docs
                    .map(d => d.data())
                    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                    
                  setMyAttendanceRecords(sortedAtt);
                  setView('teacher_profile_view');
                } catch (err) {
                  alert("Error fetching profile.");
                  console.error(err);
                }
              }}
              style={{ width:'100%', padding:'12px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', marginTop:'10px' }}
            >
              👤 View My Profile
            </button>
          </div>
        )}

        {view === 'teacher_profile_view' && (myProfileData || selectedTeacherProfile) && (
          <div>
            <div style={cardStyle}>
              <h2 style={{margin:0, color:'#1a4a8e'}}>{(myProfileData || selectedTeacherProfile).name}</h2>
              <p style={{color:'#666', margin:'5px 0'}}>Role: {(myProfileData || selectedTeacherProfile).role}</p>
              { (myProfileData || selectedTeacherProfile).salary && <p style={{color:'#666', margin:'5px 0'}}>Salary/Pay: {(myProfileData || selectedTeacherProfile).salary}</p> }
              
              <button 
                onClick={() => downloadPDF(
                  "Teacher Profile Report", 
                  ["Name", "Date", "Time", "Distance"], 
                  (userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).map(r => [(myProfileData || selectedTeacherProfile).name, r.date, r.time, r.distance]), 
                  (myProfileData || selectedTeacherProfile).name + "_Profile_Report"
                )}
                style={{marginTop:'10px', padding:'10px', background:'#28a745', color:'white', border:'none', borderRadius:'8px', width:'100%', fontWeight:'bold'}}
              >
                Download My Profile PDF
              </button>
            </div>

            <h4 style={{marginTop:'20px'}}>Attendance History</h4>
            {(userRole === 'staff' ? myAttendanceRecords : teacherProfileRecords).map((r, idx) => (
              <div key={idx} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.date}</b>
                  <span>{r.time}</span>
                </div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>📍 Distance: {r.distance}</div>
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
            <h3 style={{marginTop:0}}>{editingStudent ? "Edit Student" : "New Admission"}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (e.g. 92300...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears (Baqaya)" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              if(!name || !rollNo) return alert("Fill Name and Roll Number");
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              try {
                editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
                alert("Saved!"); setView('dashboard'); clearInputs();
              } catch (e) { alert("Error Saving Data"); }
            }} style={actionBtn}>Save Student</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="Search Student..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r=>r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span><b>{r.student_name}</b> ({r.roll_number})</span>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#25D366', fontWeight:'bold'}}>
                    <span style={{fontSize:'16px'}}>🟢</span> WhatsApp
                  </a>
                </div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>Fee: {r.base_fee} | Baqaya: {r.arrears || 0}</div>
                <div style={{marginTop:'10px'}}>
                  <button onClick={()=>{setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setView('add');}} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px', marginRight:'10px'}}>Edit</button>
                  <button onClick={async ()=>{if(window.confirm("Delete?")){await deleteDoc(doc(db,"ali_campus_records",r.id)); setView('dashboard');}}} style={{background:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>{filterClass} - {today}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})} style={{background:attendance[r.id]==='P'?'#2ecc71':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', marginRight:'5px'}}>P</button>
                  <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})} style={{background:attendance[r.id]==='A'?'#e74c3c':'#ccc', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async ()=>{
              await addDoc(collection(db,"daily_attendance"), {class:filterClass, date:today, attendance_data:attendance, timestamp:serverTimestamp()});
              alert("Attendance Saved!"); setView('dashboard'); setAttendance({});
            }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
              <h3 style={{margin:0}}>Attendance History</h3>
              {(userRole === 'admin' || userRole === 'staff') && (
                <button onClick={() => downloadPDF("Detailed Attendance History", ["Date", "Class Name"], history.map(h => [h.date, h.class]), "Full_Attendance_History")} style={{background:'#1a4a8e', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Download PDF</button>
              )}
            </div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <b>{h.date}</b> - {h.class}
              </div>
            ))}
          </div>
        )}

        {view === 'teacher_attendance_view' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
              <h3 style={{margin:0}}>Teacher Attendance</h3>
              <button onClick={() => downloadPDF("Teacher Attendance Report", ["Teacher Name", "Date", "Time", "Distance"], teacherAttendanceList.filter(t => tAttSearchDate === '' || t.date === tAttSearchDate).map(t => [t.name, t.date, t.time, t.distance]), "Teacher_Attendance_Report")} style={{background:'#1a4a8e', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Download PDF</button>
            </div>
            <input type="date" value={tAttSearchDate} onChange={(e)=>setTAttSearchDate(e.target.value)} style={inputStyle} placeholder="Filter by Date" />
            {teacherAttendanceList.filter(t => tAttSearchDate === '' || t.date === tAttSearchDate).map(t => (
              <div key={t.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                  <span>{t.name}</span>
                  <span style={{color:'#1a4a8e'}}>{t.time}</span>
                </div>
                <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>
                  📅 {t.date} | 📍 Dist: {t.distance}
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const qStaff = query(collection(db, "staff_records"), where("name", "==", t.name));
                      const staffSnap = await getDocs(qStaff);
                      const staffData = !staffSnap.empty ? staffSnap.docs[0].data() : { name: t.name, role: "Staff" };
                      
                      const qAtt = query(collection(db, "teacher_attendance"), where("name", "==", t.name));
                      const attSnap = await getDocs(qAtt);
                      const sortedAtt = attSnap.docs
                        .map(d => d.data())
                        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                        
                      setSelectedTeacherProfile(staffData);
                      setTeacherProfileRecords(sortedAtt);
                      setMyProfileData(null); 
                      setView('teacher_profile_view');
                    } catch (err) {
                      alert("Error loading profile.");
                    }
                  }} 
                  style={{marginTop:'10px', background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'5px', fontSize:'12px', fontWeight:'bold'}}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'monthly_report' && (
          <div style={cardStyle}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
               <h4 style={{margin:0}}>{filterClass} Report</h4>
               {userRole === 'admin' && (
                 <button onClick={() => downloadPDF(`${filterClass} - Monthly Attendance Summary (${selectedMonth})`, ["Roll No", "Student Name", "Present", "Absent"], monthlyData.map(([info, s]) => [info.roll, info.name, s.p, s.a]), `${filterClass}_Monthly_Report`)} style={{background:'#2ecc71', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Download PDF</button>
               )}
             </div>
             <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
               <thead><tr style={{background:'#eee'}}><th style={{padding:'5px', textAlign:'left'}}>Roll-Name</th><th>P</th><th>A</th></tr></thead>
               <tbody>{monthlyData.map(([info, s])=>(<tr key={info.name} style={{borderBottom:'1px solid #ddd'}}><td style={{padding:'8px'}}>{info.roll} - {info.name}</td><td style={{textAlign:'center'}}>{s.p}</td><td style={{textAlign:'center'}}>{s.a}</td></tr>))}</tbody>
             </table>
             <button onClick={()=>setView('dashboard')} style={{...actionBtn, marginTop:'15px'}}>Back Home</button>
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={async ()=> {
              setMonthlyData([]); setRecords([]);
              const qRec = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
              const recSnap = await getDocs(qRec);
              const studentMap = {};
              recSnap.docs.forEach(d => { 
                  studentMap[d.id] = { name: d.data().student_name, roll: d.data().roll_number }; 
              });
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
                setRecords(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView(view==='sel_view'?'view':'attendance');
              }
            }} style={actionBtn}>Proceed</button>
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/>
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle}/>
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle}/>
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{
                await addDoc(collection(db, "staff_records"), {name:sName, role:sRole, salary:sSalary, password:sPass});
                alert("Staff Added");
                const s = await getDocs(query(collection(db, "staff_records"))); setStaffRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
                setSName(''); setSRole(''); setSSalary(''); setSPass('');
              }} style={actionBtn}>Add Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b> ({s.role}) - PWD: {s.password}
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
