"use client";

import { useAuth } from '@/components/AuthProvider';
import { 
  MessageSquare, 
  Bot, 
  Zap, 
  TrendingUp, 
  ArrowRight,
  Settings,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Messages Sent', value: '0', change: '+0%', icon: MessageSquare, color: 'indigo' },
  { label: 'Active Flows', value: '0', change: '+0%', icon: Bot, color: 'purple' },
  { label: 'Executions', value: '0', change: '+0%', icon: Zap, color: 'emerald' },
  { label: 'Success Rate', value: '0%', change: '+0%', icon: TrendingUp, color: 'cyan' },
];

const quickActions = [
  {
    title: 'Configure WhatsApp',
    description: 'Connect your WhatsApp Business API credentials',
    href: '/whatsapp/config',
    icon: Settings,
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    title: 'Create AgentFlow',
    description: 'Build automated messaging workflows with AI',
    href: '/agentflows/create',
    icon: Bot,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Send Message',
    description: 'Quickly send a WhatsApp message manually',
    href: '/whatsapp/send',
    icon: MessageSquare,
    gradient: 'from-orange-500 to-red-600',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="text-muted">
            Here's what's happening with your WhatsApp automation today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="stat-card animate-slide-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className="group glass-card p-6 rounded-2xl hover:border-white/10 transition-all duration-300 animate-slide-in"
              style={{ animationDelay: `${(index + 4) * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {action.title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </h3>
              <p className="text-sm text-muted">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Getting Started</h3>
            <p className="text-muted mb-4">
              Follow these steps to set up your WhatsApp automation platform:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: 1, title: 'Configure API', desc: 'Add your WhatsApp Business credentials' },
                { step: 2, title: 'Create Flow', desc: 'Design your automation workflow' },
                { step: 3, title: 'Execute', desc: 'Run your flow and monitor results' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
