export default function MiniApp() {
    return (
      <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <iframe 
          src="https://app.bubblemaps.io/bsc/token/0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95" 
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    );
  }