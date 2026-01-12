"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';
import { 
  Bot, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Target,
  Sparkles,
  Code,
  ArrowRight,
  Copy
} from 'lucide-react';
import clsx from 'clsx';

type Project = {
  _id: string;
  projectName: string;
};

export default function CreateAgentFlowPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [inputVariables, setInputVariables] = useState('{\n  "recipient": "+1234567890",\n  "message": "Hello from Wexa!"\n}');
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; flowId?: string } | null>(null);

  useEffect(() => {
    if (apiKey && user) {
      fetchProjects();
    }
  }, [apiKey, user]);

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
      setStatus({ type: 'error', message: err.message || 'Failed to load projects' });
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!selectedProject || !name || !goal || !inputVariables) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    let parsedInputVariables;
    try {
      parsedInputVariables = JSON.parse(inputVariables);
    } catch {
      setStatus({ type: 'error', message: 'Invalid JSON in input variables' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/agentflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          goal,
          inputVariables: parsedInputVariables,
          projectID: selectedProject,
          apiKey,
          executedBy: user?._id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatus({ 
        type: 'success', 
        message: 'AgentFlow created successfully!',
        flowId: data._id || data.data?._id
      });
      setName('');
      setGoal('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to create AgentFlow' });
    } finally {
      setLoading(false);
    }
  };

  const copyFlowId = () => {
    if (status?.flowId) {
      navigator.clipboard.writeText(status.flowId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create AgentFlow</h1>
            <p className="text-muted text-sm">Design your automated WhatsApp workflow</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl space-y-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="input-label">Project</label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="input-field appearance-none pr-10"
                  disabled={projectsLoading}
                >
                  {projectsLoading ? (
                    <option>Loading projects...</option>
                  ) : projects.length === 0 ? (
                    <option>No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.projectName}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Flow Name */}
            <div className="space-y-2">
              <label className="input-label flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Flow Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Welcome Message Flow"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <label className="input-label flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goal
              </label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="Describe what this flow should accomplish. Be specific about the desired outcome."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            {/* Input Variables */}
            <div className="space-y-2">
              <label className="input-label flex items-center gap-2">
                <Code className="w-4 h-4" />
                Input Variables (JSON)
              </label>
              <textarea
                className="input-field font-mono text-sm min-h-[140px] resize-none"
                value={inputVariables}
                onChange={(e) => setInputVariables(e.target.value)}
              />
              <p className="text-xs text-muted">
                Define the variables your flow will use. These can be provided when starting an execution.
              </p>
            </div>

            {/* Status Message */}
            {status && (
              <div className={clsx(
                'p-4 rounded-xl animate-fade-in',
                status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
              )}>
                <div className="flex items-start gap-3">
                  {status.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={clsx('text-sm', status.type === 'success' ? 'text-emerald-400' : 'text-red-400')}>
                      {status.message}
                    </p>
                    {status.flowId && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-white/5 px-2 py-1 rounded font-mono">
                          {status.flowId}
                        </code>
                        <button
                          type="button"
                          onClick={copyFlowId}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3 text-muted" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || projectsLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating flow...
                </>
              ) : (
                <>
                  Create AgentFlow
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Panel */}
        <div className="space-y-4">
          <div className="glass-card p-5 rounded-xl">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Tips for Great Flows
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Be specific about your goal - describe the exact outcome you want
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Use descriptive variable names like "customerName" instead of "n"
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Include example values in your input variables for clarity
              </li>
            </ul>
          </div>

          <div className="glass-card p-5 rounded-xl">
            <h3 className="font-semibold mb-3">Example Goals</h3>
            <div className="space-y-2">
              {[
                'Send a personalized welcome message to new customers',
                'Notify customers about their order status updates',
                'Send appointment reminders 24 hours before scheduled time',
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGoal(example)}
                  className="w-full text-left text-xs p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-muted hover:text-white"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
