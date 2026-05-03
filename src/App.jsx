import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore"; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CLASSES = ["Playgroup", "Nursery", "KG", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"];
const ADMIN_PASSWORD = "ali786"; 
const SCHOOL_COORDS = { lat: 32.1072678, lng: 71.8037100 }; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');   // ✅ FIX ADDED
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
      startY: 40
    });

    doc.save(`${fileName}.pdf`);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1*Math.PI/180) *
      Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2) *
      Math.sin(dLon/2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const handleTeacherAttendance = () => {
    if (!navigator.geolocation) return alert("Location not supported");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = calculateDistance(
        pos.coords.latitude,
        pos.coords.longitude,
        SCHOOL_COORDS.lat,
        SCHOOL_COORDS.lng
      );

      if (dist <= 500) {
        await addDoc(collection(db, "teacher_attendance"), {
          name: staffName,
          date: today,
          time: new Date().toLocaleTimeString(),
          timestamp: serverTimestamp(),
          distance: Math.round(dist) + "m"
        });

        alert("Attendance Marked!");
      } else {
        alert("Too far!");
      }
    });
  };

  const handleLogin = async () => {
    if (passInput === ADMIN_PASSWORD) {
      setUserRole('admin');
      setIsLoggedIn(true);
      return;
    }

    const q = query(collection(db, "staff_records"), where("password", "==", passInput));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const user = snap.docs[0];
      setStaffName(user.data().name);
      setStaffId(user.id); // ✅ FIX IMPORTANT
      setUserRole('staff');
      setIsLoggedIn(true);
    } else {
      alert("Wrong Password!");
    }
  };

  const clearInputs = () => {
    setName('');
    setRollNo('');
    setWhatsapp('');
    setBaseFee('');
    setArrears('');
    setEditingStudent(null);
  };

  const getNavStyle = (t) => ({
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: view === t ? '#f39c12' : '#fff',
    color: '#1a4a8e'
  });

  // ================= MAIN RETURN =================

  if (!isLoggedIn) {
    return (
      <div style={{textAlign:'center', marginTop:'100px'}}>
        <h2>Login</h2>
        <input type="password" value={passInput} onChange={(e)=>setPassInput(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div>

      {/* ================= STAFF DASHBOARD ================= */}
      {userRole === 'staff' && view === 'dashboard' && (
        <div>
          <button onClick={handleTeacherAttendance}>Mark Attendance</button>

          {/* ✅ FIXED BUTTON */}
          <button
            onClick={async () => {
              let profile = {
                name: staffName,
                role: "Teacher",
                salary: "N/A"
              };

              try {
                if (staffId) {
                  const ref = doc(db, "staff_records", staffId);
                  const snap = await getDoc(ref);
                  if (snap.exists()) profile = snap.data();
                }
              } catch (e) {}

              setMyProfileData(profile);

              const q = query(
                collection(db, "teacher_attendance"),
                where("name", "==", staffName)
              );

              const snap = await getDocs(q);
              setMyAttendanceRecords(snap.docs.map(d => d.data()));

              setView('teacher_profile_view');
            }}
          >
            👤 View My Profile
          </button>
        </div>
      )}

      {/* ================= PROFILE VIEW ================= */}
      {view === 'teacher_profile_view' && myProfileData && (
        <div>
          <h2>{myProfileData.name}</h2>
          <p>{myProfileData.role}</p>
          <p>{myProfileData.salary}</p>

          <h3>Attendance</h3>
          {myAttendanceRecords.map((r,i)=>(
            <div key={i}>
              {r.date} - {r.time}
            </div>
          ))}

          <button onClick={()=>setView('dashboard')}>
            Back
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
