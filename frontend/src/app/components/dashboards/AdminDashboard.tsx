import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Users, Brain, Shield, LogOut, User, Globe } from 'lucide-react';
import { AnalyticsTab } from '@/app/components/admin/AnalyticsTab';
import { UserManagementTab } from '@/app/components/admin/UserManagementTab';
import { PolicyInsightsTab } from '@/app/components/admin/PolicyInsightsTab';
import { SystemMonitoringTab } from '@/app/components/admin/SystemMonitoringTab';
import { useTranslation } from '@/app/utils/translations';
import { api } from '@/app/utils/api';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
  language?: string;
}

export function AdminDashboard({ user, onLogout, language = 'en' }: AdminDashboardProps) {
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs = [
    { id: 'analytics', name: t('analytics'), icon: BarChart3, color: '#0b6e4f' },
    { id: 'users', name: t('userManagement'), icon: Users, color: '#2196F3' },
    { id: 'policy', name: t('policyInsights'), icon: Brain, color: '#9c27b0' },
    { id: 'monitoring', name: t('systemMonitoring'), icon: Shield, color: '#ff9800' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0b6e4f] to-[#2196F3] text-white py-6 mb-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">{t('adminPortal')}</h1>
                <p className="text-sm opacity-90">{user?.name || 'Administrator'} • {t('governmentOfKerala')}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-inner">
                {user?.photoUrl ? (
                  <img
                    src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                    alt={user?.name || 'Admin'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 text-xs uppercase text-white/80">
                <Globe className="w-4 h-4" />
                <span>{language}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Tab Navigation */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto no-scrollbar gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0b6e4f] text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? tab.color : undefined,
                }}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'analytics' && <AnalyticsTab language={language} />}
          {activeTab === 'users' && <UserManagementTab language={language} />}
          {activeTab === 'policy' && <PolicyInsightsTab language={language} />}
          {activeTab === 'monitoring' && <SystemMonitoringTab />}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>{t('keralaHealthPortal')} • {t('administrativeInterface')}</p>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}


