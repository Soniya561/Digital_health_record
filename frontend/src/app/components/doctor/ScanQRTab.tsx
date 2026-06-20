import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, AlertTriangle, Heart, Activity, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { api } from '@/app/utils/api';
import { getSecureContextInfo } from '@/app/utils/secureContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTranslation } from '@/app/utils/translations';
import jsQR from 'jsqr';

interface ScanQRTabProps {
  onNavigate?: (tabId: string) => void;
  onPatientSelected?: (patient: any) => void;
  selectedPatient?: any;
}

export function ScanQRTab({ onNavigate, onPatientSelected, selectedPatient }: ScanQRTabProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [isScanning, setIsScanning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const secureInfo = getSecureContextInfo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanFrameRef = useRef<number | null>(null);
  const processingRef = useRef(false);

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
    return () => stopScanning();
  }, []);

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
    } catch {
      // not a URL, continue with direct parsing
    }

    if (/^0x[a-fA-F0-9.]+$/.test(cleaned)) {
      return { type: 'publicProfile' as const, value: cleaned };
    }

    return { type: 'qrToken' as const, value: cleaned };
  };

  const setPatientFromPublicProfile = async (identifier: string) => {
    const response = await api.get(`/patients/public-profile/${encodeURIComponent(identifier)}`);
    const patient = response?.patient;
    if (!patient) throw new Error(t('patientNotFound'));

    onPatientSelected?.({
      _id: patient._id,
      id: patient._id || patient.blockchainId,
      blockchainId: patient.blockchainId,
      name: patient.name || t('unknownPatient'),
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies || [],
      chronicConditions: patient.chronicConditions || [],
      emergencyContact: patient.emergencyContact?.phone || patient.emergencyContact || '',
      lastVisit: response?.appointments?.[0]?.date || null,
    });
  };

  const setPatientFromQrToken = async (token: string) => {
    const response = await api.get(`/records/qr/${encodeURIComponent(token)}`);
    if (!response) throw new Error(t('invalidQrData'));

    if (response.type === 'patient' && response.patient) {
      const patient = response.patient;
      onPatientSelected?.({
        _id: patient._id,
        id: patient._id || patient.abhaId,
        name: patient.name || t('unknownPatient'),
        abhaId: patient.abhaId,
        blockchainId: patient.blockchainId,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
      });
      return;
    }

    if (response.type === 'single' && response.record) {
      const record = response.record;
      onPatientSelected?.({
        _id: record.patient,
        id: record.patient,
        name: t('scannedPatient'),
        allergies: [],
        chronicConditions: [],
        lastVisit: record.createdAt,
      });
      return;
    }

    throw new Error(t('unsupportedQrPayload'));
  };

  const resolveQrOrId = async (value: string) => {
    const parsed = parseScannedValue(value);
    if (!parsed.value) {
      throw new Error(t('emptyQrValue'));
    }

    if (parsed.type === 'publicProfile') {
      await setPatientFromPublicProfile(parsed.value);
      return;
    }

    await setPatientFromQrToken(parsed.value);
  };

  const resolveAndSelect = async (value: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsResolving(true);
    setScanError(null);
    try {
      await resolveQrOrId(value);
      stopScanning();
    } catch (err: any) {
      setScanError(err?.message || t('failedToReadPatientFromQr'));
    } finally {
      setIsResolving(false);
      processingRef.current = false;
    }
  };

  const handleScan = async () => {
    setScanError(null);
    setPermissionDenied(false);

    if (!secureInfo.isSecureContextOk) {
      setScanError(t('secureContextRequired'));
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError(t('cameraAccessNotSupported'));
      return;
    }

    try {
      // First, set scanning to true to render the video element
      setIsScanning(true);
      
      // Wait for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now get the camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (!videoRef.current) {
        setScanError(t('unableToAccessCamera'));
        stopScanning();
        return;
      }

      videoRef.current.srcObject = stream;
      
      // Wait for video metadata to be loaded
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, 3000);
        const onLoadedMetadata = () => {
          window.clearTimeout(timeout);
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve(null);
        };
        videoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
      });

      // Try native BarcodeDetector first, then fall back to jsQR
      let useNativeDetector = false;
      if ((window as any).BarcodeDetector) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          useNativeDetector = true;
        } catch {
          useNativeDetector = false;
        }
      }

      const scanFrame = async () => {
        if (!videoRef.current || processingRef.current) {
          scanFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        try {
          if (useNativeDetector && detectorRef.current) {
            // Use native BarcodeDetector
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0]?.rawValue;
              if (rawValue) {
                await resolveAndSelect(rawValue);
                return;
              }
            }
          } else {
            // Fall back to jsQR
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
              throw new Error('Failed to get canvas context');
            }

            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            // Only process if video has valid dimensions
            if (canvas.width > 0 && canvas.height > 0) {
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, canvas.width, canvas.height);

              if (code) {
                await resolveAndSelect(code.data);
                return;
              }
            }
          }
        } catch (err) {
          // Continue scanning
          if (err instanceof Error && err.message.includes('canvas context')) {
            console.error('Canvas error during QR scan:', err);
          }
        }

        scanFrameRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      stopScanning();
      const errorName = err?.name || '';
      const errorMsg = err?.message || t('unableToAccessCamera');
      const permissionDeniedErrors = [
        'NotAllowedError',
        'PermissionDeniedError',
        'SecurityError',
      ];

      const isPerm = permissionDeniedErrors.some((name) => errorName.includes(name)) || 
                     errorMsg.toLowerCase().includes('permission denied') ||
                     errorMsg.toLowerCase().includes('permission');

      if (isPerm) {
        setPermissionDenied(true);
        setScanError(t('cameraPermissionDenied'));
        console.warn('Camera permission denied:', errorName, errorMsg);
      } else if (['NotFoundError', 'DevicesNotFoundError'].some((name) => errorName.includes(name))) {
        setScanError(t('cameraNotFound'));
      } else if (errorName.includes('NotSupportedError')) {
        setScanError(t('cameraNotSupported'));
      } else {
        setScanError(errorMsg);
      }
    }
  };

  const handleManualResolve = async () => {
    await resolveAndSelect(manualInput);
  };

  return (
    <div className="space-y-6">
      {/* Scanner Card */}
      <Card className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {t('scanPatientQRTitle')}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t('scanPatientQRDesc')}
        </p>

        {!secureInfo.isSecureContextOk && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs p-3">
            <p>{t('secureContextRequired')}</p>
            {secureInfo.secureOriginUrl && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  window.location.href = secureInfo.secureOriginUrl;
                }}
              >
                {t('openHttps')}
              </Button>
            )}
          </div>
        )}

        {!selectedPatient ? (
          <div className="space-y-4">
            <motion.div
              className={`w-64 h-64 mx-auto border-4 rounded-2xl flex items-center justify-center ${
                isScanning ? 'border-[#0b6e4f] bg-[#e8f5e9]' : 'border-dashed border-muted bg-muted'
              }`}
              animate={
                isScanning
                  ? {
                      borderColor: ['#0b6e4f', '#2196F3', '#0b6e4f'],
                    }
                  : {}
              }
              transition={{ duration: 1.5, repeat: isScanning ? Infinity : 0 }}
            >
              {isScanning ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover rounded-xl"
                  autoPlay
                  muted
                  playsInline
                />
              ) : (
                <Camera className="w-24 h-24 text-muted-foreground" />
              )}
            </motion.div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleScan}
                disabled={isScanning || isResolving}
                icon={isResolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              >
                {isScanning ? t('scanning') : t('openCamera')}
              </Button>
              {isScanning && (
                <Button variant="outline" size="lg" onClick={stopScanning}>
                  {t('stop')}
                </Button>
              )}
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground">{t('pasteQrPrompt')}</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={t('pasteQrPlaceholder')}
                  value={manualInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleManualResolve}
                  disabled={!manualInput.trim() || isResolving}
                >
                  {isResolving ? t('reading') : t('useAction')}
                </Button>
              </div>
            </div>

            {scanError && (
              <div className="space-y-3">
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {scanError}
                </div>
                {permissionDenied && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-2">
                    <p className="font-semibold">How to allow camera access:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Chrome/Edge:</strong> Click the camera icon (blocked 🚫) next to the address bar → "Always allow on this site" → Refresh</li>
                      <li><strong>Firefox:</strong> Browser asks for permission → Click "Allow" → Refresh</li>
                      <li><strong>Safari:</strong> Settings → Privacy → Camera → Allow this website</li>
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScan}
                      className="w-full mt-2"
                    >
                      {t('retry')} 🔄
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-foreground mb-2">{t('patientIdentified')}</h3>
            <Button variant="outline" onClick={() => onPatientSelected && onPatientSelected(null)}>
              {t('scanAnotherPatient')}
            </Button>
          </motion.div>
        )}
      </Card>

      {/* Patient Summary */}
      {selectedPatient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Basic Info */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0b6e4f] to-[#2196F3] rounded-xl flex items-center justify-center text-white text-3xl font-bold">
                {(selectedPatient.name || t('patient')[0] || 'P').charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-1">{selectedPatient.name}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  <span>👤 {selectedPatient.age} {t('years')}, {selectedPatient.gender}</span>
                  <span>🆔 {selectedPatient.id}</span>
                  <span className="text-red-600 font-semibold">🩸 {selectedPatient.bloodGroup}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">{t('activePatient')}</Badge>
                  <Badge variant="default">{t('lastVisit')}: {selectedPatient.lastVisit}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Critical Alerts */}
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">⚠️ {t('criticalAlerts')}</h3>
                <p className="text-sm text-red-700">
                  {t('reviewCarefully')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-800">{t('drugAllergies')}</p>
                    <p className="text-sm text-red-600">
                      {selectedPatient.allergies.join(', ')}
                    </p>
                  </div>
                  <Badge variant="danger">{t('highRisk')}</Badge>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-orange-800">{t('chronicConditions')}</p>
                    <p className="text-sm text-orange-600">
                      {selectedPatient.chronicConditions.join(', ')}
                    </p>
                  </div>
                  <Badge variant="warning">{t('monitor')}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card hover>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalVisits')}</p>
                  <p className="text-2xl font-bold text-foreground">12</p>
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('medicalRecords')}</p>
                  <p className="text-2xl font-bold text-foreground">24</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="primary" 
              fullWidth
              onClick={() => onNavigate && onNavigate('history')}
            >
              {t('viewFullHistory')}
            </Button>
            <Button 
              variant="secondary" 
              fullWidth
              onClick={() => onNavigate && onNavigate('upload')}
            >
              {t('startConsultation')}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Info Card */}
      {!selectedPatient && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('quickSecureAccess')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('qrPrivacyDesc')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
