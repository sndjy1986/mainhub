import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/centralhub/Layout';
import { StartPage } from './pages/centralhub/StartPage';
import { TerminalProvider } from './context/TerminalContext';
import { PageWrapper } from './components/centralhub/PageWrapper';

const ToneTest = lazy(() => import('./pages/ToneTest'));
const ShiftReport = lazy(() => import('./pages/ShiftReport'));
const DistanceMap = lazy(() => import('./pages/DistanceMap'));
const CommandConsole = lazy(() => import('./pages/CommandConsole'));
const DotCameras = lazy(() => import('./pages/DotCameras'));
const AdminPage = lazy(() => import('./pages/centralhub/AdminPage'));
const TimeClock = lazy(() => import('./pages/TimeClock'));

export default function App() {
  return (
    <TerminalProvider>
      <Router>
        <Layout>
          <Suspense fallback={<div className="w-full h-full bg-[#0f172a]" />}>
            <Routes>
              <Route path="/" element={<PageWrapper><StartPage /></PageWrapper>} />
              <Route path="/tone-test" element={<PageWrapper className="overflow-y-auto"><ToneTest /></PageWrapper>} />
              <Route path="/unit-posting" element={<PageWrapper fullWidth className="overflow-hidden"><CommandConsole /></PageWrapper>} />
              <Route path="/distance-map" element={<PageWrapper fullWidth className="overflow-hidden"><DistanceMap /></PageWrapper>} />
              <Route path="/cameras" element={<PageWrapper fullWidth className="overflow-hidden"><DotCameras /></PageWrapper>} />
              <Route path="/shift-report" element={<PageWrapper className="overflow-y-auto"><ShiftReport /></PageWrapper>} />
              <Route path="/time-clock" element={<PageWrapper fullWidth className="overflow-hidden"><TimeClock /></PageWrapper>} />
              <Route path="/admin/settings" element={<PageWrapper className="overflow-y-auto"><AdminPage /></PageWrapper>} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </TerminalProvider>
  );
}
