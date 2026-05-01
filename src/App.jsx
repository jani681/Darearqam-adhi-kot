{/* Individual Fee Input */}
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

{/* Arrears/Previous Balance Input */}
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
