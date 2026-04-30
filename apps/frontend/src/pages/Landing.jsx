export default function Landing() {
  const s = {
    page: { fontFamily: 'system-ui', padding: '32px', maxWidth: '600px' },
    btn: { padding: '10px 20px', cursor: 'pointer', fontSize: '15px', marginTop: '16px' },
  };

  return (
    <div style={s.page}>
      <h1>TaskMaster</h1>
      <p>GitHub Integrated Workflow Tracker</p>
      <button style={s.btn} onClick={() => { window.location.href = 'http://localhost:4000/auth/github'; }}>
        Login with GitHub
      </button>
    </div>
  );
}
