// 🔁 ONLY THESE PARTS UPDATED

// ✅ FIX 1: Stats useEffect (performance fix)
useEffect(() => { 
  if (isLoggedIn) fetchStats(); 
}, [isLoggedIn]); // ❌ removed view dependency


// =========================

// ✅ FIX 2: Attendance system (id based)

// 🔁 OLD:
// attendance[r.student_name]

// 🔁 NEW:
attendance[r.id]

// --- BUTTONS ---

// 🔁 OLD:
<button onClick={()=>setAttendance({...attendance, [r.student_name]:'P'})}

// 🔁 NEW:
<button onClick={()=>setAttendance({...attendance, [r.id]:'P'})}

// 🔁 OLD:
<button onClick={()=>setAttendance({...attendance, [r.student_name]:'A'})}

// 🔁 NEW:
<button onClick={()=>setAttendance({...attendance, [r.id]:'A'})}

// --- ACTIVE COLOR CHECK ---

// 🔁 OLD:
background:attendance[r.student_name]==='P'

// 🔁 NEW:
background:attendance[r.id]==='P'

// 🔁 OLD:
background:attendance[r.student_name]==='A'

// 🔁 NEW:
background:attendance[r.id]==='A'
