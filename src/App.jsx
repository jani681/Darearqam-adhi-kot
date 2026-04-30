import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, where, doc, deleteDoc, updateDoc } from "firebase/firestore"; 

const CLASSES = [
  "Playgroup", "Nursery", "KG", 
  "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", 
  "6th Class", "7th Class", "8th Class", "9th Class", "10th Class"
];

function App() {
  const [view, setView] = useState('dashboard');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [filterClass, setFilterClass] = useState(CLASSES[0]);
  const [image, setImage] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('System Online');
  const [totalCount, setTotalCount] = useState(0);
  const [editingId, setEditingId] = useState(null); // Edit mode ke liye

  // Dashboard count refresh
  useEffect(() => {
    const getCount = async () => {
      const snap = await getDocs(collection(db, "ali_campus_records"));
      setTotalCount(snap.size);
    };
    getCount();
  }, [view]);

  const fetchRecordsByClass = async (targetView, classToFilter) => {
    setStatus(`Loading ${classToFilter}...`);
    try {
      const q = query(collection(db, "ali_campus_records"), where("class", "==", classToFilter));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setStatus('Success');
      setView(targetView);
    } catch (err) { setStatus('Error'); }
  };

  const handleSaveOrUpdate = async () => {
    if(!name || !rollNo) return alert("Pehle details bharen!");
    try {
      setStatus('Processing...');
      if (editingId) {
        // UPDATE EXISTING STUDENT
        const studentRef = doc(db, "ali_campus_records", editingId);
        await updateDoc(studentRef, {
          student_name: name,
          roll_number: rollNo,
          class: selectedClass,
          photo_data: image || ""
        });
        alert("Student record updated!");
      } else {
        // ADD NEW STUDENT
        await addDoc(collection(db, "ali_campus_records"), {
          student_name: name,
          roll_number: rollNo,
          class: selectedClass,
          photo_data: image,
          created_at: serverTimestamp()
        });
        alert("New student registered!");
      }
      resetForm();
      setView('dashboard');
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleDelete = async (id, sName) => {
    if(window.confirm(`Kya aap waqai ${sName} ka record delete karna chahte hain?`)) {
      try {
        await deleteDoc(doc(db, "ali_campus_records", id));
        alert("Record Deleted!");
        fetchRecordsByClass('view', filterClass); // List refresh
      } catch (err) { alert("Delete failed!"); }
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setName(student.student_name);
    setRollNo(student.roll_number);
    setSelectedClass(student.class);
    setImage(student.photo_data);
    setView('add'); // Registration form ko hi edit ke liye use karenge
  };

  const resetForm = () => {
    setName(''); setRollNo(''); setImage(""); setEditingId(null);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a4a8e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2 style={{margin: 0}}>DAR-E-ARQAM (ALI CAMPUS)</h2>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => {setView('dashboard'); resetForm();}} style={navBtn}>Home</button>
          <button onClick={() => {setView('add'); resetForm();}} style={navBtn}>Admission</button>
          <button onClick={() => setView('select_class_view')} style={navBtn}>Directory</button>
          <button onClick={() => setView('select_class_att')} style={navBtn}>Attendance</button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {view === 'dashboard' && (
          <div style={{ textAlign: 'center' }}>
             <h3>Ali Campus Dashboard</h3>
             <div style={{display: 'flex', gap: '15px'}}>
                <div style={cardStyle}><h2>{totalCount}</h2><p>Students</p></div>
                <div style={cardStyle}><h2 style={{color: 'green'}}>Live</h2><p>Database</p></div>
             </div>
          </div>
        )}

        {view === 'add' && (
          <div style={cardStyle}>
            <h3>{editingId ? "Edit Student Details" : "New Registration"}</h3>
            <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} />
            <input placeholder="Roll No" value={rollNo} onChange={(e)=>setRollNo(e.target.value)} style={inputStyle} />
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" onChange={(e) => {
               const reader = new FileReader();
               reader.onloadend = () => setImage(reader.result);
               if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
            }} />
            <button onClick={handleSaveOrUpdate} style={actionBtn}>
              {editingId ? "Update Record" : "Save Student"}
            </button>
            {editingId && <button onClick={()=>{resetForm(); setView('dashboard');}} style={{...actionBtn, background: '#666', marginTop: '10px'}}>Cancel</button>}
          </div>
        )}

        {(view === 'select_class_view' || view === 'select_class_att') && (
          <div style={cardStyle}>
            <h3>Select Class</h3>
            <select value={filterClass} onChange={(e)=>setFilterClass(e.target.value)} style={inputStyle}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => fetchRecordsByClass(view === 'select_class_view' ? 'view' : 'attendance', filterClass)} style={actionBtn}>Open</button>
          </div>
        )}

        {view === 'view' && (
          <div>
            <h3>Records: {filterClass}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {records.map(r => (
                <div key={r.id} style={recordCard}>
                  <img src={r.photo_data || 'https://via.placeholder.com/100'} style={imgStyle} alt="student" />
                  <p style={{fontWeight: 'bold', margin: '5px 0'}}>{r.student_name}</p>
                  <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                    <button onClick={() => startEdit(r)} style={{...smallBtn, background: '#ffc107'}}>Edit</button>
                    <button onClick={() => handleDelete(r.id, r.student_name)} style={{...smallBtn, background: '#dc3545'}}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { padding: '8px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#1a4a8e' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flex: 1 };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '12px', backgroundColor: '#1a4a8e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const recordCard = { background: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #eee' };
const imgStyle = { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' };
const smallBtn = { padding: '5px 10px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px' };

export default App;
