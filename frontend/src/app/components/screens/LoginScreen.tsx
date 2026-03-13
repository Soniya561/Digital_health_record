import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, QrCode, Mic, Heart, Users, Activity, Shield, Loader2, Camera } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { api } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import { useVoice } from '@/app/hooks/useVoice';

interface LoginScreenProps {
  onLogin: (role: string) => void;
  language: string;
}

function normalizeSpokenEmail(value: string) {
  return value
    .toLowerCase()
    .replace(/\bat the rate\b/g, '@')
    .replace(/\bunderscore\b/g, '_')
    .replace(/\bdash\b/g, '-')
    .replace(/\bhyphen\b/g, '-')
    .replace(/\bplus\b/g, '+')
    .replace(/\bat\b/g, '@')
    .replace(/\bdot\b/g, '.')
    .replace(/\s+/g, '');
}

function extractEmailFromSpeech(value: string) {
  const lower = value.toLowerCase().trim();
  const spokenEmailMatch = lower.match(/[a-z0-9._%+\-\s]+(?:at the rate|at)[a-z0-9.\-\s]+(?:dot)[a-z.\s]+/i);
  if (spokenEmailMatch?.[0]) {
    return normalizeSpokenEmail(spokenEmailMatch[0]);
  }

  const commandPrefixMatch = lower.match(
    /(?:email(?:\s+for\s+login)?|login\s+email|my\s+email(?:\s+is)?|email\s+address(?:\s+is)?)\s+(.+)/
  );
  if (commandPrefixMatch?.[1]) {
    return normalizeSpokenEmail(commandPrefixMatch[1]);
  }

  return normalizeSpokenEmail(lower);
}

export function LoginScreen({ onLogin, language }: LoginScreenProps) {
  const { t } = useTranslation(language);
  const [loginMethod, setLoginMethod] = useState<'email' | 'qr'>('email');
  const [email, setEmail] = useState('');
  const [showImpactStats, setShowImpactStats] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loginPhoto, setLoginPhoto] = useState<File | null>(null);
  const [loginPhotoPreview, setLoginPhotoPreview] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanFrameRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (loginPhotoPreview) {
        URL.revokeObjectURL(loginPhotoPreview);
      }
      stopScanning();
    };
  }, [loginPhotoPreview]);

  useEffect(() => {
    if (loginMethod !== 'qr') {
      stopScanning();
    }
  }, [loginMethod]);

  const { isListening, error: voiceError, startListening } = useVoice((result) => {
    if (otpSent) {
      const otpValue = result.replace(/\D/g, '').slice(0, 6);
      if (otpValue) setOtp(otpValue);
      return;
    }

    const spokenEmail = extractEmailFromSpeech(result);
    if (spokenEmail) setEmail(spokenEmail);
  }, language);

  const handleSendOTP = async () => {
    if (!loginPhoto) {
      setError('Please upload your photo first');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role first');
      return;
    }
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/send-otp', { email, role: selectedRole.toUpperCase() });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (role: string) => {
    if (!loginPhoto) {
      setError('Please upload your photo first');
      return;
    }
    if (!otpSent) {
      setError('Please send OTP first');
      return;
    }
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', response.role);
      const photoSaved = await persistLoginPhotoIfNeeded(response.role);
      if (!photoSaved) return;
      onLogin(response.role);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQRLogin = async (role: string) => {
    if (!loginPhoto) {
      setError('Please upload your photo first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const demoEmail = role === 'patient' ? 'patient@demo.com' : (role === 'doctor' ? 'doctor@demo.com' : 'admin@demo.com');
      const response = await api.post('/auth/login', { email: demoEmail, password: 'password123' });
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', role);
      const photoSaved = await persistLoginPhotoIfNeeded(role);
      if (!photoSaved) return;
      onLogin(role);
    } catch (err: any) {
      setError(err.message || 'QR sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const persistLoginPhotoIfNeeded = async (role: string) => {
    if (role?.toLowerCase() !== 'patient' || !loginPhoto) {
      return true;
    }

    try {
      const me = await api.get('/patients/me');
      if (me?.user?.photoUrl) {
        return true;
      }

      await api.upload('/patients/me/photo', loginPhoto);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to save profile photo';
      if (msg.toLowerCase().includes('cannot be changed once uploaded')) {
        return true;
      }
      setError(msg);
      return false;
    }
  };

  const handleLoginPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    setError(null);
    setLoginPhoto(file);
    if (loginPhotoPreview) {
      URL.revokeObjectURL(loginPhotoPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setLoginPhotoPreview(previewUrl);
  };

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

  const normalizeShortId = (value: string) => value.trim().replace(/\u2026/g, '...').replace(/^ID:\s*/i, '');

  const parseScannedValue = (rawValue: string) => {
    const cleaned = normalizeShortId(rawValue);
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

      const pathMatch = parsedUrl.pathname.match(/\/qr\/([^/?#]+)/i);
      if (pathMatch?.[1]) {
        return { type: 'qrToken' as const, value: pathMatch[1] };
      }
      const publicPathMatch = parsedUrl.pathname.match(/\/public-profile\/([^/?#]+)/i);
      if (publicPathMatch?.[1]) {
        return { type: 'publicProfile' as const, value: publicPathMatch[1] };
      }
    } catch {
      // not a URL, continue with direct parsing
    }

    if (/^0x[a-fA-F0-9.]+$/.test(cleaned)) {
      return { type: 'publicProfile' as const, value: cleaned };
    }

    return { type: 'qrToken' as const, value: cleaned };
  };

  const openScannedResult = (rawValue: string) => {
    const parsed = parseScannedValue(rawValue);
    if (!parsed.value) {
      throw new Error('Empty QR value');
    }

    if (parsed.type === 'publicProfile') {
      window.location.href = `/public-profile/${encodeURIComponent(parsed.value)}`;
      return;
    }

    window.location.href = `/qr/${encodeURIComponent(parsed.value)}`;
  };

  const resolveAndOpen = async (value: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsResolving(true);
    setScanError(null);
    try {
      openScannedResult(value);
      stopScanning();
    } catch (err: any) {
      setScanError(err?.message || 'Failed to read QR value');
    } finally {
      setIsResolving(false);
      processingRef.current = false;
    }
  };

  const handleScan = async () => {
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
        if (!videoRef.current || !detectorRef.current || processingRef.current) {
          scanFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0]?.rawValue;
            if (rawValue) {
              await resolveAndOpen(rawValue);
              return;
            }
          }
        } catch {
          // keep scanning
        }

        scanFrameRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      stopScanning();
      setScanError(err?.message || 'Unable to access camera');
    }
  };

  const handleManualResolve = async () => {
    await resolveAndOpen(manualInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900">
      {showImpactStats && (
        <motion.div
          className="bg-gradient-to-r from-[#0b6e4f] to-[#2196F3] text-white py-4"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-8">
              </div>
              <button
                onClick={() => setShowImpactStats(false)}
                className="text-xs opacity-75 hover:opacity-100"
              >
                X
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative group">
              {loginPhotoPreview ? (
                <img
                  src={loginPhotoPreview}
                  alt="Login Profile"
                  className="rounded-2xl shadow-2xl w-full aspect-square object-cover"
                />
              ) : (
                <div 
                  className="w-full aspect-square bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-all"
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (input) input.click();
                  }}
                >
                  <div className="p-6 bg-zinc-800/50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-12 h-12 text-[#10b981]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Upload Your Image</h3>
                  <p className="text-zinc-400 text-sm">To verify your identity and continue</p>
                </div>
              )}
              <div className="absolute bottom-6 left-6 right-6 bg-zinc-900/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-zinc-800">
                <p className="text-sm font-medium text-[#10b981]">
                  {t('empoweringMigrantWorkers')}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {t('accessAnywhere')}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-xl border border-zinc-800 p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-[#0b6e4f] to-[#2196F3] rounded-xl">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t('welcome')}</h2>
                    <p className="text-sm text-gray-400">{t('signIn')}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {voiceError && (
                <div className="mb-4 p-3 bg-amber-900/40 border border-amber-500 rounded-lg text-amber-100 text-sm">
                  Voice input: {voiceError}
                </div>
              )}

              {!selectedRole ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">Upload your photo first:</p>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLoginPhotoChange}
                      label="Photo"
                    />
                    {loginPhotoPreview && (
                      <img
                        src={loginPhotoPreview}
                        alt="Uploaded preview"
                        className="w-20 h-20 rounded-full object-cover border border-zinc-700"
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">Select your role to continue:</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="justify-start h-14 text-lg"
                      onClick={() => setSelectedRole('patient')}
                    >
                      <Users className="w-5 h-5 mr-3" />
                      {t('patient')}
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-14 text-lg"
                      onClick={() => setSelectedRole('doctor')}
                    >
                      <Activity className="w-5 h-5 mr-3" />
                      {t('doctor')}
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-14 text-lg"
                      onClick={() => setSelectedRole('admin')}
                    >
                      <Shield className="w-5 h-5 mr-3" />
                      {t('admin')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#10b981] capitalize flex items-center gap-2">
                      Logging in as {selectedRole}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRole(null);
                        setLoginMethod('email');
                        setOtpSent(false);
                        setEmail('');
                        setOtp('');
                        setError(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Change Role
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-zinc-800/50 rounded-lg">
                    <button
                      onClick={() => setLoginMethod('email')}
                      className={`py-2.5 rounded-md text-sm font-medium transition-all ${
                        loginMethod === 'email'
                          ? 'bg-zinc-700 shadow-sm text-[#10b981]'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Mail className="w-4 h-4 mx-auto mb-1" />
                      Gmail
                    </button>
                    <button
                      onClick={() => setLoginMethod('qr')}
                      className={`py-2.5 rounded-md text-sm font-medium transition-all ${
                        loginMethod === 'qr'
                          ? 'bg-zinc-700 shadow-sm text-[#10b981]'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mx-auto mb-1" />
                      {t('qrCode')}
                    </button>
                  </div>

                  {loginMethod === 'email' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <Input
                        type="email"
                        placeholder={t('enterEmailAddress')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail className="w-5 h-5" />}
                        label="Gmail Address"
                        disabled={!loginPhoto}
                      />

                      {otpSent && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            icon={<Shield className="w-5 h-5" />}
                            label="OTP"
                            disabled={!loginPhoto}
                          />
                        </motion.div>
                      )}

                      <button
                        onClick={startListening}
                        disabled={isListening}
                        className="flex items-center gap-2 text-sm text-[#2196F3] hover:underline disabled:opacity-50"
                      >
                        {isListening ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        {isListening ? 'Listening...' : t('useVoiceInput')}
                      </button>

                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={otpSent ? () => handleEmailLogin(selectedRole) : handleSendOTP}
                        disabled={loading || !loginPhoto}
                      >
                        {loading ? t('sending') : (otpSent ? t('continue') : t('sendOTP'))}
                      </Button>
                    </motion.div>
                  )}

                  {loginMethod === 'qr' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-6"
                    >
                      <div className="w-56 h-56 mx-auto bg-muted rounded-xl flex items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-zinc-700">
                        {isScanning ? (
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <QrCode className="w-24 h-24 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('scanQRToSignIn')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="lg"
                          fullWidth
                          onClick={handleScan}
                          disabled={isScanning || isResolving}
                          icon={isResolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        >
                          {isScanning ? 'Scanning...' : t('openCamera')}
                        </Button>
                        {isScanning && (
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={stopScanning}
                          >
                            Stop
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 mt-4">
                        <p className="text-xs text-muted-foreground">Or paste QR link / token</p>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Paste QR value"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={handleManualResolve}
                            disabled={!manualInput.trim() || isResolving}
                          >
                            {isResolving ? 'Reading...' : 'Use'}
                          </Button>
                        </div>
                      </div>
                      {scanError && (
                        <p className="text-sm text-red-500 mt-3">{scanError}</p>
                      )}
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQRLogin(selectedRole)}
                          disabled={loading}
                        >
                          {loading ? t('authenticating') : 'Use Demo Login'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <motion.div
              className="mt-6 bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-zinc-800 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs text-gray-400 text-center mb-2">
                {t('accessibleForEveryone')}
              </p>
              <div className="flex justify-center gap-4 text-xs text-gray-400">
                <span>{t('voiceSupport')}</span>
                <span>{t('fiveLanguages')}</span>
                <span>{t('worksOffline')}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
