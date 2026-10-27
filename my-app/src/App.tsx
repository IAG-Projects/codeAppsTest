import PowerProvider from './PowerProvider';
import ConnectApp from './connect/ConnectApp';

export default function App() {
  return (
    <PowerProvider>
      <ConnectApp />
    </PowerProvider>
  );
}
