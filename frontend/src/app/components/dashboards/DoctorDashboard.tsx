import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QrCode, FileText, Upload, Sparkles, Calendar, LogOut, User, Globe } from 'lucide-react';
import { ScanQRTab } from '@/app/components/doctor/ScanQRTab';
import { PatientHistoryTab } from '@/app/components/doctor/PatientHistoryTab';
import { UploadRecordsTab } from '@/app/components/doctor/UploadRecordsTab';
import { AIClinicalTab } from '@/app/components/doctor/AIClinicalTab';
import { MyAppointmentsTab } from '@/app/components/doctor/MyAppointmentsTab';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';

interface DoctorDashboardProps {
  user: any;
  onLogout: () => void;
}

export function DoctorDashboard({ user, onLogout }: DoctorDashboardProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const tabs = [
    { id: 'scan', name: t('scanPatientQR'), icon: QrCode, color: '#0b6e4f' },
    { id: 'history', name: t('patientHistory'), icon: FileText, color: '#2196F3' },
    { id: 'upload', name: t('uploadRecords'), icon: Upload, color: '#ff9800' },
    { id: 'ai', name: t('aiClinicalAssistant'), icon: Sparkles, color: '#9c27b0' },
    { id: 'appointments', name: t('myAppointments'), icon: Calendar, color: '#4caf50' },
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
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-inner">
                {user?.photoUrl ? (
                  <img
                    src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                    alt={user?.name || 'Doctor'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('doctorPortal')}</h1>
                <p className="text-sm opacity-90">{t('welcomeUser')}, {user?.name || 'Doctor'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs uppercase">{language}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'scan' && (
            <ScanQRTab 
              onNavigate={setActiveTab} 
              onPatientSelected={setSelectedPatient}
              selectedPatient={selectedPatient}
            />
          )}
          {activeTab === 'history' && (
            <PatientHistoryTab patient={selectedPatient} />
          )}
          {activeTab === 'upload' && (
            <UploadRecordsTab patient={selectedPatient} />
          )}
          {activeTab === 'ai' && <AIClinicalTab patient={selectedPatient} />}
          {activeTab === 'appointments' && <MyAppointmentsTab />}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>{t('keralaHealthPortal')} • {t('healthcareProfessionalInterface')}</p>
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
