import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, updateDoc, deleteDoc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');

  // Data States
  const [records, setRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState([]);

  // Form States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [editingId, setEditingId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // --- PDF Export Logic ---
  const downloadPDF = (title, headers, bodyData, fileName) => {
    const doc = new jsPDF();
    doc.text("Ali Campus (Dar-e-Arqam)", 14, 15);
    doc.text(title, 14, 22);
    doc.autoTable({ head: [headers], body: bodyData, startY: 30 });
    doc.save(`${fileName}.pdf`);
  };

  // --- Master Sync (Stable Fetch) ---
  const syncSystem = async () => {
    if (!isLoggedIn) return;
    try {
      const sSnap = await getDocs(collection(db, "ali_campus_records"));
      const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const stats = {};
      allStudents.forEach(s => stats[s.class] = (stats[s.class] || 0) + 1);
      setClassStats(stats);

      if (view === 'view' || view === 'attendance') {
        setRecords(allStudents.filter(s => s.class === filterClass));
      }
      if (view === 'staff_list') {
        const stSnap = await getDocs(collection(db, "staff_records"));
        setStaffRecords(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (view === 'history') {
        const hSnap = await getDocs(query(collection(db, "daily_attendance"), orderBy("timestamp", "desc")));
        setHistory(hSnap.docs.map(d => d.data()));
      }
      if (view === 'report_final') {
        const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
        const rSnap = await getDocs(q);
        const reportMap = {};
        rSnap.docs.forEach(d => {
          const data = d.data();
          if (data.date?.startsWith(selectedMonth)) {
            Object.entries(data.attendance_data || {}).forEach(([n, s]) => {
              if (!reportMap[n]) reportMap[n] = { p: 0, a: 0 };
              s === 'P' ? reportMap[n].p++ : reportMap[n].a++;
            });
          }
        });
        setMonthlyData(Object.entries(reportMap));
      }
    } catch (e) { console.error("Sync Error:", e); }
  };

  useEffect(() => { syncSystem(); }, [isLoggedIn, view, filterClass, selectedMonth]);

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { setUserRole('admin'); setIsLoggedIn(true); return; }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { setStaffName(snap.docs[0].data().name); setUserRole('staff'); setIsLoggedIn(true); }
    else alert("Invalid Password");
  };

  const navBtnStyle = (v) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === v ? '#f39c12' : '#fff', color: '#1a4a8e', cursor: 'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width:'80px', background:'white', borderRadius:'50%', padding:'10px' }} />
      <h2 style={{color:'white', margin:'20px 0'}}>Ali Campus Portal</h2>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'15px', borderRadius:'10px', width:'250px', textAlign:'center'}} placeholder="Password" />
      <button onClick={handleLogin} style={{marginTop:'20px', padding:'15px 70px', background:'#f39c12', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center', color:'white' }}>
        <h4 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px', background:'#f0f2f5', padding:'10px', borderRadius:'15px' }}>
          <button onClick={() => setView('dashboard')} style={navBtnStyle('dashboard')}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => { setEditingId(null); setName(''); setRollNo(''); setView('add'); }} style={navBtnStyle('add')}>📝 Admit</button>}
          {userRole === 'admin' && <button onClick={() => setView('sel_view')} style={navBtnStyle('sel_view')}>📂 Dir</button>}
          <button onClick={() => setView('sel_att')} style={navBtnStyle('sel_att')}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={() => setView('staff_list')} style={navBtnStyle('staff_list')}>👥 Staff</button>}
          <button onClick={() => setView('history')} style={navBtnStyle('history')}>📜 Hist</button>
          {userRole === 'admin' && <button onClick={() => setView('sel_report')} style={navBtnStyle('sel_report')}>📊 Reprt</button>}
          <button onClick={() => setIsLoggedIn(false)} style={navBtnStyle('out')}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
             {userRole === 'staff' && <button style={{gridColumn:'span 2', padding:'18px', background:'#2ecc71', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', marginBottom:'10px'}}>📍 MARK ATTENDANCE</button>}
             {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_att'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingId ? 'Edit Student' : 'Admission'}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll Number" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <input placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
            <button onClick={async () => {
              const data = { student_name:name, roll_number:rollNo, parent_whatsapp:whatsapp, class:filterClass, base_fee:Number(baseFee), arrears:Number(arrears) };
              editingId ? await updateDoc(doc(db,"ali_campus_records", editingId), data) : await addDoc(collection(db,"ali_campus_records"), {...data, timestamp:serverTimestamp()});
              alert("Saved!"); setView('dashboard');
            }} style={actionBtn}>Confirm Record</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <h3>{filterClass} Directory</h3>
            {records.map(r => (
              <div key={r.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <b>{r.student_name}</b>
                  <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" style={{color:'#25D366', fontWeight:'bold', textDecoration:'none'}}>WhatsApp</a>
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                  <button onClick={()=>{ setEditingId(r.id); setName(r.student_name); setRollNo(r.roll_number); setView('add'); }} style={{flex:1, padding:'8px', background:'#f39c12', color:'white', border:'none', borderRadius:'5px'}}>Edit</button>
                  <button onClick={async ()=>{ if(window.confirm("Delete?")) await deleteDoc(doc(db,"ali_campus_records",r.id)); syncSystem(); }} style={{flex:1, padding:'8px', background:'#e74c3c', color:'white', border:'none', borderRadius:'5px'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'report_final' && (
          <div style={cardStyle}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
              <h4 style={{margin:0}}>{filterClass} Report</h4>
              <button onClick={()=>downloadPDF("Monthly Report", ["Student", "P", "A"], monthlyData.map(([n,s])=>[n,s.p,s.a]), "Report")} style={{background:'#1a4a8e', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px'}}>PDF</button>
            </div>
            <table style={{width:'100%', textAlign:'left'}}>
              <thead><tr><th>Name</th><th>P</th><th>A</th></tr></thead>
              <tbody>{monthlyData.map(([n,s]) => <tr key={n}><td>{n}</td><td>{s.p}</td><td>{s.a}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {(view==='sel_view'||view==='sel_att'||view==='sel_report') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {view === 'sel_report' && <input type="month" value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={inputStyle} />}
            <button onClick={()=>setView(view==='sel_view'?'view':view==='sel_report'?'report_final':'attendance')} style={actionBtn}>Proceed</button>
          </div>
        )}

      </div>
    </div>
  );
}

const cardStyle = { background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginBottom:'10px', borderLeft:'6px solid #f39c12' };
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold' };

export default App;
