import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, FileText, Calendar, User, Download, Loader2, Eye, Lock, Unlock, Share2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import { api, getAppOrigin } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';

interface PatientHistoryTabProps {
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

export function PatientHistoryTab({ patient }: PatientHistoryTabProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const patientIdentifier = resolvePatientIdentifier(patient);

  useEffect(() => {
    fetchRecords();
  }, [patientIdentifier]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = patientIdentifier
        ? `/records/patient/${encodeURIComponent(patientIdentifier)}`
        : '/records';
      const response = await api.get(endpoint);
      setRecords(response.records);
    } catch (err: any) {
      setError(err.message || t('failedToFetchRecords'));
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'all', name: t('allRecords'), count: records.length },
    { id: 'prescription', name: t('prescriptions'), count: records.filter(r => r.category === 'prescription').length },
    { id: 'lab', name: t('labReports'), count: records.filter(r => r.category === 'lab').length },
    { id: 'imaging', name: t('imaging'), count: records.filter(r => ['xray', 'imaging', 'mri'].includes(r.category)).length },
  ];

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (r.hospital && r.hospital.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || r.category === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleShare = async (record: any) => {
    try {
      // Get or create QR token for the record
      const res: any = await api.post(`/records/${record._id}/qr`, {});
      const token = res.qrToken;
      const shareUrl = `${getAppOrigin()}/qr/${token}`;

      if (navigator.share) {
        await navigator.share({
          title: record.title,
          text: t('Medical Record Details'),
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert(t('Share link copied to clipboard'));
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert(t('Share link copied to clipboard'));
        } catch (err) {
          alert('Share link: ' + shareUrl);
        }
        document.body.removeChild(textArea);
      }
    } catch (err: any) {
      console.error('Share failed', err);
      alert(err.message || 'Share failed');
    }
  };

  const handleDownload = async (recordId: string, title?: string) => {
    try {
      await api.download(`/records/${recordId}/download`, title || 'record');
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t('patientLabel')}: {patient?.name || t('selectedPatient')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('idLabel')}: {patientIdentifier || '-'}</p>
          </div>
          <Badge variant={patientIdentifier ? 'success' : 'warning'}>
            {patientIdentifier ? t('activeStatus') : t('selectPatientFromScanTab')}
          </Badge>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <Input
            type="text"
            placeholder={t('searchMedicalRecordsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />

          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === filter.id
                    ? 'bg-[#0b6e4f] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {filter.name} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Cross-State Records Banner */}
      <Card className="bg-yellow-50 border-yellow-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🌍</div>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">{t('crossStateRecords')}</h3>
            <p className="text-sm text-yellow-800/80">
              {t('crossStateDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Medical Timeline */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('medicalHistoryTimeline')}
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#0b6e4f] animate-spin mb-4" />
            <p className="text-muted-foreground">{t('loadingMedicalRecords')}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center bg-red-900/20 border border-red-900/50 rounded-xl">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchRecords} variant="outline">{t('retry')}</Button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">{t('noRecordsFound')}</h3>
            <p className="text-muted-foreground mt-1">{t('noRecordsDesc')}</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <motion.div
              key={record._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover>
                <div className="flex gap-4">
                  {/* Timeline */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-[#0b6e4f] text-white rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    {index !== filteredRecords.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border -mb-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{t(record.title)}</h4>
                        <p className="text-sm text-muted-foreground uppercase">{t(record.category)}</p>
                      </div>
                      <Badge variant="info">
                        {new Date(record.createdAt).toLocaleDateString('en-IN')}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      <p>🆔 {patientIdentifier || t('unknownId')}</p>
                      <p>🏥 {record.hospital || t('notSpecified')}</p>
                      <p>👨‍⚕️ {record.doctor || t('notSpecified')}</p>
                    </div>

                    {record.description && (
                      <div className="p-3 bg-accent rounded-lg mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('detailsLabel')}</p>
                        <p className="text-sm text-foreground">{t(record.description)}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={<Eye className="w-4 h-4" />}
                        onClick={() => setSelectedRecord(record)}
                      >
                        {t('viewFull')}
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
                        onClick={() => handleShare(record)}
                      >
                        {t('share')}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <RecordDetailsDialog 
        record={selectedRecord} 
        open={!!selectedRecord} 
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        onDownload={handleDownload}
        onShare={handleShare}
        t={t}
        language={language}
      />

      {/* Patient Summary */}
      <Card className="bg-[#e8f5e9] border-[#0b6e4f]">
        <h3 className="font-semibold text-foreground mb-3">{t('patientSummary')}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t('totalVisits')}</p>
            <p className="text-lg font-bold text-foreground">12</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('totalRecords')}</p>
            <p className="text-lg font-bold text-foreground">24</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('firstVisit')}</p>
            <p className="text-lg font-bold text-foreground">Jan 2024</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('lastVisit')}</p>
            <p className="text-lg font-bold text-foreground">Jan 2025</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RecordDetailsDialog({ record, open, onOpenChange, onDownload, onShare, t, language }: { 
  record: any | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onDownload: (id: string, title: string) => void,
  onShare: (record: any) => void,
  t: any,
  language: string
}) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">{t(record.title)}</DialogTitle>
        <DialogDescription className="text-zinc-400">
          {new Date(record.createdAt).toLocaleDateString(language === 'en' ? 'en-IN' : language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })} &bull; {t(record.category)?.toUpperCase() || t('recordLabel')}
        </DialogDescription>
      </DialogHeader>

        <div className="grid gap-6 py-4 text-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Hospital')}</p>
              <p className="text-sm">{record.hospital || t('notSpecified')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Doctor')}</p>
              <p className="text-sm">{record.doctor || t('notSpecified')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Description')}</p>
            <p className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              {record.description ? t(record.description) : t('noAdditionalDescription')}
            </p>
          </div>

          {record.fileUrl && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase font-semibold">{t('Document Preview')}</p>
              <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden">
                {record.fileUrl.endsWith('.pdf') ? (
                  <div className="text-center p-4">
                    <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">{t('pdfPreviewNote')}</p>
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
              onClick={() => onShare(record)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('share')}
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white">
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
