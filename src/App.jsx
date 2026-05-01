import React, { useState } from 'react';

function App() {
  // 1. State setup (Taake inputs kaam karein)
  const [studentData, setStudentData] = useState({
    name: "",
    className: "",
    base_fee: "",
    arrears: ""
  });

  // 2. Handle Submit Function
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Saving Student:", studentData);
    // Yahan hum kal wala Firebase logic add karenge
  };

  return (
    <div className="app-container">
      <h1>Ali Campus Management</h1>
      
      <form onSubmit={handleSubmit}>
        {/* Purane fields (Name etc) yahan honge */}
        <input 
          placeholder="Student Name"
          onChange={(e) => setStudentData({...studentData, name: e.target.value})}
        />

        {/* --- Aapke Naye Fee Fields (Jo aapne add kiye thay) --- */}
        <div className="form-group">
          <label>Monthly Fee (RS)</label>
          <input 
            type="number" 
            placeholder="e.g. 2000"
            value={studentData.base_fee}
            onChange={(e) => setStudentData({...studentData, base_fee: e.target.value})}
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>Previous Balance (Arrears)</label>
          <input 
            type="number" 
            placeholder="e.g. 500"
            value={studentData.arrears}
            onChange={(e) => setStudentData({...studentData, arrears: e.target.value})}
            className="input-field"
          />
        </div>

        <button type="submit">Add Student</button>
      </form>
    </div>
  );
}

// Ye wo line hai jo miss hone se error aa raha tha
export default App;
