"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Settings, 
  Bot, 
  Play, 
  Send, 
  LogOut, 
  MessageSquare,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'WhatsApp Config', href: '/whatsapp/config', icon: Settings },
  { name: 'Chat', href: '/whatsapp/chat', icon: MessageSquare },
  { name: 'Automation', href: '/whatsapp/automation', icon: Zap },
  { name: 'Create Flow', href: '/agentflows/create', icon: Bot },
  { name: 'Executions', href: '/executions', icon: Play },
  { name: 'Quick Send', href: '/whatsapp/send', icon: Send },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen w-72 flex-col glass-card rounded-none border-r border-white/5">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold">WhatsApp Auto</span>
          <p className="text-xs text-muted">Enterprise Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mb-2 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Main Menu
          </span>
        </div>
        <nav className="space-y-1">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/20' 
                    : 'text-muted hover:text-white hover:bg-white/5',
                  'animate-slide-in'
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                  isActive 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'bg-white/5 text-muted group-hover:text-white group-hover:bg-white/10'
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section */}
      <div className="border-t border-white/5 p-4">
        <div className="glass-card p-4 rounded-xl mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
            <LogOut className="w-4 h-4" />
          </div>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
