"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Phone,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

type Project = {
  _id: string;
  projectName: string;
};

type Connector = {
  _id: string;
  name: string;
  category: string;
};

export default function QuickSendPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (apiKey && user) {
      fetchData();
    }
  }, [apiKey, user]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const client = getWexaClient(apiKey!);
      
      // Fetch projects
      const projectsRes = await client.projects.getAll({ 
        userId: user!._id,
        orgId: user!.orgId,
        status: 'published'
      });
      
      if (projectsRes.projectList && Array.isArray(projectsRes.projectList)) {
        setProjects(projectsRes.projectList);
        if (projectsRes.projectList.length > 0) {
          const firstProjectId = projectsRes.projectList[0]._id;
          setSelectedProject(firstProjectId);
          
          // Fetch WhatsApp connectors for the first project
          await fetchConnectors(firstProjectId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setStatus({ type: 'error', message: err.message || 'Failed to load data' });
    } finally {
      setDataLoading(false);
    }
  };

  const fetchConnectors = async (projectId: string) => {
    try {
      // Fetch connectors for the selected project - correct endpoint is /connectors/{projectID}
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/connectors/${projectId}`, {
        headers: {
          'x-api-key': apiKey!
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connectors data:', data);
        
        // Response format is an array: [{ category: "whatsapp", accounts: 2, accountDetails: [...] }, ...]
        const connectorsList = Array.isArray(data) ? data : (data.data || []);
        const whatsappCategory = connectorsList.find((c: any) => c.category === 'whatsapp');
        
        console.log('WhatsApp category found:', whatsappCategory);
        
        if (whatsappCategory && whatsappCategory.accountDetails && whatsappCategory.accountDetails.length > 0) {
          // Transform accountDetails to the format expected by the UI
          const whatsappConnectors = whatsappCategory.accountDetails.map((account: any) => ({
            _id: account.connectorID,
            name: account.sourceName,
            category: 'whatsapp',
            status: account.status
          }));
          
          console.log('WhatsApp connectors:', whatsappConnectors);
          
          setConnectors(whatsappConnectors);
          if (whatsappConnectors.length > 0) {
            // Prefer ready connectors
            const readyConnector = whatsappConnectors.find((c: any) => c.status === 'ready');
            setSelectedConnector(readyConnector ? readyConnector._id : whatsappConnectors[0]._id);
          }
        } else {
          setConnectors([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch connectors:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!selectedProject || !selectedConnector || !recipient || !message) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectID: selectedProject,
          connectorID: selectedConnector,
          recipient,
          message,
          apiKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: 'Message sent successfully!' });
      setMessage('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to send message' });
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    { label: 'Welcome', text: 'Hello! Welcome to our service. How can we help you today?' },
    { label: 'Thank You', text: 'Thank you for reaching out! We appreciate your message.' },
    { label: 'Follow Up', text: 'Hi! Just following up on our previous conversation. Let me know if you need anything.' },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quick Send</h1>
            <p className="text-muted text-sm">Send a WhatsApp message directly</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl space-y-6">
        {/* Project */}
        <div className="space-y-2">
          <label className="input-label">Project</label>
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                fetchConnectors(e.target.value);
              }}
              className="input-field appearance-none pr-10"
              disabled={dataLoading}
            >
              {dataLoading ? (
                <option>Loading...</option>
              ) : projects.length === 0 ? (
                <option>No projects</option>
              ) : (
                projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Connector */}
        <div className="space-y-2">
          <label className="input-label">WhatsApp Connector</label>
          <div className="relative">
            <select
              value={selectedConnector}
              onChange={(e) => setSelectedConnector(e.target.value)}
              className="input-field appearance-none pr-10"
              disabled={dataLoading}
            >
              {dataLoading ? (
                <option>Loading...</option>
              ) : connectors.length === 0 ? (
                <option>No connectors configured</option>
              ) : (
                connectors.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.status === 'pending' ? '(Pending)' : c.status === 'ready' ? '✓' : ''}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          {connectors.length === 0 && !dataLoading && (
            <p className="text-xs text-yellow-400">
              No WhatsApp connector found. Please configure one first in WhatsApp Config.
            </p>
          )}
          {connectors.length > 0 && connectors.every((c: any) => c.status === 'pending') && (
            <p className="text-xs text-yellow-400">
              Connector is pending verification. Please complete the QR code scan in WhatsApp Config.
            </p>
          )}
        </div>

        {/* Recipient */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Recipient Phone Number
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="919999999999"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <p className="text-xs text-muted">Enter with country code (e.g., 919999999999 for India, 12025551234 for US)</p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Message
          </label>
          <textarea
            className="input-field min-h-[140px] resize-none"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{message.length} characters</span>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Templates
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => setMessage(template.text)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={clsx(
            'p-4 rounded-xl flex items-start gap-3 animate-fade-in',
            status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
          )}>
            {status.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <p className={clsx('text-sm', status.type === 'success' ? 'text-emerald-400' : 'text-red-400')}>
              {status.message}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || dataLoading || connectors.length === 0 || connectors.every((c: any) => c.status === 'pending')}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending message...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
