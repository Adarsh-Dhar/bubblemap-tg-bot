export default function MiniApp({ params }: { params: { chain: string, address: string } }) {
  const { chain, address } = params;
  const url = `https://app.bubblemaps.io/${chain}/token/${address}`;
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
      />
    </div>
  );
}
