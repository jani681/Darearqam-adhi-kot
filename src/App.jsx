import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // --- PDF GENERATION LOGIC ---
  const downloadPDF = (record) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(26, 74, 142);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${record.class}`, 14, 25);
    doc.text(`Date: ${record.date}`, 14, 32);
    
    const tableRows = [];
    Object.entries(record.attendance_data).forEach(([name, status], index) => {
      tableRows.push([index + 1, name, status === 'P' ? 'Present' : 'Absent']);
    });

    doc.autoTable({
      startY: 40,
      head: [['Sr.', 'Student Name', 'Status']],
      body: tableRows,
      headStyles: { fillColor: [26, 74, 142] },
      alternateRowStyles: { fillColor: [240, 242, 245] },
    });

    doc.save(`Attendance_${record.class}_${record.date}.pdf`);
  };

  const getNavStyle = (targetView) => ({
    padding: '12px 5px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
    backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e',
    transform: view === targetView ? 'translateY(2px)' : 'none',
  });

  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      const stats = {};
      snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
      setClassStats(stats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isLoggedIn) fetchStats(); }, [isLoggedIn, view]);

  const fetchHistory = async () => {
    setStatus('Loading History...');
    try {
      const q = query(collection(db, "daily_attendance"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setView('history');
      setStatus('Success');
    } catch (err) { setStatus('Error'); }
  };

  const fetchRecordsByClass = async (target, cls) => {
    setStatus(`Opening ${cls}...`);
    try {
      setFilterClass(cls);
      const q = query(collection(db, "ali_campus_records"), where("class", "==", cls));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView(target);
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'10px', borderRadius:'5px'}} />
      <button onClick={() => passInput === ADMIN_PASSWORD ? setIsLoggedIn(true) : alert("Wrong Password")} style={{marginTop:'10px', padding:'10px 20px', borderRadius:'5px', border:'none', background:'white', color:'#1a4a8e', fontWeight:'bold'}}>Login</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <img 
            src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" 
            alt="Logo" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'white', padding: '2px', objectFit: 'contain' }} 
            onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/167/167707.png" }}
          />
          <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          <button onClick={() => setView('dashboard')} style={getNavStyle('dashboard')}>🏠 Home</button>
          <button onClick={() => setView('add')} style={getNavStyle('add')}>📝 Admission</button>
          <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Directory</button>
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Attend</button>
          <button onClick={fetchHistory} style={getNavStyle('history')}>📜 History</button>
          <button onClick={() => setIsLoggedIn(false)} style={{...getNavStyle('logout'), backgroundColor:'#fab1a0', color:'#d63031', boxShadow:'0 4px 0 #e17055'}}>🚪 Logout</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign:'center', fontSize:'10px', color:'#666', marginBottom:'10px'}}>{status}</p>

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            {CLASSES.map(c => (
              <div key={c} 
                   onClick={() => fetchRecordsByClass('view', c)} 
                   style={{...cardStyle, cursor:'pointer', borderLeft:'5px solid #f39c12'}}
                   onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                   onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'22px', fontWeight:'bold', marginTop:'5px'}}>{classStats[c] || 0}</div>
                <div style={{fontSize:'10px', color:'#999', textAlign:'right'}}>View List →</div>
              </div>
            ))}
          </div>
        )}

        {view === 'view' && !editingStudent && (
          <div>
            <input placeholder="🔍 Search Students..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={{
                  ...cardStyle, 
                  backgroundColor: r.fee_status === 'Paid' ? '#f0fff4' : '#fff5f5', 
                  borderLeft: r.fee_status === 'Paid' ? '5px solid #28a745' : '5px solid #dc3545'
              }}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div><b>{r.student_name}</b> <br/> <small>Roll: {r.roll_number}</small></div>
                  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                    <button onClick={async () => { await updateDoc(doc(db, "ali_campus_records", r.id), { fee_status: r.fee_status === 'Paid' ? 'Unpaid' : 'Paid' }); fetchRecordsByClass('view', filterClass); }} style={{padding:'4px 8px', fontSize:'10px', background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'5px'}}>{r.fee_status || 'Unpaid'}</button>
                    <a href={`https://wa.me/${r.parent_whatsapp}?text=${encodeURIComponent(`Dear Parent, your child ${r.student_name}'s fee is ${r.fee_status || 'Unpaid'}. Regards: Ali Campus.`)}`} target="_blank" rel="noreferrer" style={{background:'#25D366', color:'white', padding:'4px 8px', borderRadius:'5px', textDecoration:'none', fontSize:'10px', textAlign:'center'}}>WhatsApp</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div>
            <h3 style={{textAlign:'center'}}>Marking: {filterClass}</h3>
            {records.map(r => (
              <div key={r.id} style={{
                  ...cardStyle, 
                  display:'flex', 
                  justifyContent:'space-between',
                  backgroundColor: attendance[r.student_name] === 'P' ? '#f0fff4' : attendance[r.student_name] === 'A' ? '#fff5f5' : 'white',
                  borderRight: attendance[r.student_name] === 'P' ? '8px solid #28a745' : attendance[r.student_name] === 'A' ? '8px solid #dc3545' : 'none'
              }}>
                <span style={{fontWeight:'bold'}}>{r.student_name}</span>
                <div style={{display:'flex', gap:'8px'}}>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{...statusBtn, backgroundColor: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc'}}>A</button>
                </div>
              </div>
            ))}
            <button disabled={Object.keys(attendance).length === 0} onClick={async () => { await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() }); setView('dashboard'); setAttendance({}); }} style={actionBtn}>Submit Attendance</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            <h3>Reports Archive</h3>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><b>{h.date}</b><br/><small>{h.class}</small></div>
                  <button onClick={() => downloadPDF(h)} style={{background:'#1a4a8e', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', boxShadow:'0 3px 0 #0d2a54'}}>📥 PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>Admission</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => { await addDoc(collection(db, "ali_campus_records"), { student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, class: selectedClass, fee_status: 'Unpaid', created_at: serverTimestamp() }); setView('dashboard'); setName(''); setRollNo(''); setWhatsapp(''); }} style={actionBtn}>Register Student</button>
          </div>
        )}

        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open Class</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '12px' };
const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '15px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop:'10px', boxShadow:'0 4px 0 #0d2a54' };
const statusBtn = { padding: '10px 20px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' };

export default App;
