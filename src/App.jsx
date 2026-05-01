import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc } from "firebase/firestore"; 

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
  const [classStats, setClassStats] = {};

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

  const today = new Date().toISOString().split('T')[0];

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
    snap.docs.forEach(d => { 
      const cls = d.data().class; 
      stats[cls] = (stats[cls] || 0) + 1; 
    });
    setClassStats(stats);
  };

  // ✅ FIXED useEffect
  useEffect(() => { 
    if (isLoggedIn) fetchStats(); 
  }, [isLoggedIn]);

  const clearInputs = () => {
    setName(''); setRollNo(''); setWhatsapp(''); setBaseFee(''); setArrears(''); setEditingStudent(null);
  };

  const getNavStyle = (t) => ({
    padding: '12px 5px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '10px',
    backgroundColor: view === t ? '#f39c12' : '#ffffff', color: '#1a4a8e', boxShadow: '0 4px 0 #bdc3c7', cursor:'pointer'
  });

  if (!isLoggedIn) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', backgroundColor:'#1a4a8e', color:'white' }}>
      <h3>Ali Campus Login</h3>
      <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} />
      <button onClick={handleLogin}>LOGIN</button>
    </div>
  );

  return (
    <div style={{ padding: '15px' }}>
      
      {view === 'dashboard' && (
        <div>
          <button onClick={() => setView('add')}>Add</button>
          {CLASSES.map(c => (
            <div key={c} onClick={async () => {
              setFilterClass(c);
              const q = query(collection(db, "ali_campus_records"), where("class", "==", c));
              const snap = await getDocs(q);
              setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
              setView('attendance');
            }}>
              {c} ({classStats[c] || 0})
            </div>
          ))}
        </div>
      )}

      {view === 'add' && (
        <div>
          <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} />
          <button onClick={async () => {
            await addDoc(collection(db,"ali_campus_records"), { student_name:name, roll_number:rollNo });
            setView('dashboard');
          }}>Save</button>
        </div>
      )}

      {view === 'attendance' && (
        <div>
          {records.map(r => (
            <div key={r.id}>
              {r.student_name}

              <button 
                onClick={() => setAttendance({ ...attendance, [r.id]: 'P' })}
                style={{ background: attendance[r.id] === 'P' ? 'green' : 'gray' }}
              >
                P
              </button>

              <button 
                onClick={() => setAttendance({ ...attendance, [r.id]: 'A' })}
                style={{ background: attendance[r.id] === 'A' ? 'red' : 'gray' }}
              >
                A
              </button>
            </div>
          ))}

          <button onClick={async ()=>{
            await addDoc(collection(db,"daily_attendance"), {
              class: filterClass,
              date: today,
              attendance_data: attendance,
              timestamp: serverTimestamp()
            });
            alert("Saved");
            setView('dashboard');
          }}>
            Submit
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
