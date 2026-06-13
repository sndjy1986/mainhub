import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/centralhub/Layout';
import { StartPage } from './pages/centralhub/StartPage';
import { PageWrapper } from './components/centralhub/PageWrapper';
import { useTerminal } from './context/TerminalContext';
import { LoginPage } from './pages/centralhub/LoginPage';

const ToneTest = lazy(() => import('./pages/ToneTest'));
const ShiftReport = lazy(() => import('./pages/ShiftReport'));
const DistanceMap = lazy(() => import('./pages/DistanceMap'));
import { UnitPosting } from './components/tools/UnitPosting';
const DotCameras = lazy(() => import('./pages/DotCameras'));
const AdminPage = lazy(() => import('./pages/centralhub/AdminPage'));
const TimeClock = lazy(() => import('./pages/TimeClock'));
const Directory = lazy(() => import('./pages/Directory'));
const Timers = lazy(() => import('./pages/Timers'));
const OperationalGuidelines = lazy(() => import('./pages/OperationalGuidelines'));
const CodesReference = lazy(() => import('./pages/CodesReference'));
const DispatchTools = lazy(() => import('./pages/DispatchTools'));
const ShiftTurnover = lazy(() => import('./pages/ShiftTurnover'));
const SendAdminMessage = lazy(() => import('./pages/centralhub/SendAdminMessage'));

export default function App() {
  const { terminalUser, firebaseUser } = useTerminal();

  if (!terminalUser && !firebaseUser) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Layout>
        <Suspense fallback={<div className="w-full h-full bg-bg-main flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<PageWrapper fullWidth className="p-6 md:p-10 max-w-[1920px] mx-auto overflow-y-auto"><StartPage /></PageWrapper>} />
            <Route path="/tone-test" element={<PageWrapper className="overflow-y-auto"><ToneTest /></PageWrapper>} />
            <Route path="/unit-posting" element={<PageWrapper fullWidth className="overflow-hidden"><UnitPosting /></PageWrapper>} />
            <Route path="/distance-map" element={<PageWrapper fullWidth className="overflow-hidden"><DistanceMap /></PageWrapper>} />
            <Route path="/cameras" element={<PageWrapper fullWidth className="overflow-hidden"><DotCameras /></PageWrapper>} />
            <Route 
              path="/shift-report" 
              element={
                terminalUser?.role?.toLowerCase() === 'dispatcher' ? (
                  <PageWrapper className="flex items-center justify-center min-h-[60vh]">
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl max-w-md shadow-2xl">
                      <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-3">Access Denied</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-[0.15em] leading-relaxed">
                        Dispatcher privileges do not permit access to the Shift Report log. Please contact your system administrator.
                      </p>
                    </div>
                  </PageWrapper>
                ) : (
                  <PageWrapper className="overflow-y-auto"><ShiftReport /></PageWrapper>
                )
              } 
            />
            <Route path="/time-clock" element={<PageWrapper fullWidth className="overflow-hidden"><TimeClock /></PageWrapper>} />
            <Route path="/timers" element={<PageWrapper className="overflow-y-auto"><Timers /></PageWrapper>} />
            <Route path="/directory" element={<PageWrapper className="overflow-y-auto"><Directory /></PageWrapper>} />
            <Route path="/guidelines" element={<PageWrapper className="overflow-y-auto"><OperationalGuidelines /></PageWrapper>} />
            <Route path="/codes" element={<PageWrapper className="overflow-y-auto"><CodesReference /></PageWrapper>} />
            <Route path="/tools" element={<PageWrapper className="overflow-y-auto"><DispatchTools /></PageWrapper>} />
            <Route path="/turnover" element={<PageWrapper className="overflow-y-auto"><ShiftTurnover /></PageWrapper>} />
            <Route path="/admin/settings" element={<PageWrapper className="overflow-y-auto"><AdminPage /></PageWrapper>} />
            <Route 
              path="/admin/send-message" 
              element={
                (terminalUser?.role === 'admin' || terminalUser?.role === 'root' || firebaseUser) ? (
                  <PageWrapper className="overflow-y-auto"><SendAdminMessage /></PageWrapper>
                ) : (
                  <PageWrapper className="flex items-center justify-center min-h-[60vh]">
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl max-w-md shadow-2xl">
                      <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-3">Unauthorized Operator</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-[0.15em] leading-relaxed">
                        Access Key privileges for role "{terminalUser?.role || 'operator'}" do not authorize dispatch message broadcast configurations.
                      </p>
                    </div>
                  </PageWrapper>
                )
              } 
            />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
