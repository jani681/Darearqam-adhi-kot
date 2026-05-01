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

  const today = new Date().toISOString().split('T')[0];

  // --- LOCATION ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const handleTeacherAttendance = () => {
    if (!navigator.geolocation) return alert("Location not supported");
    setStatus('Checking...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = calculateDistance(
        pos.coords.latitude,
        pos.coords.longitude,
        SCHOOL_COORDS.lat,
        SCHOOL_COORDS.lng
      );

      if (dist <= 600) { // increased tolerance
        await addDoc(collection(db, "teacher_attendance"), {
          name: staffName,
          date: today,
          time: new Date().toLocaleTimeString(),
          timestamp: serverTimestamp(),
          distance: Math.round(dist) + "m"
        });
        alert("Attendance Marked!");
        setStatus('Done');
      } else {
        alert(`Too far! ${Math.round(dist)}m`);
        setStatus('Out of Range');
      }
    }, () => alert("Enable Location Access!"));
  };

  // --- LOGIN ---
  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }

    try {
      const q = query(collection(db, "staff_records"), where("password", "==", passInput));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setStaffName(snap.docs[0].data().name);
        setUserRole('staff');
        setIsLoggedIn(true);
      } else {
        alert("Wrong Password!");
      }
    } catch {
      alert("Login Error");
    }
  };

  // --- STATS ---
  const fetchStats = async () => {
    const snap = await getDocs(collection(db, "ali_campus_records"));
    const stats = {};
    snap.docs.forEach(d => {
      const cls = d.data().class;
      stats[cls] = (stats[cls] || 0) + 1;
    });
    setClassStats(stats);
  };

  useEffect(() => {
    if (isLoggedIn) fetchStats();
  }, [isLoggedIn]); // optimized

  const clearInputs = () => {
    setName('');
    setRollNo('');
    setWhatsapp('');
    setBaseFee('');
    setArrears('');
    setEditingStudent(null);
  };

  // --- SAVE STUDENT ---
  const saveStudent = async () => {
    if (!name || !rollNo) return alert("Fill Name & Roll No");
    if (baseFee < 0 || arrears < 0) return alert("Invalid Fee");

    const data = {
      student_name: name,
      roll_number: rollNo,
      parent_whatsapp: whatsapp,
      class: selectedClass,
      base_fee: Number(baseFee),
      arrears: Number(arrears)
    };

    try {
      if (editingStudent) {
        await updateDoc(doc(db, "ali_campus_records", editingStudent.id), data);
      } else {
        await addDoc(collection(db, "ali_campus_records"), {
          ...data,
          created_at: serverTimestamp()
        });
      }

      alert("Saved!");
      clearInputs();
      setView('dashboard');
    } catch {
      alert("Error saving");
    }
  };

  // --- DELETE FIX ---
  const deleteStudent = async (id) => {
    if (!window.confirm("Delete?")) return;
    await deleteDoc(doc(db, "ali_campus_records", id));
    setRecords(records.filter(r => r.id !== id)); // instant UI update
  };

  if (!isLoggedIn) {
    return (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
        <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div style={{padding:'10px'}}>

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <>
          <button onClick={()=>setView('add')}>Add</button>

          {CLASSES.map(c => (
            <div key={c} onClick={async ()=>{
              const q = query(collection(db,"ali_campus_records"), where("class","==",c));
              const snap = await getDocs(q);
              setRecords(snap.docs.map(d=>({id:d.id,...d.data()})));
              setFilterClass(c);
              setView('view');
            }}>
              {c} ({classStats[c] || 0})
            </div>
          ))}
        </>
      )}

      {/* ADD */}
      {view === 'add' && (
        <>
          <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input placeholder="Roll" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} />
          <input placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} />
          <input type="number" placeholder="Fee" value={baseFee} onChange={(e)=>setBaseFee(e.target.value)} />
          <input type="number" placeholder="Arrears" value={arrears} onChange={(e)=>setArrears(e.target.value)} />

          <button onClick={saveStudent}>Save</button>
        </>
      )}

      {/* VIEW */}
      {view === 'view' && (
        <>
          {records.map(r => (
            <div key={r.id}>
              {r.student_name}

              <a
                href={`https://wa.me/${r.parent_whatsapp}?text=Your child attendance update`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>

              <button onClick={()=>deleteStudent(r.id)}>Delete</button>
            </div>
          ))}
        </>
      )}

      {/* ATTENDANCE FIXED */}
      {view === 'attendance' && (
        <>
          {records.map(r => (
            <div key={r.id}>
              {r.student_name}

              <button onClick={()=>setAttendance({...attendance, [r.id]:'P'})}>P</button>
              <button onClick={()=>setAttendance({...attendance, [r.id]:'A'})}>A</button>
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
        </>
      )}

    </div>
  );
}

export default App;
