import Dashboard from './components/Dashboard';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#161b22',
            border: '1px solid #334155',
            color: '#f1f5f9',
            fontSize: '13px',
            fontFamily: 'Inter, -apple-system, sans-serif',
          },
        }}
      />
    </>
  );
}
