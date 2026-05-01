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
  const [classStats, setClassStats] = useState({});
  
  // Student Input States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Staff States
  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- PDF GENERATION LOGIC ---
  const exportPDF = (headers, data, fileName, title) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 14, 15);
    doc.setFontSize(12);
    doc.text(title, 14, 25);
    doc.autoTable({
      head: [headers],
      body: data,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillStyle: '#1a4a8e' }
    });
    doc.save(`${fileName}.pdf`);
  };

  const downloadHistoryPDF = () => {
    const data = history.map(h => [h.date, h.class]);
    exportPDF(['Date', 'Class'], data, 'Attendance_History', 'Full Attendance History');
  };

  const downloadReportPDF = () => {
    const data = monthlyData.map(([name, stats]) => [name, stats.p, stats.a]);
    exportPDF(['Student Name', 'Present (P)', 'Absent (A)'], data, `${filterClass}_Report_${selectedMonth}`, `${filterClass} - ${selectedMonth} Summary`);
  };

  // --- CORE FUNCTIONS ---
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
      {/* Header & Nav */}
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
          <button onClick={() => setIsLoggedIn(false)} style={getNavStyle('logout')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
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
            <h3>{editingStudent ? "Edit Student" : "New Admission"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp (923...)" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Baqaya" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
              const d = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:selectedClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingStudent ? await updateDoc(doc(db,"ali_campus_records",editingStudent.id), d) : await addDoc(collection(db,"ali_campus_records"), {...d, created_at:serverTimestamp()});
              alert("Saved!"); setView('dashboard'); clearInputs();
            }} style={actionBtn}>Save Record</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="Search..." onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r=>r.student_name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{color:'#25D366', textDecoration:'none', fontWeight:'bold'}}>🟢 WhatsApp</a>
                </div>
                <div style={{fontSize:'12px', marginTop:'5px'}}>Roll: {r.roll_number} | Fee: {r.base_fee} | Baqaya: {r.arrears || 0}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
               <h3 style={{margin:0}}>Attendance History</h3>
               <button onClick={downloadHistoryPDF} style={{background:'#273c75', color:'white', border:'none', padding:'8px 12px', borderRadius:'8px', fontSize:'12px'}}>📥 PDF</button>
            </div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}><b>{h.date}</b> - {h.class}</div>
            ))}
          </div>
        )}

        {view === 'monthly_report' && (
          <div style={cardStyle}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
               <h4 style={{margin:0}}>{filterClass} ({selectedMonth})</h4>
               <button onClick={downloadReportPDF} style={{background:'#273c75', color:'white', border:'none', padding:'8px 12px', borderRadius:'8px', fontSize:'12px'}}>📥 Download PDF</button>
             </div>
             <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
               <thead><tr style={{background:'#f0f2f5'}}><th style={{padding:'8px', textAlign:'left'}}>Student</th><th>P</th><th>A</th></tr></thead>
               <tbody>{monthlyData.map(([n,s])=>(<tr key={n} style={{borderBottom:'1px solid #eee'}}><td style={{padding:'8px'}}>{n}</td><td style={{textAlign:'center', color:'green'}}>{s.p}</td><td style={{textAlign:'center', color:'red'}}>{s.a}</td></tr>))}</tbody>
             </table>
             <button onClick={()=>setView('dashboard')} style={{...actionBtn, marginTop:'20px'}}>Close Report</button>
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Options</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={async ()=> {
              if(view==='sel_report') {
                const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
                const snap = await getDocs(q);
                const summary = {};
                snap.docs.forEach(d => {
                  const data = d.data();
                  if (data.date?.startsWith(selectedMonth)) {
                    Object.entries(data.attendance_data).forEach(([std, stat]) => {
                      if (!summary[std]) summary[std] = { p: 0, a: 0 };
                      stat === 'P' ? summary[std].p++ : summary[std].a++;
                    });
                  }
                });
                setMonthlyData(Object.entries(summary));
                setView('monthly_report');
              } else {
                const q = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
                const snap = await getDocs(q);
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setView(view==='sel_view'?'view':'attendance');
              }
            }} style={actionBtn}>Proceed</button>
          </div>
        )}

        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h4>Add Staff</h4>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input placeholder="Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={async ()=>{
                await addDoc(collection(db,"staff_records"),{name:sName, role:sRole, salary:sSalary, password:sPass, created_at:serverTimestamp()});
                alert("Staff Added"); setSName(''); setSPass('');
              }} style={actionBtn}>Add Member</button>
            </div>
            {staffRecords.map(s => <div key={s.id} style={cardStyle}><b>{s.name}</b> ({s.role}) - Sal: {s.salary}</div>)}
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
