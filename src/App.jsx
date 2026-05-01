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
  
  // Student States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Staff States (New)
  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const today = new Date().toISOString().split('T')[0];

  // --- STAFF FUNCTIONS ---
  const fetchStaff = async () => {
    setStatus('Loading Staff...');
    try {
      const q = query(collection(db, "staff_records"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setStaffRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setView('staff_list');
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

  const handleAddStaff = async () => {
    if(!sName || !sPass) return alert("Name and Password are required");
    setStatus('Saving Staff...');
    try {
      await addDoc(collection(db, "staff_records"), {
        name: sName,
        role: sRole,
        salary: sSalary,
        password: sPass,
        created_at: serverTimestamp()
      });
      setSName(''); setSRole(''); setSSalary(''); setSPass('');
      fetchStaff();
    } catch (e) { setStatus('Error'); }
  };

  const deleteStaff = async (id) => {
    if(window.confirm("Delete this staff member?")) {
      await deleteDoc(doc(db, "staff_records", id));
      fetchStaff();
    }
  };

  // --- EXISTING FUNCTIONS ---
  const downloadPDF = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(26, 74, 142);
    doc.text("DAR-E-ARQAM (ALI CAMPUS)", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${record.class}`, 14, 25);
    doc.text(`Date: ${record.date}`, 14, 32);
    const tableRows = [];
    Object.entries(record.attendance_data).forEach(([stdName, stdStatus], index) => {
      tableRows.push([index + 1, stdName, stdStatus === 'P' ? 'Present' : 'Absent']);
    });
    doc.autoTable({
      startY: 40,
      head: [['Sr.', 'Student Name', 'Status']],
      body: tableRows,
      headStyles: { fillColor: [26, 74, 142] },
    });
    doc.save(`Attendance_${record.class}_${record.date}.pdf`);
  };

  const generateMonthlySummary = async (cls) => {
    setStatus(`Calculating ${cls}...`);
    try {
      const q = query(collection(db, "daily_attendance"), where("class", "==", cls));
      const snap = await getDocs(q);
      const summary = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.date && data.date.startsWith(selectedMonth)) {
          Object.entries(data.attendance_data).forEach(([stdName, stdStatus]) => {
            if (!summary[stdName]) summary[stdName] = { p: 0, a: 0 };
            if (stdStatus === 'P') summary[stdName].p++; else summary[stdName].a++;
          });
        }
      });
      setMonthlyData(Object.entries(summary));
      setView('monthly_report');
      setStatus('Success');
    } catch (e) { setStatus('Error'); }
  };

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
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleEdit = (r) => {
    setEditingStudent(r);
    setName(r.student_name);
    setRollNo(r.roll_number);
    setWhatsapp(r.parent_whatsapp);
    setBaseFee(r.base_fee || 0);
    setArrears(r.arrears || 0);
    setSelectedClass(r.class);
    setView('add');
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this student?")) {
      await deleteDoc(doc(db, "ali_campus_records", id));
      fetchRecordsByClass('view', filterClass);
    }
  };

  const getNavStyle = (targetView) => ({
    padding: '12px 5px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '10px',
    cursor: 'pointer',
    backgroundColor: view === targetView ? '#f39c12' : '#ffffff',
    color: '#1a4a8e',
    boxShadow: view === targetView ? 'inset 0 4px 6px rgba(0,0,0,0.2)' : '0 4px 0 #bdc3c7',
  });

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
          <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'white', padding: '2px' }} />
          <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '12px' }}>
          <button onClick={() => { setView('dashboard'); setEditingStudent(null); }} style={getNavStyle('dashboard')}>🏠 Home</button>
          <button onClick={() => { setView('add'); setEditingStudent(null); }} style={getNavStyle('add')}>📝 Admission</button>
          <button onClick={() => setView('sel_view')} style={getNavStyle('sel_view')}>📂 Directory</button>
          <button onClick={() => setView('sel_att')} style={getNavStyle('sel_att')}>✅ Attend</button>
          <button onClick={fetchStaff} style={getNavStyle('staff_list')}>👥 Staff</button>
          <button onClick={fetchHistory} style={getNavStyle('history')}>📜 History</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: 'auto' }}>
        <p style={{textAlign:'center', fontSize:'10px', color:'#666'}}>{status}</p>

        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => fetchRecordsByClass('view', c)} style={{...cardStyle, borderLeft:'5px solid #f39c12', cursor:'pointer'}}>
                <small style={{color:'#1a4a8e', fontWeight:'bold'}}>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF SECTION (New) */}
        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Staff Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle} />
              <input placeholder="Role (e.g. Science Teacher)" value={sRole} onChange={(e)=>setSRole(e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Monthly Salary" value={sSalary} onChange={(e)=>setSSalary(e.target.value)} style={inputStyle} />
              <input placeholder="Set Login Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle} />
              <button onClick={handleAddStaff} style={actionBtn}>Register Staff</button>
            </div>
            <h3>Current Staff</h3>
            {staffRecords.map(s => (
              <div key={s.id} style={{...cardStyle, borderLeft:'5px solid #1a4a8e'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <b>{s.name}</b> <br/>
                    <small>{s.role} | Salary: {s.salary}</small>
                  </div>
                  <button onClick={() => deleteStaff(s.id)} style={{background:'#dc3545', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'view' && (
          <div>
            <input placeholder="🔍 Search..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={inputStyle} />
            {records.filter(r => r.student_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
              <div key={r.id} style={{...cardStyle, borderLeft: r.fee_status === 'Paid' ? '5px solid #28a745' : '5px solid #dc3545'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <b>{r.student_name}</b> <br/> 
                    <small>Roll: {r.roll_number} | Dues: RS {r.total_dues || 0}</small>
                  </div>
                  <div style={{display:'flex', gap:'5px'}}>
                    <a href={`https://wa.me/${r.parent_whatsapp}`} target="_blank" rel="noreferrer" style={{padding:'5px', background:'#25D366', borderRadius:'5px', color:'white', textDecoration:'none', fontSize:'12px'}}>WA</a>
                    <button onClick={() => handleEdit(r)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Edit</button>
                    <button onClick={() => handleDelete(r.id)} style={{background:'#666', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>Del</button>
                    <button onClick={async () => { await updateDoc(doc(db, "ali_campus_records", r.id), { fee_status: r.fee_status === 'Paid' ? 'Unpaid' : 'Paid' }); fetchRecordsByClass('view', filterClass); }} style={{background: r.fee_status === 'Paid' ? '#28a745' : '#dc3545', color:'white', border:'none', borderRadius:'5px', padding:'5px'}}>{r.fee_status || 'Unpaid'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingStudent ? "Update Student" : "New Admission"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} style={inputStyle} />
            <div style={{display:'flex', gap:'10px'}}>
              <input type="number" placeholder="Monthly Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} style={inputStyle} />
            </div>
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={async () => { 
              const total = (Number(baseFee) || 0) + (Number(arrears) || 0);
              const data = { 
                student_name: name, roll_number: rollNo, parent_whatsapp: whatsapp, 
                class: selectedClass, base_fee: Number(baseFee) || 0, arrears: Number(arrears) || 0,
                total_dues: total, fee_status: editingStudent ? editingStudent.fee_status : 'Unpaid'
              };
              if(editingStudent) {
                await updateDoc(doc(db, "ali_campus_records", editingStudent.id), data);
              } else {
                await addDoc(collection(db, "ali_campus_records"), { ...data, created_at: serverTimestamp() });
              }
              setView('dashboard'); setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setEditingStudent(null);
            }} style={actionBtn}>{editingStudent ? "Update" : "Register"}</button>
          </div>
        )}

        {/* Other Views (Attendance, History, Reports) remain unchanged */}
        {view === 'attendance' && (
          <div>
            {records.map(r => (
              <div key={r.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', backgroundColor: attendance[r.student_name] === 'P' ? '#f0fff4' : attendance[r.student_name] === 'A' ? '#fff5f5' : 'white'}}>
                <span>{r.student_name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'P'})} style={{background: attendance[r.student_name] === 'P' ? '#28a745' : '#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>P</button>
                  <button onClick={() => setAttendance({...attendance, [r.student_name]: 'A'})} style={{background: attendance[r.student_name] === 'A' ? '#dc3545' : '#ccc', color:'white', border:'none', padding:'8px', borderRadius:'5px'}}>A</button>
                </div>
              </div>
            ))}
            <button disabled={Object.keys(attendance).length === 0} onClick={async () => { await addDoc(collection(db, "daily_attendance"), { class: filterClass, date: today, attendance_data: attendance, timestamp: serverTimestamp() }); setView('dashboard'); setAttendance({}); }} style={actionBtn}>Save</button>
          </div>
        )}

        {view === 'history' && (
          <div>
            {history.map(h => (
              <div key={h.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span><b>{h.date}</b> ({h.class})</span>
                  <button onClick={() => downloadPDF(h)} style={{background:'#1a4a8e', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px'}}>PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(view === 'sel_view' || view === 'sel_att') && (
          <div style={cardStyle}>
            <select onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'sel_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' };

export default App;
