// Is hissay ko 'sel_report' wale logic mein update karein:

const qRec = query(collection(db, "ali_campus_records"), where("class", "==", filterClass));
const recSnap = await getDocs(qRec);
const studentMap = {};

// 1. Pehle saare students ka data map kar lein
recSnap.docs.forEach(d => { 
    studentMap[d.id] = { 
        name: d.data().student_name || "Unknown", 
        roll: d.data().roll_number || "---" 
    }; 
});

// 2. Attendance fetch karein
const q = query(collection(db, "daily_attendance"), where("class", "==", filterClass));
const snap = await getDocs(q);
const summary = {};

snap.docs.forEach(d => {
    const data = d.data();
    if (data.date?.startsWith(selectedMonth)) {
        Object.entries(data.attendance_data).forEach(([id, stat]) => {
            // Agar ID map mein nahi milti toh fallback data use karein
            const stdInfo = studentMap[id] || { name: "ID: " + id.substring(0,5), roll: "N/A" };
            const key = JSON.stringify(stdInfo); 
            if (!summary[key]) summary[key] = { p: 0, a: 0 };
            stat === 'P' ? summary[key].p++ : summary[key].a++;
        });
    }
});
