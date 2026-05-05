import ToneTestTable from '../components/ToneTestTable';

export default function ToneTest() {
  return (
    <>
      <div className="border-b border-border-subtle pb-4">
        <h1 className="text-2xl font-black text-brand-blue uppercase tracking-widest mb-1">Fleet Tone Test</h1>
        <p className="text-sm font-medium text-text-muted">Manage fleet readiness status and tracking.</p>
      </div>
      <ToneTestTable />
    </>
  );
}
