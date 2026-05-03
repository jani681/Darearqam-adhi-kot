import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, getDocs, serverTimestamp, query, 
  orderBy, where, updateDoc, deleteDoc, doc 
} from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; 

function App() {
  // --- CORE SYSTEM STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [staffName, setStaffName] = useState(''); 
  const [passInput, setPassInput] = useState('');
  const [view, setView] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [history, setHistory] = useState([]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [status, setStatus] = useState('Online');
  const [classStats, setClassStats] = useState({});
  
  // --- STUDENT & STAFF STATES ---
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [whatsapp, setWhatsapp] = useState(''); // Parent WhatsApp
  const [sWhatsapp, setSWhatsapp] = useState(''); // Staff WhatsApp
  const [baseFee, setBaseFee] = useState('');
  const [arrears, setArrears] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [staffRecords, setStaffRecords] = useState([]);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPass, setSPass] = useState('');

  // --- PARENT PORTAL STATES ---
  const [parentPortalActive, setParentPortalActive] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [portalResults, setPortalResults] = useState([]);

  // --- UI & ANALYTICS STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [adminAnalytics, setAdminAnalytics] = useState({ totalStudents: 0, totalStaff: 0, pendingLeaves: 0 });

  const today = new Date().toISOString().split('T')[0];

  // ===== DATA FETCHING =====
  useEffect(() => {
    if (isLoggedIn) fetchStats();
  }, [isLoggedIn, view]);

  useEffect(() => {
    if (parentPortalActive) fetchPortalData();
  }, [parentPortalActive]);

  const fetchPortalData = async () => {
    try {
      const annSnap = await getDocs(query(collection(db, "announcements"), orderBy("date", "desc")));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const resSnap = await getDocs(collection(db, "results"));
      setPortalResults(resSnap.docs.map(d => d.data()));
    } catch (e) { console.error("Portal fetch error", e); }
  };

  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => { const cls = d.data().class; stats[cls] = (stats[cls] || 0) + 1; });
    setClassStats(stats);
    if (userRole === 'admin') {
      const staffSnap = await getDocs(collection(db, "staff_records"));
      setAdminAnalytics({ totalStudents: snap.size, totalStaff: staffSnap.size });
    }
  };

  // ===== AUTH LOGIC =====
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) { 
      setUserRole('admin'); setIsLoggedIn(true); return; 
    }
    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);
    if (!snap.empty) { 
      setStaffName(snap.docs[0].data().name); 
      setUserRole('staff'); setIsLoggedIn(true); 
    } else alert("Invalid Credentials");
  };

  // ===== COMPONENTS =====
  const ParentPortalView = () => (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <nav style={{ background: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <b style={{ color: '#1a4a8e' }}>ALI CAMPUS PORTAL</b>
        <button onClick={() => setParentPortalActive(false)} style={{ border: 'none', background: '#1a4a8e', color: 'white', padding: '5px 15px', borderRadius: '5px' }}>Exit</button>
      </nav>
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#1a4a8e' }}>School Announcements</h2>
        {announcements.map(ann => (
          <div key={ann.id} style={cardStyle}>
            <small style={{ color: '#f39c12' }}>{ann.date}</small>
            <h4>{ann.title}</h4>
            <p>{ann.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (parentPortalActive) return <ParentPortalView />;

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <img src="https://dar-e-arqam.org.pk/wp-content/uploads/2021/04/Logo.png" alt="Logo" style={{ width: '80px', background:'white', padding:'5px', borderRadius:'50%', marginBottom:'10px' }} />
      <h3>Ali Campus Management</h3>
      <input type="password" placeholder="Enter Password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} style={{padding:'12px', borderRadius:'8px', width:'250px', textAlign:'center'}} />
      <button onClick={handleLogin} style={{marginTop:'15px', padding:'12px 60px', background:'#f39c12', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>LOGIN</button>
      <button onClick={() => setParentPortalActive(true)} style={{marginTop:'10px', background:'transparent', color:'white', border:'1px solid white', padding:'8px 30px', borderRadius:'8px', fontSize:'12px'}}>VIEW PARENT PORTAL</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      {/* HEADER & NAV */}
      <div style={{ backgroundColor: '#1a4a8e', padding: '15px', textAlign: 'center', color:'white' }}>
        <h3 style={{margin:0}}>DAR-E-ARQAM (ALI CAMPUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop:'15px' }}>
          <button onClick={() => setView('dashboard')} style={navBtnStyle}>🏠 Home</button>
          {userRole === 'admin' && <button onClick={() => setView('add')} style={navBtnStyle}>📝 Admit</button>}
          <button onClick={() => setView('sel_att')} style={navBtnStyle}>✅ Atten</button>
          {userRole === 'admin' && <button onClick={async () => {
             const s = await getDocs(collection(db, "staff_records"));
             setStaffRecords(s.docs.map(d=>({id:d.id, ...d.data()})));
             setView('staff_list');
          }} style={navBtnStyle}>👥 Staff</button>}
          <button onClick={() => setIsLoggedIn(false)} style={navBtnStyle}>🚪 Out</button>
        </div>
      </div>

      <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto' }}>
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            {CLASSES.map(c => (
              <div key={c} onClick={() => { setFilterClass(c); setView('sel_view'); }} style={cardStyle}>
                <small>{c}</small>
                <div style={{fontSize:'20px', fontWeight:'bold'}}>{classStats[c] || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF LIST & WHATSAPP INTEGRATION */}
        {view === 'staff_list' && (
          <div>
            <div style={cardStyle}>
              <h3>Add New Staff</h3>
              <input placeholder="Name" value={sName} onChange={(e)=>setSName(e.target.value)} style={inputStyle}/>
              <input placeholder="Password" value={sPass} onChange={(e)=>setSPass(e.target.value)} style={inputStyle}/>
              <input placeholder="WhatsApp (92300xxxxxxx)" value={sWhatsapp} onChange={(e)=>setSWhatsapp(e.target.value)} style={inputStyle}/>
              <button onClick={async ()=>{
                await addDoc(collection(db, "staff_records"), {name:sName, password:sPass, whatsapp:sWhatsapp});
                setSName(''); setSPass(''); setSWhatsapp('');
                alert("Staff Added");
              }} style={actionBtn}>Save Staff</button>
            </div>
            {staffRecords.map(s => (
              <div key={s.id} style={cardStyle}>
                <b>{s.name}</b>
                {s.whatsapp && (
                  <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" style={{color:'#25D366', marginLeft:'10px', textDecoration:'none', fontWeight:'bold'}}>📱 WhatsApp</a>
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
const inputStyle = { width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', border:'1px solid #ddd', boxSizing:'border-box' };
const actionBtn = { width:'100%', padding:'15px', background:'#1a4a8e', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold' };
const navBtnStyle = { padding: '10px 5px', borderRadius: '8px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' };

export default App;
