import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Eye, Share2, Calendar, Lock, Unlock, Loader2, Upload, Plus, QrCode } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import { api } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';

interface MedicalRecord {
  _id: string;
  type?: string;
  category: string;
  title: string;
  createdAt: string;
  hospital: string;
  doctor: string;
  consentEnabled?: boolean;
  qrToken?: string;
  description?: string;
  fileUrl?: string;
}

interface HealthRecordsTabProps {
  onNavigate?: (tabId: string) => void;
}

export function HealthRecordsTab({ onNavigate }: HealthRecordsTabProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await api.get('/records');
      setRecords(response.records);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [initialShowQR, setInitialShowQR] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedRecord, setUploadedRecord] = useState<MedicalRecord | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const handleUpload = async (formData: any) => {
    setUploading(true);
    try {
      const response = await api.upload('/records', formData.file, {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        hospital: formData.hospital,
        doctor: formData.doctor,
      });
      
      const newRecord = response.record;
      setRecords([newRecord, ...records]);
      setUploadedRecord(newRecord);
      
      // Generate QR token for the new record
      const qrRes: any = await api.post(`/records/${newRecord._id}/qr`, {});
      setQrToken(qrRes.qrToken);
      
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      prescription: 'bg-blue-900/50 text-blue-400',
      lab: 'bg-purple-900/50 text-purple-400',
      imaging: 'bg-green-900/50 text-green-400',
      vaccination: 'bg-teal-900/50 text-teal-400',
      consultation: 'bg-indigo-900/50 text-indigo-400',
      discharge: 'bg-orange-900/50 text-orange-400',
    };
    return colors[category as keyof typeof colors] || 'bg-zinc-800 text-gray-300';
  };

  const toggleConsent = async (recordId: string) => {
    try {
      const response = await api.patch(`/records/${recordId}/consent`);
      setRecords(records.map(r => r._id === recordId ? response.record : r));
    } catch (err: any) {
      console.error('Toggle consent failed', err);
      alert(err.message || 'Toggle consent failed');
    }
  };

  const handleDownload = async (recordId: string, title?: string) => {
    try {
      await api.download(`/records/${recordId}/download`, title || 'record');
    } catch (err: any) {
      console.error('Download failed', err);
      alert(err.message || 'Download failed');
    }
  };

  const handleShare = async (recordId: string) => {
    try {
      const res: any = await api.post(`/records/${recordId}/qr`, {});
      const token = res.qrToken;
      const shareLink = `${window.location.origin}/qr/${token}`;
      await navigator.clipboard.writeText(shareLink).catch(() => {});
      alert('Share link copied to clipboard');
      if (onNavigate) {
        onNavigate('qr');
      }
    } catch (err: any) {
      console.error('Share failed', err);
      alert(err.message || 'Share failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {t('myHealthRecords')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('timelineBasedHistory')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white"
              icon={<Plus className="w-4 h-4" />}
            >
              {t('uploadRecord')}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0b6e4f] animate-spin mb-4" />
          <p className="text-muted-foreground">{t('loadingRecords')}</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-red-900/20 border border-red-900/50 rounded-xl">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchRecords} variant="outline">Retry</Button>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">{t('noRecordsFound')}</h3>
          <p className="text-muted-foreground mt-1">{t('noRecordsDesc')}</p>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-4">
          {records.map((record, index) => (
            <motion.div
              key={record._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover className="relative">
                {/* Timeline Line */}
                {index !== records.length - 1 && (
                  <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-border -mb-4" />
                )}

                <div className="flex gap-4">
                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${getCategoryColor(record.category)} flex items-center justify-center`}>
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{t(record.title)}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(record.createdAt).toLocaleDateString(language === 'en' ? 'en-IN' : language, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(record.category)}`}>
                        {record.type || record.category}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      <p>🏥 {record.hospital || 'Not specified'}</p>
                      <p>👨‍⚕️ {record.doctor || 'Not specified'}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={() => {
                          setInitialShowQR(false);
                          setSelectedRecord(record);
                        }}
                      >
                        {t('view')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<QrCode className="w-4 h-4" />}
                        onClick={() => {
                          setInitialShowQR(true);
                          setSelectedRecord(record);
                        }}
                        className="border-[#0b6e4f] text-[#0b6e4f] hover:bg-[#0b6e4f] hover:text-white"
                      >
                        QR
                      </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download className="w-4 h-4" />}
                      onClick={() => handleDownload(record._id, record.title)}
                    >
                      {t('download')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Share2 className="w-4 h-4" />}
                      onClick={() => handleShare(record._id)}
                    >
                      {t('share')}
                    </Button>
                    
                    {/* Consent Toggle */}
                    <button
                      onClick={() => toggleConsent(record._id)}
                      className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        record.consentEnabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {record.consentEnabled ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          {t('shared')}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          {t('private')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    )}

      {/* QR Link Info */}
      <Card className="bg-[#e8f5e9] border-[#0b6e4f]">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔗</div>
          <div>
            <h3 className="font-semibold text-[#0b6e4f] mb-1">
              {t('allRecordsLinked')}
            </h3>
            <p className="text-sm text-foreground">
              {t('qrLinkDesc')}
            </p>
          </div>
        </div>
      </Card>

      <RecordDetailsDialog 
        record={selectedRecord} 
        open={!!selectedRecord} 
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        onDownload={handleDownload}
        onShare={handleShare}
        t={t}
        language={language}
      />

      <UploadRecordDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        uploading={uploading}
        t={t}
      />

      <SuccessQRDialog
        record={uploadedRecord}
        qrToken={qrToken}
        open={!!uploadedRecord}
        onOpenChange={(open) => {
          if (!open) {
            setUploadedRecord(null);
            setQrToken(null);
          }
        }}
        t={t}
      />
    </div>
  );
}

function UploadRecordDialog({ open, onOpenChange, onUpload, uploading, t }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('prescription');
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');
  const [description, setDescription] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.split('.')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    onUpload({ file, title, category, hospital, doctor, description });
    onOpenChange(false);
    // Reset form
    setFile(null);
    setTitle('');
    setCategory('prescription');
    setHospital('');
    setDoctor('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{t('uploadMedicalRecord')}</DialogTitle>
          <DialogDescription>
            {t('uploadDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">{t('Select File')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="bg-zinc-900 border-zinc-800"
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">{t('Title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test Report"
              className="bg-zinc-900 border-zinc-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('Category')}</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-sm"
              >
                <option value="prescription">Prescription</option>
                <option value="lab">Lab Report</option>
                <option value="imaging">Imaging</option>
                <option value="vaccination">Vaccination</option>
                <option value="consultation">Consultation</option>
                <option value="discharge">Discharge</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital">{t('Hospital')}</Label>
              <Input
                id="hospital"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="Hospital name"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor">{t('Doctor')}</Label>
            <Input
              id="doctor"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="Doctor name"
              className="bg-zinc-900 border-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some notes..."
              className="bg-zinc-900 border-zinc-800 min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={uploading || !file} className="bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 w-full">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {t('Upload Record')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuccessQRDialog({ record, qrToken, open, onOpenChange, t }: any) {
  if (!record || !qrToken) return null;

  const shareLink = `${window.location.origin}/qr/${qrToken}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareLink)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-white text-center">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-500 flex items-center justify-center gap-2">
            <Plus className="w-6 h-6" /> {t('Upload Successful!')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('Your medical record has been uploaded safely.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <div className="bg-white p-4 rounded-xl inline-block mx-auto border-4 border-[#0b6e4f]">
            <img src={qrUrl} alt="Record QR Code" className="w-48 h-48 mx-auto" />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">{record.title}</p>
            <p className="text-xs text-zinc-500">{t('Scan this QR code to view the record details')}</p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 border-zinc-800 hover:bg-zinc-900"
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                alert('Link copied to clipboard');
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('Copy Link')}
            </Button>
            <Button 
              className="flex-1 bg-[#0b6e4f] hover:bg-[#0b6e4f]/90"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecordDetailsDialog({ record, open, onOpenChange, onDownload, onShare, t, language }: { 
  record: MedicalRecord | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onDownload: (id: string, title: string) => void,
  onShare: (id: string) => void,
  t: any,
  language: string
}) {
  const [showQR, setShowQR] = useState(false);
  
  if (!record) return null;

  const qrUrl = record.qrToken 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/qr/${record.qrToken}`)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) setShowQR(false);
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold">{t(record.title)}</DialogTitle>
              <DialogDescription className="text-zinc-400">
                {new Date(record.createdAt).toLocaleDateString(language === 'en' ? 'en-IN' : language, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} • {record.category?.toUpperCase() || 'RECORD'}
              </DialogDescription>
            </div>
            {qrUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowQR(!showQR)}
                className="border-[#0b6e4f] text-[#0b6e4f] hover:bg-[#0b6e4f] hover:text-white"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {showQR ? t('Show Details') : t('Show QR')}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4 text-white">
          {showQR && qrUrl ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="bg-white p-4 rounded-xl border-4 border-[#0b6e4f]">
                <img src={qrUrl} alt="Record QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-zinc-400 text-center max-w-xs">
                {t('Scan this QR code to quickly share this specific medical record with a healthcare provider.')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Hospital')}</p>
                  <p className="text-sm">{record.hospital || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Doctor')}</p>
                  <p className="text-sm">{record.doctor || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Description')}</p>
                <p className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                  {record.description ? t(record.description) : 'No additional description provided for this record.'}
                </p>
              </div>

              {record.fileUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Document Preview')}</p>
                  <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {record.fileUrl.endsWith('.pdf') ? (
                      <div className="text-center p-4">
                        <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">PDF Document - Use download to view full content</p>
                      </div>
                    ) : (
                      <img 
                        src={`${api.API_URL.replace('/api', '')}/uploads/${record.fileUrl}`} 
                        alt={record.title}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 p-3 bg-[#0b6e4f]/10 border border-[#0b6e4f]/20 rounded-lg">
            <div className={`p-2 rounded-full ${record.consentEnabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
              {record.consentEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold">{record.consentEnabled ? t('shared') : t('private')}</p>
              <p className="text-[10px] text-zinc-400">
                {record.consentEnabled 
                  ? 'Authorized doctors can view this record when you scan your QR code.' 
                  : 'This record is only visible to you. Enable consent to share with doctors.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800 text-white"
              onClick={() => onDownload(record._id, record.title)}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('download')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800 text-white"
              onClick={() => onShare(record._id)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('share')}
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
