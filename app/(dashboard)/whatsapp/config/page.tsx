"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getWexaClient } from '@/lib/wexa';
import { 
  Settings, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Shield,
  Key,
  Phone,
  Building
} from 'lucide-react';
import clsx from 'clsx';

type Project = {
  _id: string;
  projectName: string;
};

export default function WhatsAppConfigPage() {
  const { apiKey, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey && user) {
      fetchProjects();
    }
  }, [apiKey, user]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const client = getWexaClient(apiKey!);
      // Need both userId AND orgId to get projects
      const response = await client.projects.getAll({ 
        userId: user!._id,
        orgId: user!.orgId,
        status: 'published' // Only show published projects
      });
      
      // API returns { projectList: [], totalCount: 0, ... }
      if (response.projectList && Array.isArray(response.projectList)) {
        const publishedProjects = response.projectList.filter((p: any) => p.status === 'published');
        setProjects(publishedProjects);
        if (publishedProjects.length > 0) {
          setSelectedProject(publishedProjects[0]._id);
          // Fetch existing config if available
          loadExistingConfig(publishedProjects[0]._id);
        }
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to load projects' });
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadExistingConfig = async (projectId: string) => {
    try {
      // Fetch all connectors for the project - correct endpoint is /connectors/{projectID}
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/connectors/${projectId}`, {
        headers: {
          'x-api-key': apiKey!
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connectors response:', data);
        
        // Response format is an array: [{ category: "whatsapp", accounts: 2, accountDetails: [...] }, ...]
        const connectorsList = Array.isArray(data) ? data : (data.data || []);
        const whatsappCategory = connectorsList.find((c: any) => c.category === 'whatsapp');
        
        console.log('WhatsApp category found:', whatsappCategory);
        
        if (whatsappCategory && whatsappCategory.accountDetails && whatsappCategory.accountDetails.length > 0) {
          // Check if any account is ready
          const readyAccounts = whatsappCategory.accountDetails.filter((a: any) => a.status === 'ready');
          const pendingAccounts = whatsappCategory.accountDetails.filter((a: any) => a.status === 'pending');
          
          console.log('Ready accounts:', readyAccounts);
          console.log('Pending accounts:', pendingAccounts);
          
          if (readyAccounts.length > 0) {
            // At least one account is ready - show connected status
            setIsConnected(true);
            setConnectorId(readyAccounts[0].connectorID);
            setVerificationUrl(null);
            setIsEditMode(false);
          } else if (pendingAccounts.length > 0) {
            // Has pending accounts - need verification
            setIsConnected(false);
            setConnectorId(pendingAccounts[0].connectorID);
            // Fetch the pending connector details to get verification URL
            await fetchConnectorDetails(pendingAccounts[0].connectorID);
          } else {
            setIsConnected(false);
            setIsEditMode(true);
            setVerificationUrl(null);
          }
        } else if (whatsappCategory && whatsappCategory.accounts === 0) {
          // WhatsApp category exists but no accounts connected
          console.log('No WhatsApp accounts connected');
          setIsConnected(false);
          setIsEditMode(true);
          setVerificationUrl(null);
        } else {
          console.log('No WhatsApp connector found');
          setIsConnected(false);
          setIsEditMode(true);
          setVerificationUrl(null);
        }
      } else {
        console.error('Failed to fetch connectors:', response.status, await response.text());
        setIsConnected(false);
        setIsEditMode(true);
        setVerificationUrl(null);
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
      setIsConnected(false);
      setIsEditMode(true);
      setVerificationUrl(null);
    }
  };

  const fetchConnectorDetails = async (connectorId: string) => {
    try {
      // Fetch individual connector details to get verification URL
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://testing.api.wexa.ai'}/actions/whatsapp/config/${connectorId}`, {
        headers: {
          'x-api-key': apiKey!
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connector details:', data);
        
        if (data.config?.data_to_verify?.url) {
          setVerificationUrl(data.config.data_to_verify.url);
        } else if (data.configured && data.config?.data_to_verify?.url) {
          setVerificationUrl(data.config.data_to_verify.url);
        }
      }
    } catch (err: any) {
      console.error('Error fetching connector details:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !phoneNumber || !emailId || !pin) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectID: selectedProject,
          orgId: user!.orgId,
          config: {
            phone_number: phoneNumber,
            email_id: emailId,
            pin: pin,
          },
          apiKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Check if there's a verification URL in the response
      if (data.data_to_verify?.url) {
        setVerificationUrl(data.data_to_verify.url);
        setStatus({ 
          type: 'success', 
          message: 'Configuration saved! Please scan the QR code to complete the connection.' 
        });
      } else {
        setStatus({ 
          type: 'success', 
          message: 'WhatsApp connector configured successfully! Check your email for PIN verification.' 
        });
      }
      
      // Reload the config to check connection status
      setTimeout(() => {
        loadExistingConfig(selectedProject);
      }, 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Configuration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Configuration</h1>
            <p className="text-muted text-sm">Connect your WhatsApp Business API</p>
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      {isConnected && !isEditMode && (
        <div className="glass-card p-4 rounded-xl mb-6 border-l-4 border-emerald-500">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Connected Successfully</p>
                <p className="text-xs text-muted mt-1">
                  Your WhatsApp is connected and ready to use. Click "Edit Configuration" to update your settings.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditMode(true)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Edit Configuration
            </button>
          </div>
        </div>
      )}

      {/* Pending/Verification Card */}
      {verificationUrl && !isConnected && (
        <div className="glass-card p-6 rounded-xl mb-6 border-l-4 border-yellow-500">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Verification Required</p>
                <p className="text-xs text-muted mt-1">
                  Your connector is pending. Please scan the QR code to complete the connection.
                </p>
              </div>
            </div>
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <Phone className="w-4 h-4" />
              Open QR Code Verification
            </a>
            <button
              onClick={() => loadExistingConfig(selectedProject)}
              className="btn-secondary w-full py-2 text-xs"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {/* Info Card - Show only when not connected or in edit mode */}
      {(!isConnected || isEditMode) && !verificationUrl && (
        <div className="glass-card p-4 rounded-xl mb-6 border-l-4 border-indigo-500">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure Connection</p>
              <p className="text-xs text-muted mt-1">
                Your personal WhatsApp will be connected securely. You'll receive a PIN at your email to verify the connection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl space-y-6">
        {/* Project Selection */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Building className="w-4 h-4" />
            Select Project
          </label>
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                loadExistingConfig(e.target.value);
              }}
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

        {/* Phone Number */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number (with country code)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g., 919999999999"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isConnected && !isEditMode}
          />
          <p className="text-xs text-muted">
            Enter your complete phone number with country code (e.g., 919999999999 for India)
          </p>
        </div>

        {/* Email ID */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Building className="w-4 h-4" />
            Email ID
          </label>
          <input
            type="email"
            className="input-field"
            placeholder="your.email@example.com"
            value={emailId}
            onChange={(e) => setEmailId(e.target.value)}
            disabled={isConnected && !isEditMode}
          />
          <p className="text-xs text-muted">
            You will receive the authentication PIN at this email address
          </p>
        </div>

        {/* PIN */}
        <div className="space-y-2">
          <label className="input-label flex items-center gap-2">
            <Key className="w-4 h-4" />
            PIN (4 digits recommended)
          </label>
          <input
            type="password"
            className="input-field"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={isConnected && !isEditMode}
          />
          <p className="text-xs text-muted">
            Create a new PIN or use your existing PIN if you've connected before. Keep it safe!
          </p>
        </div>

        {/* Status Message */}
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

        {/* Submit Button - Show only in edit mode or when not connected */}
        {(!isConnected || isEditMode) && (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || projectsLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving configuration...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  {isConnected ? 'Update Configuration' : 'Save Configuration'}
                </>
              )}
            </button>
            
            {isConnected && isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false);
                  loadExistingConfig(selectedProject);
                }}
                className="btn-secondary px-6 py-3"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
