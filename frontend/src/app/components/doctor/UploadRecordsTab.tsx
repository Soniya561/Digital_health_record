import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, Camera, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { getSecureContextInfo } from '@/app/utils/secureContext';

interface UploadRecordsTabProps {
  patient?: any;
}

function resolvePatientIdentifier(patient: any): string {
  if (!patient) return '';
  return String(
    patient._id ||
    patient.patientId ||
    patient.blockchainId ||
    patient.id ||
    ''
  ).trim();
}

export function UploadRecordsTab({ patient }: UploadRecordsTabProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const secureInfo = getSecureContextInfo();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState('');
  const [recordType, setRecordType] = useState('prescription');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hospital, setHospital] = useState('Medical College Hospital, Trivandrum');
  const [doctor, setDoctor] = useState('Dr. Anjali Menon');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Camera states
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const nextIdentifier = resolvePatientIdentifier(patient);
    if (nextIdentifier) {
      setPatientId(nextIdentifier);
    }
  }, [patient]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCapturing]);

  const startCamera = async () => {
    setError(null);
    
    if (!secureInfo.isSecureContextOk) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      setError(secureInfo.message || 'Camera access needs HTTPS. Open the app on localhost or use HTTPS.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native camera app via file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setError('Camera access is not supported by your browser or requires a secure (HTTPS) connection');
      }
      return;
    }

    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCapturing(true);
    } catch (err: any) {
      const message = err?.message || 'Unable to access camera';
      const isSecureError = /secure|https|Only secure origins/i.test(message) || err?.name === 'SecurityError';
      if (isSecureError && fileInputRef.current) {
        fileInputRef.current.click();
      }
      setError(message);
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCameraLoading(false);
  };

  const takePhoto = () => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setTitle(`Photo ${new Date().toLocaleString()}`);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const recordTypes = [
    { id: 'prescription', name: 'Prescription', icon: '💊' },
    { id: 'lab', name: 'Lab Report', icon: '🧪' },
    { id: 'imaging', name: 'X-Ray/Scan', icon: '🩻' },
    { id: 'notes', name: 'Clinical Notes', icon: '📝' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setTitle(event.target.files[0].name.split('.')[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const trimmedPatientId = patientId.trim();
    if (!trimmedPatientId) {
      setError('Please enter a patient identifier before upload');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      await api.upload('/records', selectedFile, {
        title,
        category: recordType,
        description,
        hospital,
        doctor,
        patientId: trimmedPatientId,
      });
      setUploaded(true);
      setTimeout(() => {
        setUploaded(false);
        setSelectedFile(null);
        setTitle('');
        setDescription('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('uploadRecords')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('Add prescriptions, scans, and notes to patient records')}
        </p>
      </Card>

      {/* Patient Selection */}
      <Card>
        <h3 className="font-semibold text-foreground mb-3">{t('Select Patient')}</h3>
        <Input
          type="text"
          placeholder={t("Enter Patient ID, blockchain ID, ABHA ID, or email")}
          icon={<FileText className="w-5 h-5" />}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <div className="mt-3 p-3 bg-accent rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">
                {patient?.name || t('Unknown Patient')}
              </p>
              <p className="text-sm text-foreground font-medium">{t('id')}: {patientId || '-'}</p>
            </div>
            <Badge variant={patientId.trim() ? 'success' : 'warning'}>
              {patientId.trim() ? t('Selected') : t('Required')}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Record Type Selection */}
      <Card>
        <h3 className="font-semibold text-foreground mb-3">{t('Record Type')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recordTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setRecordType(type.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                recordType === type.id
                  ? 'border-[#0b6e4f] bg-[#e8f5e9]'
                  : 'border-border hover:border-[#0b6e4f]/50'
              }`}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="text-sm font-medium">{t(type.name)}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Upload Area */}
      <Card>
        <h3 className="font-semibold text-foreground mb-3">{t('Upload Document')}</h3>
        
        {error && !uploaded && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <X className="w-4 h-4" onClick={() => setError(null)} />
            {error}
          </div>
        )}

        {!selectedFile ? (
          <div className="space-y-4">
            {isCapturing ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-purple-500 flex items-center justify-center">
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 text-white">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-xs">{t('Starting camera...')}</p>
                    </div>
                  )}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    onLoadedMetadata={() => setCameraLoading(false)}
                    className="w-full h-full object-cover" 
                  />
                  {!cameraLoading && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <motion.button
                        onClick={takePhoto}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="rounded-full w-14 h-14 bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg transition-all"
                        aria-label="Take Photo"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white" />
                      </motion.button>
                      <Button onClick={stopCamera} variant="outline" className="rounded-full w-14 h-14 p-0 flex items-center justify-center bg-black/50 border-white text-white">
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <motion.label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-[#0b6e4f] hover:bg-accent transition-all"
                whileHover={{ scale: 1.01 }}
              >
                <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="font-semibold text-foreground mb-1">
                  {t('Drop files here or click to upload')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('Supports PDF, JPG, PNG up to 10MB')}
                </p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </motion.label>
            )}

            {!isCapturing && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">{t('Or')}</p>
                <Button onClick={startCamera} variant="outline" icon={<Camera className="w-4 h-4" />}>
                  {t('Take Photo')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!uploaded ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-accent rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {selectedFile.type.startsWith('image/') ? (
                      <div className="w-12 h-12 rounded overflow-hidden border border-border bg-black">
                        <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileText className="w-8 h-8 text-[#0b6e4f]" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {t('Patient ID')}: {patientId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>

                {/* AI Auto-tagging */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg mb-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-zinc-100 mb-1">
                        {t('AI Auto-Tagging')}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {t('Document analyzed and tagged automatically')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder={t("Record Title")}
                    label={t("name")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder={t("Add notes or description...")}
                    label={t("notes")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder={t("Hospital Name")}
                    label={t("Hospital")}
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder={t("Doctor Name")}
                    label={t("Doctor")}
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                  />
                  
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleUpload}
                    disabled={uploading}
                    icon={uploading ? undefined : <Upload className="w-5 h-5" />}
                    className="mt-4"
                  >
                    {uploading ? t('sending') : t('Upload & Link to Patient')}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t('Upload Successful!')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("Record has been added to patient's health history")}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </Card>

      {/* Recent Uploads */}
      <Card>
        <h3 className="font-semibold text-foreground mb-3">{t('Recent Uploads')}</h3>
        <div className="space-y-2">
          {[
            { name: 'Blood Test Report', date: '2 hours ago', type: 'Lab Report' },
            { name: 'Prescription - Diabetes', date: 'Yesterday', type: 'Prescription' },
          ].map((item, index) => (
            <div
              key={index}
              className="p-3 bg-muted rounded-lg flex items-center justify-between hover:bg-accent transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#0b6e4f]" />
                <div>
                  <p className="font-medium text-sm text-foreground">{t(item.name)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(item.type)} • {item.date}
                  </p>
                </div>
              </div>
              <Badge variant="success">✓</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
