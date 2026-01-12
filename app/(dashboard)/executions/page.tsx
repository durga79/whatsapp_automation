"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Clock,
  Zap,
  RefreshCw,
  XCircle,
  Circle
} from 'lucide-react';
import clsx from 'clsx';

type Project = {
  _id: string;
  projectName: string;
};

type Execution = {
  _id: string;
  agentflow_id: string;
  goal: string;
  status: string;
  createdAt: string;
};

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  default: { icon: Circle, color: 'text-muted', bg: 'bg-white/5' },
};

export default function ExecutionsPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // Start execution form
  const [flowId, setFlowId] = useState('');
  const [goal, setGoal] = useState('');
  const [inputVariables, setInputVariables] = useState('{}');
  const [startLoading, setStartLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (apiKey && user) {
      fetchProjects();
    }
  }, [apiKey, user]);

  useEffect(() => {
    if (selectedProject && apiKey) {
      fetchExecutions();
    }
  }, [selectedProject, apiKey]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const client = getWexaClient(apiKey!);
      const response = await client.projects.getAll({ 
        userId: user!._id,
        orgId: user!.orgId,
        status: 'published'
      });
      // API returns { projectList: [], totalCount: 0, ... }
      if (response.projectList && Array.isArray(response.projectList)) {
        setProjects(response.projectList);
        if (response.projectList.length > 0) {
          setSelectedProject(response.projectList[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/executions/list?projectID=${selectedProject}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (response.ok) {
        setExecutions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!flowId || !goal || !inputVariables) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    let parsedVars;
    try {
      parsedVars = JSON.parse(inputVariables);
    } catch {
      setStatus({ type: 'error', message: 'Invalid JSON in input variables' });
      return;
    }

    setStartLoading(true);
    try {
      const response = await fetch('/api/executions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentflow_id: flowId,
          projectID: selectedProject,
          executedBy: user?._id,
          goal,
          input_variables: parsedVars,
          apiKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: 'Execution started successfully!' });
      setFlowId('');
      setGoal('');
      fetchExecutions();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to start execution' });
    } finally {
      setStartLoading(false);
    }
  };

  const getStatusConfig = (statusKey: string) => {
    return statusConfig[statusKey as keyof typeof statusConfig] || statusConfig.default;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Executions</h1>
            <p className="text-muted text-sm">Start and monitor your AgentFlow executions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Start Execution Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleStartExecution} className="glass-card p-6 rounded-2xl space-y-5 sticky top-8">
            <h2 className="font-semibold flex items-center gap-2">
              <Play className="w-4 h-4 text-orange-400" />
              Start New Execution
            </h2>

            {/* Project */}
            <div className="space-y-2">
              <label className="input-label">Project</label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="input-field appearance-none pr-10 text-sm"
                  disabled={projectsLoading}
                >
                  {projectsLoading ? (
                    <option>Loading...</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.projectName}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Flow ID */}
            <div className="space-y-2">
              <label className="input-label">AgentFlow ID</label>
              <input
                type="text"
                className="input-field text-sm"
                placeholder="Paste flow ID here"
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
              />
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <label className="input-label">Goal</label>
              <textarea
                className="input-field text-sm min-h-[80px] resize-none"
                placeholder="Execution goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            {/* Input Variables */}
            <div className="space-y-2">
              <label className="input-label">Input Variables</label>
              <textarea
                className="input-field font-mono text-xs min-h-[100px] resize-none"
                value={inputVariables}
                onChange={(e) => setInputVariables(e.target.value)}
              />
            </div>

            {status && (
              <div className={clsx(
                'p-3 rounded-lg flex items-start gap-2 animate-fade-in',
                status.type === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              )}>
                {status.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <p className={clsx('text-xs', status.type === 'success' ? 'text-emerald-400' : 'text-red-400')}>
                  {status.message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={startLoading || projectsLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {startLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Execution
                </>
              )}
            </button>
          </form>
        </div>

        {/* Executions List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Executions</h2>
            <button
              onClick={fetchExecutions}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted hover:text-white"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>

          {loading ? (
            <div className="glass-card p-12 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : executions.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted" />
              </div>
              <p className="text-muted">No executions yet</p>
              <p className="text-xs text-muted mt-1">Start your first execution using the form</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec, index) => {
                const config = getStatusConfig(exec.status);
                const StatusIcon = config.icon;
                return (
                  <div
                    key={exec._id}
                    className="glass-card p-4 rounded-xl hover:border-white/10 transition-all animate-slide-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={clsx('px-2 py-0.5 rounded-full text-xs flex items-center gap-1', config.bg)}>
                            <StatusIcon className={clsx('w-3 h-3', config.color, exec.status === 'running' && 'animate-spin')} />
                            <span className={config.color}>{exec.status}</span>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(exec.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm truncate">{exec.goal}</p>
                        <p className="text-xs text-muted mt-1 font-mono">
                          ID: {exec._id}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
