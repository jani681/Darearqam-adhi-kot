import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  // --- STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [status, setStatus] = useState('System Online');

  // Data States
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Form States (Student)
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form States (Staff)
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  // Attendance & Report States
  const [attendance, setAttendance] = useState({}); 
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- FUNCTIONS ---

  const handleLogin = async () => {
    setStatus('Verifying...');
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setCurrentUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setUserRole('teacher');
      setIsLoggedIn(true);
      setView('sel_att');
    } else {
      alert("Wrong Password");
    }
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
  };

  const fetchRecords = async (target, cls) => {
    setFilterClass(cls);
    const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
    const snap = await getDocs(q);
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView(target);
  };

  const fetchHistory = async () => {
    const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView('history');
  };

  const fetchStaff = async () => {
    const q = query(collection(db, "staff_records"), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setView('staff_list');
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  // --- RENDER HELPERS ---
  const getNavStyle = (v) => ({
    padding: '10px 5px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#fff', color: '#1a4a8e', cursor:'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ background:'#1a4a8e', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', padding:'20px' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" width="80" style={{background:'white', borderRadius:'50%', padding:'10px', marginBottom:'20px'}} />
      <h3>Ali Campus Login</h3>
      <input type="password" placeholder="Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', border:'none', width:'100%', maxWidth:'300px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 40px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', width:'100%', maxWidth:'300px'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ background: '#f4f7f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
          {userRole === 'admin' ? (
            <>
              <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠Home</button>
              <button onClick={() => {setEditingStudent(null); setView('add')}} style={getNavStyle('add')}>📝Admit</button>
              <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂Dir</button>
              <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅Atten</button>
              <button onClick={fetchStaff} style={getNavStyle('staff_list')}>👥Staff</button>
              <button onClick={fetchHistory} style={getNavStyle('history')}>📜Hist</button>
              <button onClick={() => setView('sel_report')} style={getNavStyle('sel_report')}>📊Reprt</button>
            </>
          ) : (
            <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅Attendance</button>
          )}
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('out')}>🚪Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecords('view', c)} style={cardStyle}>
                <b style={{color:'#1a4a8e'}}>{c}</b>
                <div style={{fontSize:'20px'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* ADMISSION FORM */}
        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? 'Update Student' : 'New Admission'}</h3>
            <input placeholder="Student Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp Number" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => {
              const total = (Number(baseFee) || 0) + (Number(arrears) || 0);
              const data = { student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, class: selectedClass, base_fee: Number(baseFee), arrears: Number(arrears), total_dues: total };
              if(editingStudent) await updateDoc(doc(db, "ali_campus_records", editingStudent.id), data);
              else await addDoc(collection(db, "ali_campus_records"), { ...data, created_at: serverTimestamp(), fee_status: 'Unpaid' });
              setView('dashboard'); setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears('');
            }} style={actionBtn}>Save Record</button>
          </div>
        )}

        {/* DIRECTORY / STUDENT LIST */}
        {view === 'view' && (
          <div>
            <input placeholder="🔍 Search Name..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={{...cardStyle, borderLeft: r.fee_status === 'Paid' ? '5px solid green' : '5px solid red'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <b>{r.student_name}</b> <br/>
                    <small>Roll: {r.roll_number} | Dues: {r.total_dues}</small>
                  </div>
                  <div style={{display:'flex', gap:'5px'}}>
                    <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{background:'#25D366', color:'white', padding:'5px', borderRadius:'5px', textDecoration:'none', fontSize:'12px'}}>WA</a>
                    <button onClick={() => { setEditingStudent(r); setName(r.student_name); setRollNo(r.roll_number); setWhatsapp(r.parent_whatsapp); setBaseFee(r.base_fee); setArrears(r.arrears); setView('add'); }} style={{background:'#f39c12', color:'white', border:'none', padding:'5px', borderRadius:'5px'}}>Edit</button>
                    <button onClick={async () => { if(window.confirm("Delete?")) { await deleteDoc(doc(db, "ali_campus_records", r.id)); fetchRecords('view', filterClass); } }} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px', borderRadius:'5px'}}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF SECTION */}
        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={async () => {
                await addDoc(collection(db, "staff_records"), { name: sName, role: sRole, salary: sSalary, password: sPass, created_at: serverTimestamp() });
                setSName(''); setSRole(''); setSSalary(''); setSPass(''); fetchStaff();
              }} style={actionBtn}>Register Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b> - {s.role} <br/> Salary: RS {s.salary} | Pass: {s.password}
              </div>
            ))}
          </div>
        )}

        {/* SELECT CLASS FOR ATTEN/DIR */}
        {(view === 'sel_view' || view === 'sel_att' || view === 'sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={() => {
              if(view === 'sel_view') fetchRecords('view', filterClass);
              else if(view === 'sel_att') fetchRecords('attendance', filterClass);
              else if(view === 'sel_report') { 
                // Report Logic
                const runReport = async () => {
                  const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
                  const snap = await getDocs(q);
                  const summary = {};
                  snap.docs.forEach(d => {
                    const data = d.data();
                    if(data.date.startsWith(selectedMonth)) {
                      Object.entries(data.attendance_data).forEach(([std, status]) => {
                        if(!summary[std]) summary[std] = {p:0, a:0};
                        status === 'P' ? summary[std].p++ : summary[std].a++;
                      });
                    }
                  });
                  setMonthlyData(Object.entries(summary)); setView('monthly_report');
                };
                runReport();
              }
            }} style={actionBtn}>Open</button>
          </div>
        )}

        {/* ATTENDANCE MARKING */}
        {view === 'attendance' && (
          <div>
            <h3>Marking: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', background: attendance[r.student_name] === 'P' ? '#eaffea' : attendance[r.student_name] === 'A' ? '#ffeaea' : '#fff'}}>
                <span>{r.student_name}</span>
                <div>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{background: attendance[r.student_name] === 'P' ? 'green' : '#ccc', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{background: attendance[r.student_name] === 'A' ? 'red' : '#ccc', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px', marginLeft:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button onClick={async () => {
              await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp(), marked_by: userRole });
              setAttendance({}); setView('dashboard');
            }} style={actionBtn}>Save Attendance</button>
          </div>
        )}

        {/* HISTORY */}
        {view === 'history' && (
          <div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span><b>{h.date}</b> ({h.class})</span>
                  <button onClick={() => {
                    const doc = new jsPDF();
                    doc.text(`Class: ${h.class} - Date: ${h.date}`, 10, 10);
                    doc.autoTable({ head: [['Student', 'Status']], body: Object.entries(h.attendance_data) });
                    doc.save(`Att_${h.date}.pdf`);
                  }} style={{background:'#1a4a8e', color:'#fff', border:'none', padding:'5px', borderRadius:'5px'}}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MONTHLY REPORT VIEW */}
        {view === 'monthly_report' && (
          <div style={cardStyle}>
            <h3>{filterClass} - {selectedMonth}</h3>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid #ccc'}}><th>Name</th><th>P</th><th>A</th></tr></thead>
              <tbody>
                {monthlyData.map(([name, stats]) => (
                  <tr key={name} style={{borderBottom:'1px solid #eee'}}>
                    <td>{name}</td><td style={{textAlign:'center'}}>{stats.p}</td><td style={{textAlign:'center'}}>{stats.a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setView('dashboard')} style={{...actionBtn, background:'#666'}}>Back</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '15px', background: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };

export default App;
