
interface MiniAppProps {
  params: Promise<{
    chain: string;
    address: string;
  }>;
}

export default async function MiniApp(props: MiniAppProps) {
  const params = await props.params;
  const { chain, address } = params;
  const url = `https://app.bubblemaps.io/${chain}/token/${address}`;

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
}
