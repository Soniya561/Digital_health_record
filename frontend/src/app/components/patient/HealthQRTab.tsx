import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { QrCode, Download, Share2, Wifi, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';

export function HealthQRTab({ user }: { user: any }) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [qrData, setQrData] = useState<{ qrCodeDataUrl: string, blockchainId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQrData();
  }, []);

  const fetchQrData = async () => {
    try {
      const res = await api.get('/patients/me/qr-code');
      setQrData(res);
    } catch (err) {
      console.error('Failed to fetch QR data', err);
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = qrData?.qrCodeDataUrl;
  const blockchainId = qrData?.blockchainId || user?.blockchainId;

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `health-qr-${user?.name || 'patient'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/public-profile/${blockchainId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('yourHealthQR'),
          text: `Check out my secure health identity on Kerala Digital Health Portal`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Main QR Card */}
      <Card className="text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('yourHealthQR')}
          </h2>
          <p className="text-sm text-muted-foreground">
            Blockchain-backed Secure Health Identity
          </p>
        </div>

        {/* Animated QR Code */}
        <motion.div
          className="w-64 h-64 mx-auto bg-white border-4 border-[#0b6e4f] rounded-2xl p-4 mb-6 relative overflow-hidden flex items-center justify-center"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(11, 110, 79, 0.4)',
              '0 0 0 20px rgba(11, 110, 79, 0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          {loading ? (
            <Loader2 className="w-12 h-12 text-[#0b6e4f] animate-spin" />
          ) : qrUrl ? (
            <img src={qrUrl} alt="Health QR Code" className="w-full h-full" />
          ) : (
            <QrCode className="w-full h-full text-foreground" />
          )}
          
          {/* Pulse effect */}
          {!loading && (
            <motion.div
              className="absolute inset-0 border-4 border-[#0b6e4f] rounded-2xl"
              animate={{
                scale: [1, 1.1],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          )}
        </motion.div>

        {/* Patient Info */}
        <div className="bg-accent rounded-xl p-4 mb-6 text-left">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('name')}</p>
              <p className="font-medium">{user?.name || '...'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Blockchain ID</p>
              <p className="font-medium truncate text-xs" title={user?.blockchainId}>
                {user?.blockchainId ? `${user.blockchainId.substring(0, 10)}...${user.blockchainId.substring(user.blockchainId.length - 4)}` : '...'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('bloodGroup')}</p>
              <p className="font-medium text-red-600">{user?.bloodGroup || '...'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('age')}</p>
              <p className="font-medium">{user?.age || '...'} {t('years')}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
            disabled={!qrUrl}
          >
            {t('download')}
          </Button>
          <Button 
            variant="outline" 
            icon={<Share2 className="w-4 h-4" />}
            onClick={handleShare}
            disabled={!blockchainId}
          >
            {t('share')}
          </Button>
        </div>
      </Card>

      {/* Offline Access Info */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Wifi className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              ✓ {t('offlineAccessEnabled')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('offlineQRDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Critical Alerts */}
      <Card className="bg-red-50 border-red-200">
        <h3 className="font-semibold text-red-800 mb-3">⚠️ {t('criticalAlerts')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-red-700">{t('drugAllergy')}: Penicillin</span>
            <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">High</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-700">{t('condition')}: Type 2 Diabetes</span>
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs">Monitor</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
