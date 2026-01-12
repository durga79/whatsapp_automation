'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';

type Project = {
  _id: string;
  projectName: string;
  status: string;
};

type AgentFlow = {
  _id: string;
  name: string;
  description: string;
  role: string;
};

type ConnectorDetail = {
  sourceName: string;
  connectorID: string;
  status: 'ready' | 'pending' | 'failed';
};

type Trigger = {
  _id: string;
  name: string;
  event: string;
  trigger_type: string;
  agentflow_id: string;
  goal: string;
  is_active?: boolean;
};

export default function WhatsAppAutomationPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [connectors, setConnectors] = useState<ConnectorDetail[]>([]);
  const [selectedConnector, setSelectedConnector] = useState('');
  const [agentflows, setAgentflows] = useState<AgentFlow[]>([]);
  const [selectedAgentflow, setSelectedAgentflow] = useState('');
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [triggerName, setTriggerName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<'message_received' | 'message_read' | 'message_reaction'>('message_received');
  const [triggerGoal, setTriggerGoal] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Auto-reply state (polling-based)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyStatus, setAutoReplyStatus] = useState<{
    unreadChats: number;
    repliesSent: number;
    lastCheck: Date | null;
  }>({ unreadChats: 0, repliesSent: 0, lastCheck: null });

  useEffect(() => {
    if (apiKey && user) {
      fetchProjects();
    }
  }, [apiKey, user]);

  useEffect(() => {
    if (selectedProject && apiKey && user) {
      fetchConnectorsAndAgentflows(selectedProject);
    }
  }, [selectedProject, apiKey, user]);

  useEffect(() => {
    if (selectedConnector && apiKey) {
      fetchTriggers(selectedConnector);
    }
  }, [selectedConnector, apiKey]);

  // Auto-reply polling effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const checkAndReply = async () => {
      if (!autoReplyEnabled || !selectedConnector || !apiKey) return;

      try {
        const response = await fetch('/api/whatsapp/auto-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectorID: selectedConnector,
            apiKey,
            enableAutoReply: true
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAutoReplyStatus({
            unreadChats: data.unreadChats || 0,
            repliesSent: data.repliesSent || 0,
            lastCheck: new Date()
          });

          if (data.repliesSent > 0) {
            setStatus({ type: 'success', message: `Auto-replied to ${data.repliesSent} message(s)!` });
          }
        }
      } catch (error) {
        console.error('Auto-reply check failed:', error);
      }
    };

    if (autoReplyEnabled && selectedConnector) {
      // Initial check
      checkAndReply();
      // Poll every 10 seconds
      intervalId = setInterval(checkAndReply, 10000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoReplyEnabled, selectedConnector, apiKey]);

  const fetchProjects = async () => {
    setDataLoading(true);
    try {
      const client = getWexaClient(apiKey!);
      const response = await client.projects.getAll({
        userId: user!._id,
        orgId: user!.orgId,
        // Don't filter by status to show all projects
      });

      console.log('Projects response:', response);
      
      const projectsList = response.projectList || response.data || response || [];
      if (Array.isArray(projectsList) && projectsList.length > 0) {
        setProjects(projectsList);
        setSelectedProject(projectsList[0]._id);
      } else {
        // Fallback: Use the known project ID for SDK project
        setProjects([{ _id: '6960ae82154a3dab7f3ec8a2', projectName: 'SDK', status: 'active' }]);
        setSelectedProject('6960ae82154a3dab7f3ec8a2');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to load projects' });
    } finally {
      setDataLoading(false);
    }
  };

  const fetchConnectorsAndAgentflows = async (projectId: string) => {
    setDataLoading(true);
    try {
      const client = getWexaClient(apiKey!);

      // Fetch connectors
      const connectorsRes = await client.connectors.getConnectorsByProject(projectId);
      const whatsappConnectors: ConnectorDetail[] = [];

      // Handle both array and object response formats
      const connectorsList = Array.isArray(connectorsRes) ? connectorsRes : (connectorsRes.data || connectorsRes);
      
      if (Array.isArray(connectorsList)) {
        connectorsList.forEach((connectorGroup: any) => {
          if (connectorGroup.category === 'whatsapp' && connectorGroup.accountDetails) {
            connectorGroup.accountDetails.forEach((detail: any) => {
              // Include both ready and pending connectors
              whatsappConnectors.push({
                sourceName: detail.sourceName || detail.name || 'WhatsApp',
                connectorID: detail.connectorID || detail._id,
                status: detail.status || 'pending'
              });
            });
          }
        });
      }

      console.log('WhatsApp connectors found:', whatsappConnectors);
      setConnectors(whatsappConnectors);
      if (whatsappConnectors.length > 0) {
        setSelectedConnector(whatsappConnectors[0].connectorID);
      }

      // Fetch agentflows - pass projectID as object
      const agentflowsRes = await client.agentflows.list({ projectID: projectId });
      console.log('AgentFlows response:', agentflowsRes);
      
      const agentflowsList = agentflowsRes.agentflows || agentflowsRes.data || agentflowsRes || [];
      if (Array.isArray(agentflowsList)) {
        setAgentflows(agentflowsList);
        if (agentflowsList.length > 0) {
          setSelectedAgentflow(agentflowsList[0]._id);
        }
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to load connectors/agentflows' });
    } finally {
      setDataLoading(false);
    }
  };

  const fetchTriggers = async (connectorId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/triggers?connectorId=${connectorId}`, {
        headers: { 'x-api-key': apiKey! }
      });
      const data = await response.json();
      if (data.triggers) {
        setTriggers(data.triggers);
      } else {
        setTriggers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch triggers:', err);
      setTriggers([]);
    }
  };

  const handleCreateTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector || !selectedAgentflow || !triggerName || !triggerGoal) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/whatsapp/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: selectedConnector,
          apiKey,
          trigger: {
            name: triggerName,
            event: triggerEvent,
            agentflow_id: selectedAgentflow,
            goal: triggerGoal,
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: 'Automation trigger created successfully!' });
      setTriggerName('');
      setTriggerGoal('');
      setShowCreateForm(false);
      fetchTriggers(selectedConnector);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to create trigger' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/triggers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: selectedConnector,
          triggerId,
          apiKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: 'Automation deleted successfully!' });
      fetchTriggers(selectedConnector);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to delete trigger' });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">WhatsApp Automation</h1>
        <p className="text-zinc-400">
          Set up automatic replies using AI when you receive WhatsApp messages.
        </p>
      </div>

      {/* Status Messages */}
      {status && (
        <div className={`p-4 rounded-lg border ${
          status.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {status.message}
        </div>
      )}

      {/* Project & Connector Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.projectName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">WhatsApp Account</label>
          <select
            value={selectedConnector}
            onChange={(e) => setSelectedConnector(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={connectors.length === 0}
          >
            {connectors.length === 0 ? (
              <option value="">No connected accounts</option>
            ) : (
              connectors.map((connector) => (
                <option key={connector.connectorID} value={connector.connectorID}>
                  {connector.sourceName}
                </option>
              ))
            )}
          </select>
          {connectors.length === 0 && (
            <p className="text-amber-400 text-sm mt-2">
              Please configure a WhatsApp account first in the Configuration tab.
            </p>
          )}
        </div>
      </div>

      {/* Quick Auto-Reply Toggle */}
      {selectedConnector && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-xl p-6 border border-emerald-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${autoReplyEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                Quick Auto-Reply
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Automatically reply to incoming messages using smart AI responses.
                {autoReplyEnabled && ` Checking every 10 seconds.`}
              </p>
              {autoReplyStatus.lastCheck && autoReplyEnabled && (
                <p className="text-zinc-500 text-xs mt-2">
                  Last check: {autoReplyStatus.lastCheck.toLocaleTimeString()} | 
                  Unread chats: {autoReplyStatus.unreadChats} | 
                  Replies sent: {autoReplyStatus.repliesSent}
                </p>
              )}
            </div>
            <button
              onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                autoReplyEnabled
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {autoReplyEnabled ? '⏹ Stop Auto-Reply' : '▶ Start Auto-Reply'}
            </button>
          </div>
        </div>
      )}

      {/* Active Automations (AgentFlow based - for advanced users) */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">AgentFlow Automations</h2>
            <p className="text-zinc-500 text-sm">Advanced: Connect to AgentFlows for custom AI responses</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            disabled={connectors.length === 0 || agentflows.length === 0}
          >
            {showCreateForm ? 'Cancel' : '+ New Automation'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateTrigger} className="mb-6 p-6 bg-zinc-900/50 rounded-lg border border-zinc-600">
            <h3 className="text-lg font-medium text-white mb-4">Create New Automation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Automation Name</label>
                <input
                  type="text"
                  value={triggerName}
                  onChange={(e) => setTriggerName(e.target.value)}
                  placeholder="e.g., Customer Support Auto-Reply"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Trigger Event</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="message_received">When Message Received</option>
                  <option value="message_read">When Message Read</option>
                  <option value="message_reaction">When Message Reaction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">AgentFlow to Execute</label>
                <select
                  value={selectedAgentflow}
                  onChange={(e) => setSelectedAgentflow(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={agentflows.length === 0}
                >
                  {agentflows.length === 0 ? (
                    <option value="">No agentflows available</option>
                  ) : (
                    agentflows.map((af) => (
                      <option key={af._id} value={af._id}>
                        {af.name}
                      </option>
                    ))
                  )}
                </select>
                {agentflows.length === 0 && (
                  <p className="text-amber-400 text-sm mt-2">
                    Create an AgentFlow first in Wexa Studio.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Goal / Instructions</label>
                <textarea
                  value={triggerGoal}
                  onChange={(e) => setTriggerGoal(e.target.value)}
                  placeholder="e.g., Analyze the incoming message and provide a helpful, friendly response. If the query is complex, offer to connect them with a human agent."
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  required
                />
                <p className="text-zinc-500 text-sm mt-1">
                  This goal will be passed to the AgentFlow along with the incoming message.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || agentflows.length === 0}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Automation'}
              </button>
            </div>
          </form>
        )}

        {/* Triggers List */}
        {triggers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-white mb-2">No automations yet</h3>
            <p className="text-zinc-400">
              Create your first automation to start auto-replying to WhatsApp messages.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <div
                key={trigger._id}
                className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{trigger.name}</h4>
                    <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                      {trigger.event.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm line-clamp-2">{trigger.goal}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDeleteTrigger(trigger._id)}
                    className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="font-medium text-white mb-2">1. Message Received</h3>
            <p className="text-zinc-400 text-sm">
              When someone sends you a WhatsApp message, our webhook captures it instantly.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🧠</div>
            <h3 className="font-medium text-white mb-2">2. AI Processes</h3>
            <p className="text-zinc-400 text-sm">
              Your AgentFlow analyzes the message using LLM and generates an appropriate response.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✉️</div>
            <h3 className="font-medium text-white mb-2">3. Auto-Reply Sent</h3>
            <p className="text-zinc-400 text-sm">
              The AI-generated response is automatically sent back through WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

