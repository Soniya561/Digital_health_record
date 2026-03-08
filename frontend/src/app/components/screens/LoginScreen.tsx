import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, QrCode, Mic, Heart, Users, Activity, Shield, Loader2 } from 'lucide-react';
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
    .replace(/\bat\b/g, '@')
    .replace(/\bdot\b/g, '.')
    .replace(/\s+/g, '');
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

  const { isListening, error: voiceError, startListening } = useVoice((result) => {
    if (otpSent) {
      const otpValue = result.replace(/\D/g, '').slice(0, 6);
      if (otpValue) setOtp(otpValue);
      return;
    }

    const spokenEmail = normalizeSpokenEmail(result);
    if (spokenEmail) setEmail(spokenEmail);
  }, language);

  const handleSendOTP = async () => {
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
      onLogin(response.role);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQRLogin = async (role: string) => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = role === 'patient' ? 'patient@demo.com' : (role === 'doctor' ? 'doctor@demo.com' : 'admin@demo.com');
      const response = await api.post('/auth/login', { email: demoEmail, password: 'password123' });
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', role);
      onLogin(role);
    } catch (err: any) {
      setError(err.message || 'QR sign-in failed');
    } finally {
      setLoading(false);
    }
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
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <div>
                    <div className="text-2xl font-bold">2.5L+</div>
                    <div className="text-xs opacity-90">{t('livesSupported')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <div>
                    <div className="text-2xl font-bold">150+</div>
                    <div className="text-xs opacity-90">{t('hospitalsConnected')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  <div>
                    <div className="text-2xl font-bold">5M+</div>
                    <div className="text-xs opacity-90">{t('recordsDigitized')}</div>
                  </div>
                </div>
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
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1698465281093-9f09159733b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBoZWFsdGhjYXJlJTIwd29ya2VyJTIwZG9jdG9yJTIwcGF0aWVudHxlbnwxfHx8fDE3Njk4MzYyODl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Healthcare in Kerala"
                className="rounded-2xl shadow-2xl"
              />
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
                        disabled={loading}
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
                      <div className="w-48 h-48 mx-auto bg-muted rounded-xl flex items-center justify-center mb-4">
                        <QrCode className="w-24 h-24 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('scanQRToSignIn')}
                      </p>
                      <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        onClick={() => handleQRLogin(selectedRole)}
                        disabled={loading}
                      >
                        {loading ? t('authenticating') : t('openCamera')}
                      </Button>
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
