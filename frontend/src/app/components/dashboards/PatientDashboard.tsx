import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QrCode, FileText, MessageCircle, Calendar, Gift, AlertCircle, LogOut, Globe, User, Camera } from 'lucide-react';
import { HealthQRTab } from '@/app/components/patient/HealthQRTab';
import { HealthRecordsTab } from '@/app/components/patient/HealthRecordsTab';
import { AIAssistantTab } from '@/app/components/patient/AIAssistantTab';
import { AppointmentsTab } from '@/app/components/patient/AppointmentsTab';
import { SchemesTab } from '@/app/components/patient/SchemesTab';
import { EmergencyTab } from '@/app/components/patient/EmergencyTab';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface PatientDashboardProps {
  onLogout: () => void;
  language: string;
  user: any;
}

export function PatientDashboard({ onLogout, language, user }: PatientDashboardProps) {
  const { setLanguage } = useLanguage();
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState('qr');
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanToken, setScanToken] = useState('');

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanToken) {
      window.location.href = `/qr/${scanToken}`;
    }
  };

  const tabs = [
    { id: 'qr', name: t('myHealthQR'), icon: QrCode, color: '#0b6e4f' },
    { id: 'records', name: t('healthRecords'), icon: FileText, color: '#2196F3' },
    { id: 'ai', name: t('aiAssistant'), icon: MessageCircle, color: '#9c27b0' },
    { id: 'appointments', name: t('appointments'), icon: Calendar, color: '#ff9800' },
    { id: 'schemes', name: t('schemes'), icon: Gift, color: '#4caf50' },
    { id: 'emergency', name: t('emergency'), icon: AlertCircle, color: '#f44336' },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'bn', name: 'বাংলা' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0b6e4f] to-[#2196F3] text-white py-6 mb-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('patientPortal')}</h1>
                <p className="text-sm opacity-90">{t('welcomeUser')}, {user?.name || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowScanDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/30"
              >
                <Camera className="w-5 h-5" />
                <span className="hidden md:inline">{t('scanQR')}</span>
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs uppercase">{language}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-zinc-800 transition-colors ${language === lang.code ? 'text-[#10b981] font-bold' : 'text-gray-400'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
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

      {/* Mobile-First Tab Navigation */}
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'qr' && <HealthQRTab user={user} />}
          {activeTab === 'records' && <HealthRecordsTab onNavigate={setActiveTab} />}
          {activeTab === 'ai' && <AIAssistantTab />}
          {activeTab === 'appointments' && <AppointmentsTab />}
          {activeTab === 'schemes' && <SchemesTab onNavigate={setActiveTab} />}
          {activeTab === 'emergency' && <EmergencyTab />}
        </motion.div>
      </div>

      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#0b6e4f]" /> {t('scanHealthQR')}
            </DialogTitle>
            <DialogDescription>
              {t('scanQRDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-48 h-48 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center mb-6 bg-zinc-900/50">
              <Camera className="w-12 h-12 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500">{t('Camera Preview')}</p>
            </div>
            
            <form onSubmit={handleScanSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t('Or enter token manually')}</label>
                <Input 
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  placeholder="Paste QR token here..."
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <Button type="submit" className="w-full bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white">
                {t('View Record Details')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>{t('keralaHealthPortal')} • {t('poweredByGov')}</p>
          <p className="mt-1 text-xs">{t('sihInitiative')}</p>
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
