import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  buildPlan,
  createCopilotSession,
  executeTask,
  generateBrief,
  getCopilotState,
  runDecide,
  runDiagnose,
  submitFeedback,
} from '@/lib/api/copilot';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Copilot() {
  const [profileId, setProfileId] = useState('demo-profile');
  const [sessionId, setSessionId] = useState('');
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState('');

  const refresh = async (id: string) => {
    const data = await getCopilotState(id);
    setState(data);
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const { session } = await createCopilotSession(profileId, 'sme');
      setSessionId(session.id);
      await refresh(session.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await runDiagnose(sessionId);
      await refresh(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to diagnose');
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await runDecide(sessionId);
      await refresh(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to decide');
    } finally {
      setLoading(false);
    }
  };

  const handlePlan = async () => {
    if (!sessionId || !selectedPath) return;
    setLoading(true);
    try {
      await buildPlan(sessionId, selectedPath);
      await refresh(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to build plan');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (taskId: string, requiresConfirmation: boolean) => {
    setLoading(true);
    try {
      await executeTask(taskId, !requiresConfirmation || window.confirm('Confirm execution?'));
      await refresh(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute task');
    } finally {
      setLoading(false);
    }
  };

  const handleBrief = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await generateBrief(sessionId);
      await refresh(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate brief');
    } finally {
      setLoading(false);
    }
  };

  const paths = state?.decide?.output?.paths || [];
  const diagnosis = state?.diagnose?.output;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SME Co-Pilot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input value={profileId} onChange={e => setProfileId(e.target.value)} placeholder="Profile ID" />
            <Button onClick={handleCreate} disabled={loading}>Start Co-Pilot</Button>
            {sessionId && <span className="text-sm text-muted-foreground">Session: {sessionId}</span>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleDiagnose} disabled={!sessionId || loading}>Run Diagnose</Button>
            <Button onClick={handleDecide} disabled={!sessionId || loading}>Run Decide</Button>
            <Button onClick={handleBrief} disabled={!sessionId || loading}>Generate Brief</Button>
          </div>
        </CardContent>
      </Card>

      {diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <h4 className="font-semibold">Snapshot</h4>
              <ul className="list-disc pl-4">
                {diagnosis.snapshot?.map((item: any) => (
                  <li key={item.title}>{item.title}: {item.detail} ({item.severity})</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold">Risks</h4>
              <ul className="list-disc pl-4">
                {diagnosis.risks?.map((item: any) => (
                  <li key={item.risk}>{item.risk} - {item.severity}/{item.impact}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {paths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Decision Paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paths.map((path: any) => (
              <div key={path.key} className={`border rounded p-3 ${selectedPath === path.key ? 'border-primary' : 'border-muted'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{path.title}</h4>
                    <p className="text-sm text-muted-foreground">{path.rationale}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedPath(path.key)}>Select</Button>
                </div>
                <p className="text-xs">Effort {path.effort} • Time {path.time} • Risk {path.risk}</p>
              </div>
            ))}
            <Button onClick={handlePlan} disabled={!selectedPath || loading}>Build Plan</Button>
          </CardContent>
        </Card>
      )}

      {state?.plan && (
        <Card>
          <CardHeader>
            <CardTitle>Action Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              {state.tasks?.map((task: any) => (
                <li key={task.id} className="flex justify-between items-center border rounded p-2">
                  <div>
                    <p className="font-semibold">{task.action_key}</p>
                    <p className="text-xs text-muted-foreground">Status: {task.status}</p>
                  </div>
                  {task.task_type === 'platform' && (
                    <Button size="sm" onClick={() => handleExecute(task.id, task.requires_confirmation)} disabled={loading}>
                      Execute
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {state?.artifacts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Health Briefs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4">
              {state.artifacts.map((a: any) => (
                <li key={a.id}>
                  <a className="text-primary underline" href={a.meta?.url || a.storage_path} target="_blank" rel="noreferrer">
                    Brief {new Date(a.created_at).toLocaleString()}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
