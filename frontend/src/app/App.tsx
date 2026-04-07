import React, { useState, useEffect } from 'react';
import { LanguageSelectionScreen } from '@/app/components/screens/LanguageSelectionScreen';
import { LoginScreen } from '@/app/components/screens/LoginScreen';
import { PatientDashboard } from '@/app/components/dashboards/PatientDashboard';
import { DoctorDashboard } from '@/app/components/dashboards/DoctorDashboard';
import { AdminDashboard } from '@/app/components/dashboards/AdminDashboard';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';

import { RecordQRView } from '@/app/components/patient/RecordQRView';
import { PublicProfileView } from '@/app/components/patient/PublicProfileView';

type AppScreen = 'language' | 'login' | 'dashboard';
type UserRole = 'patient' | 'doctor' | 'admin' | null;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('language');
  const { language, setLanguage } = useLanguage();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [user, setUser] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [publicBlockchainId, setPublicBlockchainId] = useState<string | null>(null);

  useEffect(() => {
    // Check for QR/public profile in URL (path or query string)
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const queryQrToken = params.get('qr');
    const queryPublicBlockchainId = params.get('publicProfile');

    if (queryQrToken) {
      setQrToken(queryQrToken);
    } else if (queryPublicBlockchainId) {
      setPublicBlockchainId(queryPublicBlockchainId);
    } else if (path.startsWith('/qr/')) {
      const token = path.split('/qr/')[1];
      if (token) {
        setQrToken(token);
      }
    } else if (path.startsWith('/public-profile/')) {
      const bId = path.split('/public-profile/')[1];
      if (bId) {
        setPublicBlockchainId(bId);
      }
    }

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setUserRole(role.toLowerCase() as UserRole);
      setCurrentScreen('dashboard');
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/api/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language_locked', lang);
    setCurrentScreen('login');
  };

  const handleLogin = (role: string) => {
    const lowerRole = role.toLowerCase() as UserRole;
    setUserRole(lowerRole);
    setCurrentScreen('dashboard');
    fetchProfile();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('language_locked');
    setUserRole(null);
    setUser(null);
    setCurrentScreen('language');
    setLanguage('en');
  };

  return (
    <div className="app">
      {/* QR Record View - Overlays everything when scanning */}
      {qrToken && (
        <RecordQRView 
          token={qrToken} 
          language={language} 
          onClose={() => {
            setQrToken(null);
            window.history.pushState({}, '', '/');
          }} 
        />
      )}

      {/* Public Profile View - Overlays everything when scanning blockchain QR */}
      {publicBlockchainId && (
        <PublicProfileView 
          blockchainId={publicBlockchainId} 
          language={language} 
          onClose={() => {
            setPublicBlockchainId(null);
            window.history.pushState({}, '', '/');
          }} 
        />
      )}

      {/* Language Selection Screen */}
      {currentScreen === 'language' && (
        <LanguageSelectionScreen onLanguageSelect={handleLanguageSelect} />
      )}

      {/* Login Screen */}
      {currentScreen === 'login' && (
        <LoginScreen onLogin={handleLogin} language={language} />
      )}

      {/* Dashboard - Role-based rendering */}
      {currentScreen === 'dashboard' && userRole === 'patient' && (
        <PatientDashboard onLogout={handleLogout} language={language} user={user} />
      )}

      {currentScreen === 'dashboard' && userRole === 'doctor' && (
        <DoctorDashboard onLogout={handleLogout} language={language} user={user} />
      )}

      {currentScreen === 'dashboard' && userRole === 'admin' && (
        <AdminDashboard onLogout={handleLogout} language={language} user={user} />
      )}
    </div>
  );
}
