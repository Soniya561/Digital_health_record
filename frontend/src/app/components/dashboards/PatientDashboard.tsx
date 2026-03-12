import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { QrCode, FileText, MessageCircle, Calendar, Gift, AlertCircle, LogOut, Globe, User, Camera, CheckCircle2 } from 'lucide-react';
import { HealthQRTab } from '@/app/components/patient/HealthQRTab';
import { HealthRecordsTab } from '@/app/components/patient/HealthRecordsTab';
import { AIAssistantTab } from '@/app/components/patient/AIAssistantTab';
import { AppointmentsTab } from '@/app/components/patient/AppointmentsTab';
import { SchemesTab } from '@/app/components/patient/SchemesTab';
import { EmergencyTab } from '@/app/components/patient/EmergencyTab';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

interface PatientDashboardProps {
  onLogout: () => void;
  language: string;
  user: any;
}

export function PatientDashboard({ onLogout, language, user: initialUser }: PatientDashboardProps) {
  const { setLanguage } = useLanguage();
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState('qr');
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [user, setUser] = useState(initialUser);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [quickPhotoUploading, setQuickPhotoUploading] = useState(false);
  const [quickPhotoError, setQuickPhotoError] = useState<string | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanFrameRef = useRef<number | null>(null);
  const processingScanRef = useRef(false);
  const [profileData, setProfileData] = useState({
    name: initialUser?.name || '',
    dob: '',
    gender: '',
    bloodGroup: '',
    abhaId: ''
  });

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setProfileData(prev => ({ ...prev, name: initialUser.name }));
      if (!initialUser.isProfileComplete || !initialUser.photoUrl) {
        setShowProfileModal(true);
      }
    }
  }, [initialUser]);

  useEffect(() => {
    let mounted = true;
    const refreshProfile = async () => {
      try {
        const res = await api.get('/patients/me');
        if (!mounted || !res?.user) return;
        setUser(res.user);
        setProfileData((prev) => ({ ...prev, name: res.user.name || prev.name }));
      } catch (err) {
        console.error('Failed to refresh profile', err);
      }
    };
    refreshProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const stopScanning = () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (!showScanDialog) {
      stopScanning();
      setScanError(null);
      setIsResolvingScan(false);
      processingScanRef.current = false;
    }
  }, [showScanDialog]);

  useEffect(() => {
    return () => stopScanning();
  }, []);

  const normalizeScanValue = (value: string) => value.trim().replace(/\u2026/g, '...').replace(/^ID:\s*/i, '');

  const parseScannedValue = (rawValue: string) => {
    const cleaned = normalizeScanValue(rawValue);
    try {
      const parsedUrl = new URL(cleaned);
      const publicProfile = parsedUrl.searchParams.get('publicProfile');
      if (publicProfile) {
        return { type: 'publicProfile' as const, value: decodeURIComponent(publicProfile) };
      }

      const qrToken = parsedUrl.searchParams.get('qr') || parsedUrl.searchParams.get('qrId');
      if (qrToken) {
        return { type: 'qrToken' as const, value: qrToken };
      }

      const qrPathMatch = parsedUrl.pathname.match(/\/qr\/([^/?#]+)/i);
      if (qrPathMatch?.[1]) {
        return { type: 'qrToken' as const, value: qrPathMatch[1] };
      }

      const publicProfilePathMatch = parsedUrl.pathname.match(/\/public-profile\/([^/?#]+)/i);
      if (publicProfilePathMatch?.[1]) {
        return { type: 'publicProfile' as const, value: decodeURIComponent(publicProfilePathMatch[1]) };
      }
    } catch {
      // Not a URL; continue with token/id parsing.
    }

    if (/^0x[a-fA-F0-9.]+$/.test(cleaned)) {
      return { type: 'publicProfile' as const, value: cleaned };
    }

    return { type: 'qrToken' as const, value: cleaned };
  };

  const navigateFromScanValue = (rawValue: string) => {
    const parsed = parseScannedValue(rawValue);
    if (!parsed.value) {
      throw new Error('Empty QR value');
    }

    if (parsed.type === 'publicProfile') {
      window.location.href = `/?publicProfile=${encodeURIComponent(parsed.value)}`;
      return;
    }

    window.location.href = `/qr/${encodeURIComponent(parsed.value)}`;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      if (!user?.photoUrl) {
        if (!profilePhoto) {
          setProfileError('Please upload your profile photo.');
          return;
        }
        const uploadRes = await api.upload('/patients/me/photo', profilePhoto);
        if (uploadRes?.photoUrl) {
          setUser((prev: any) => ({ ...(prev || {}), photoUrl: uploadRes.photoUrl }));
        }
      }

      const payload = {
        ...profileData,
        abhaId: profileData.abhaId?.trim() || undefined,
      };
      const res = await api.put('/patients/me', payload);
      if (res.ok) {
        setUser(res.user);
        setShowProfileModal(false);
      }
    } catch (err: any) {
      console.error('Failed to update profile', err);
      setProfileError(err?.message || 'Failed to save profile details. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    try {
      if (!scanToken.trim()) {
        setScanError('Please enter or scan a QR value.');
        return;
      }
      navigateFromScanValue(scanToken);
    } catch (err: any) {
      setScanError(err?.message || 'Unable to process QR value');
    }
  };

  const resolveAndNavigate = async (value: string) => {
    if (processingScanRef.current) return;
    processingScanRef.current = true;
    setIsResolvingScan(true);
    setScanError(null);
    try {
      navigateFromScanValue(value);
    } catch (err: any) {
      setScanError(err?.message || 'Failed to read QR value');
    } finally {
      setIsResolvingScan(false);
      processingScanRef.current = false;
    }
  };

  const handleScanWithCamera = async () => {
    setScanError(null);

    if (!(window as any).BarcodeDetector) {
      setScanError('Camera QR scan is not supported in this browser. Paste QR link/token below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current || processingScanRef.current) {
          scanFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0]?.rawValue;
            if (rawValue) {
              await resolveAndNavigate(rawValue);
              return;
            }
          }
        } catch {
          // Continue scanning.
        }

        scanFrameRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      stopScanning();
      setScanError(err?.message || 'Unable to access camera');
    }
  };

  const handleEmergencyCall = (number: string) => {
    const sanitizedNumber = number.replace(/[^\d+]/g, '');
    if (!sanitizedNumber) return;
    window.location.href = `tel:${sanitizedNumber}`;
  };

  const handleQuickPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuickPhotoError(null);
    setQuickPhotoUploading(true);
    try {
      const uploadRes = await api.upload('/patients/me/photo', file);
      if (uploadRes?.photoUrl) {
        setUser((prev: any) => ({ ...(prev || {}), photoUrl: uploadRes.photoUrl }));
      }
    } catch (err: any) {
      setQuickPhotoError(err?.message || 'Failed to upload profile photo.');
    } finally {
      setQuickPhotoUploading(false);
      e.target.value = '';
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
              <div>
                <h1 className="text-2xl font-bold">{t('patientPortal')}</h1>
                <p className="text-sm opacity-90">{t('welcomeUser')}, {user?.name || 'User'}</p>
                {!user?.photoUrl && (
                  <div className="mt-2">
                    <input
                      ref={quickPhotoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleQuickPhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => quickPhotoInputRef.current?.click()}
                      disabled={quickPhotoUploading}
                      className="text-xs px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 border border-white/30"
                    >
                      {quickPhotoUploading ? 'Uploading photo...' : 'Upload Profile Photo'}
                    </button>
                    {quickPhotoError && (
                      <p className="text-xs text-red-200 mt-1">{quickPhotoError}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-inner">
                {user?.photoUrl ? (
                  <img
                    src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleEmergencyCall('108')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all border border-red-500 shadow-lg shadow-red-900/20"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">108</span>
              </button>
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

      {/* Profile Completion Modal */}
      <Dialog open={showProfileModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#0b6e4f]" /> Complete Your Profile
            </DialogTitle>
            <DialogDescription>
              Please provide these details for the first time. Some fields will become permanent after submission.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Profile Photo (Required, cannot be changed later)</label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Full Name (Static after submit)</label>
              <Input 
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Date of Birth</label>
              <Input 
                type="date"
                required
                value={profileData.dob}
                onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Gender</label>
              <Select 
                onValueChange={(val) => setProfileData({ ...profileData, gender: val })}
                required
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Blood Group (Static after submit)</label>
              <Select 
                onValueChange={(val) => setProfileData({ ...profileData, bloodGroup: val })}
                required
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">ABHA ID (Static after submit)</label>
              <Input 
                placeholder="Enter ABHA ID"
                value={profileData.abhaId}
                onChange={(e) => setProfileData({ ...profileData, abhaId: e.target.value })}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <Button type="submit" disabled={savingProfile} className="w-full bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white mt-4">
              <CheckCircle2 className="w-4 h-4 mr-2" /> {savingProfile ? 'Saving...' : 'Save Profile & Generate Blockchain ID'}
            </Button>
            {profileError && <p className="text-sm text-red-400">{profileError}</p>}
          </form>
        </DialogContent>
      </Dialog>

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
            <div className="w-56 h-56 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center mb-4 bg-zinc-900/50 overflow-hidden">
              {isScanning ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <>
                  <Camera className="w-12 h-12 text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Camera Preview</p>
                </>
              )}
            </div>

            <div className="flex gap-2 w-full mb-4">
              <Button
                type="button"
                onClick={handleScanWithCamera}
                disabled={isScanning || isResolvingScan}
                className="flex-1 bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white"
              >
                {isScanning ? 'Scanning...' : 'Open Camera'}
              </Button>
              {isScanning && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopScanning}
                  className="border-zinc-700"
                >
                  Stop
                </Button>
              )}
            </div>
            
            <form onSubmit={handleScanSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Or enter token/link manually</label>
                <Input 
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  placeholder="Paste QR token here..."
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <Button type="submit" disabled={isResolvingScan} className="w-full bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white">
                {isResolvingScan ? 'Reading...' : 'View Record Details'}
              </Button>
              {scanError && <p className="text-sm text-red-400">{scanError}</p>}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>{t('keralaHealthPortal')} • {t('poweredByGov')}</p>
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
