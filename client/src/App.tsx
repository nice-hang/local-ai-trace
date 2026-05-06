import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TraceDetail from './pages/TraceDetail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/traces/:id" element={<TraceDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
