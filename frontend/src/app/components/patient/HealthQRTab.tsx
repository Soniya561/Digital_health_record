import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { QrCode, Download, Share2, Wifi, Loader2, ExternalLink } from 'lucide-react';
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
  const [showShareLink, setShowShareLink] = useState(false);

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
  const shareUrl = blockchainId
    ? `${window.location.origin}/?publicProfile=${encodeURIComponent(blockchainId)}`
    : '';

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
    if (!shareUrl) return;
    setShowShareLink(!showShareLink);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Health QR Profile',
          text: `View my verified health profile secured by Blockchain`,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      alert(t('Link copied to clipboard'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert(t('Link copied to clipboard'));
      } catch (err) {
        alert('Share link: ' + shareUrl);
      }
      document.body.removeChild(textArea);
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
            {t('blockchainBackedIdentity')}
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
        <div className="bg-accent rounded-xl p-4 mb-6 text-left relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-2 gap-3 text-sm flex-1">
              <div>
                <p className="text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{user?.name || '...'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('blockchainId')}</p>
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
            {user?.photoUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#0b6e4f]/20 ml-4 shrink-0">
                <img
                  src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
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
            variant={showShareLink ? "default" : "outline"} 
            icon={<Share2 className="w-4 h-4" />}
            onClick={handleShare}
            disabled={!shareUrl}
            className={showShareLink ? "bg-[#0b6e4f] text-white hover:bg-[#0b6e4f]/90" : ""}
          >
            {t('share')}
          </Button>
        </div>

        {/* Share Link Display */}
        {showShareLink && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-left"
          >
            <p className="text-xs text-muted-foreground mb-2">{t('shareLink')}</p>
            <div className="flex gap-2 items-center">
              <input 
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-400"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button 
                size="sm"
                className="bg-[#0b6e4f] text-white hover:bg-[#0b6e4f]/90 h-8"
                onClick={() => window.open(shareUrl, '_blank')}
                icon={<ExternalLink className="w-3 h-3" />}
              >
                {t('openLink')}
              </Button>
            </div>
          </motion.div>
        )}
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
            <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">{t('high')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-700">{t('condition')}: {t('type2Diabetes')}</span>
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs">{t('monitor')}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
