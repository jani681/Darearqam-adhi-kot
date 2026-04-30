// --- Updated Navigation Styles ---
const getNavStyle = (currentView, targetView) => ({
  padding: '12px 5px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flex: '1',
  minWidth: '80px',
  // Keyboard depth effect
  boxShadow: currentView === targetView 
    ? 'inset 0 4px 6px rgba(0,0,0,0.2)' 
    : '0 4px 0 #bdc3c7',
  // Active vs Inactive Colors
  backgroundColor: currentView === targetView ? '#f39c12' : '#ecf0f1',
  color: currentView === targetView ? 'white' : '#2c3e50',
  transform: currentView === targetView ? 'translateY(2px)' : 'none',
});

// --- Inside your Return (Top Header Section) ---
<div style={{ backgroundColor: '#1a4a8e', padding: '15px 10px', textAlign: 'center' }}>
  <h2 style={{ color: 'white', marginBottom: '15px', fontSize: '20px' }}>DAR-E-ARQAM (ALI CAMPUS)</h2>
  
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3, 1fr)', 
    gap: '8px', 
    backgroundColor: '#dfe6e9', 
    padding: '10px', 
    borderRadius: '12px' 
  }}>
    <button onClick={() => setView('dashboard')} style={getNavStyle(view, 'dashboard')}>
      🏠 Home
    </button>
    <button onClick={() => setView('add')} style={getNavStyle(view, 'add')}>
      📝 Admission
    </button>
    <button onClick={() => setView('sel_view')} style={getNavStyle(view, 'sel_view')}>
      📂 Directory
    </button>
    <button onClick={() => setView('sel_att')} style={getNavStyle(view, 'sel_att')}>
      ✅ Attend
    </button>
    <button onClick={fetchHistory} style={getNavStyle(view, 'history')}>
      📜 History
    </button>
    <button onClick={() => setIsLoggedIn(false)} style={{...getNavStyle('', ''), backgroundColor:'#fab1a0', color:'#d63031', boxShadow:'0 4px 0 #e17055'}}>
      Logout
    </button>
  </div>
</div>
