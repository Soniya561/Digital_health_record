import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, AlertTriangle, Heart, Activity, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { api } from '@/app/utils/api';
import { getSecureContextInfo } from '@/app/utils/secureContext';

interface ScanQRTabProps {
  onNavigate?: (tabId: string) => void;
  onPatientSelected?: (patient: any) => void;
  selectedPatient?: any;
}

export function ScanQRTab({ onNavigate, onPatientSelected, selectedPatient }: ScanQRTabProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
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
    if (!patient) throw new Error('Patient not found');

    onPatientSelected?.({
      _id: patient._id,
      id: patient._id || patient.blockchainId,
      blockchainId: patient.blockchainId,
      name: patient.name || 'Unknown Patient',
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
    if (!response) throw new Error('Invalid QR data');

    if (response.type === 'patient' && response.patient) {
      const patient = response.patient;
      onPatientSelected?.({
        _id: patient._id,
        id: patient._id || patient.abhaId,
        name: patient.name || 'Unknown Patient',
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
        name: 'Scanned Patient',
        allergies: [],
        chronicConditions: [],
        lastVisit: record.createdAt,
      });
      return;
    }

    throw new Error('Unsupported QR payload');
  };

  const resolveQrOrId = async (value: string) => {
    const parsed = parseScannedValue(value);
    if (!parsed.value) {
      throw new Error('Empty QR value');
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
      setScanError(err?.message || 'Failed to read patient from QR');
    } finally {
      setIsResolving(false);
      processingRef.current = false;
    }
  };

  const handleScan = async () => {
    setScanError(null);

    if (!secureInfo.isSecureContextOk) {
      setScanError(secureInfo.message || 'Camera access needs HTTPS. Open the app on localhost or use HTTPS.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Camera access is not supported by your browser or requires a secure (HTTPS) connection');
      return;
    }

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
              await resolveAndSelect(rawValue);
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
    await resolveAndSelect(manualInput);
  };

  return (
    <div className="space-y-6">
      {/* Scanner Card */}
      <Card className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Scan Patient QR Code
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Scan the patient's health QR code for instant access to their medical records
        </p>

        {!secureInfo.isSecureContextOk && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs p-3">
            <p>{secureInfo.message || 'Camera access needs HTTPS to work on this device.'}</p>
            {secureInfo.secureOriginUrl && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  window.location.href = secureInfo.secureOriginUrl;
                }}
              >
                Open HTTPS
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
                {isScanning ? 'Scanning...' : 'Open Camera to Scan'}
              </Button>
              {isScanning && (
                <Button variant="outline" size="lg" onClick={stopScanning}>
                  Stop
                </Button>
              )}
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground">Or paste QR link / token / blockchain ID</p>
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
              <p className="text-sm text-red-500">{scanError}</p>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Patient Identified</h3>
            <Button variant="outline" onClick={() => onPatientSelected && onPatientSelected(null)}>
              Scan Another Patient
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
                {(selectedPatient.name || 'P').charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-1">{selectedPatient.name}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  <span>👤 {selectedPatient.age} years, {selectedPatient.gender}</span>
                  <span>🆔 {selectedPatient.id}</span>
                  <span className="text-red-600 font-semibold">🩸 {selectedPatient.bloodGroup}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">Active Patient</Badge>
                  <Badge variant="default">Last visit: {selectedPatient.lastVisit}</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Critical Alerts */}
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">⚠️ Critical Alerts</h3>
                <p className="text-sm text-red-700">
                  Review carefully before prescribing medication
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-800">Drug Allergies</p>
                    <p className="text-sm text-red-600">
                      {selectedPatient.allergies.join(', ')}
                    </p>
                  </div>
                  <Badge variant="danger">High Risk</Badge>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-orange-800">Chronic Conditions</p>
                    <p className="text-sm text-orange-600">
                      {selectedPatient.chronicConditions.join(', ')}
                    </p>
                  </div>
                  <Badge variant="warning">Monitor</Badge>
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
                  <p className="text-sm text-muted-foreground">Total Visits</p>
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
                  <p className="text-sm text-muted-foreground">Medical Records</p>
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
              View Full History
            </Button>
            <Button 
              variant="secondary" 
              fullWidth
              onClick={() => onNavigate && onNavigate('upload')}
            >
              Start Consultation
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
              <h3 className="font-semibold text-foreground mb-1">Quick & Secure Access</h3>
              <p className="text-sm text-muted-foreground">
                The QR code provides instant access to patient records while maintaining privacy and security. All accesses are logged and require patient consent.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
