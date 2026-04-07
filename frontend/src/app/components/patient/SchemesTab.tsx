import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, CheckCircle, ExternalLink, Sparkles, Loader2, Save, Info, Send, MessageCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';
import { toast } from 'sonner';

interface Scheme {
  _id: string;
  name: string;
  description: string;
  benefits: string[];
  eligibilityCriteria: any;
  provider: string;
}

interface SchemeResult {
  scheme: Scheme;
  eligible: boolean;
  applied: boolean;
}

export function SchemesTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemes, setSchemes] = useState<SchemeResult[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [showEligibilityForm, setShowEligibilityForm] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    income: '',
    isBPL: false,
    isMigrant: false,
    employmentType: '',
    chronicConditions: '',
  });

  const fetchData = async () => {
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/api/schemes`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setSchemes(data);
    } catch (error) {
      console.error('Failed to fetch schemes:', error);
      toast.error(t('failedToLoadSchemes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateEligibility = async () => {
    try {
      setSaving(true);
      const res = await api.put('/patients/me/eligibility', {
        income: Number(formData.income),
        isBPL: formData.isBPL,
        isMigrant: formData.isMigrant,
        employmentType: formData.employmentType,
        chronicConditions: formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      });
      toast.success(t('detailsUpdated'));
      setAiRecommendations(res.aiRecommendations);
      setShowEligibilityForm(false);
      fetchData(); // Refresh schemes based on new data
    } catch (error) {
      toast.error(t('failedToUpdateDetails'));
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (schemeId: string) => {
    try {
      await api.post(`/patients/schemes/${schemeId}/apply`, {});
      toast.success(t('applySuccess'));
      fetchData(); // Refresh to show as applied
    } catch (error: any) {
      toast.error(language === 'en' ? (error.message || t('failedToApply')) : t('failedToApply'));
    }
  };

  const handleRefreshAi = async () => {
    try {
      setIsRefreshingAi(true);
      const res = await api.get('/ai/schemes', { params: { language } });
      setAiRecommendations(res.recommendations);
      toast.success(t('aiRecommendationsUpdated'));
    } catch (error) {
      toast.error(t('failedToRefreshAi'));
    } finally {
      setIsRefreshingAi(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || isChatLoading) return;

    const userMsg = chatMessage.trim();
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await api.post('/ai/schemes/chat', {
        message: userMsg,
        history: chatHistory,
        language
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (error) {
      toast.error(t('failedToGetAiResponse'));
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground">{t('loadingRecords')}</p>
      </div>
    );
  }

  const eligibleSchemes = schemes.filter(s => s.eligible);
  const appliedSchemes = schemes.filter(s => s.applied);
  const availableSchemes = schemes.filter(s => s.eligible && !s.applied);
  const otherSchemes = schemes.filter(s => !s.eligible && !s.applied);

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Stats */}
      <Card className="bg-gradient-to-r from-[#0b6e4f] to-[#2196F3] text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{t('govtSchemes')}</h2>
            <p className="text-white/90">{t('personalizedHealthProfile')}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{eligibleSchemes.length}</div>
            <div className="text-sm text-white/90">{t('eligible')}</div>
          </div>
        </div>
      </Card>

      {/* Check Eligibility Section */}
      {!showEligibilityForm ? (
        <Card className="bg-accent/50 border-accent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {t('checkEligibilityTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('checkEligibilityDesc')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEligibilityForm(true)}>
              {t('updateEligibility')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            {t('updateEligibility')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label={t('annualIncome')}
              type="number"
              value={formData.income}
              onChange={(e) => setFormData({ ...formData, income: e.target.value })}
              placeholder={t('incomePlaceholder')}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('employmentType')}</label>
              <select
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              >
                <option value="">{t('selectPlaceholder')}</option>
                <option value="Migrant Worker">{t('migrantWorker')}</option>
                <option value="Regular Worker">{t('regularWorker')}</option>
                <option value="Unemployed">{t('unemployed')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBPL}
                onChange={(e) => setFormData({ ...formData, isBPL: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">{t('isBPL')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isMigrant}
                onChange={(e) => setFormData({ ...formData, isMigrant: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">{t('isMigrant')}</span>
            </label>
          </div>
          <Input
            label={t('chronicConditions')}
            value={formData.chronicConditions}
            onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
            placeholder={t('chronicConditionsPlaceholder')}
          />
          <div className="flex gap-3 mt-6">
            <Button variant="primary" onClick={handleUpdateEligibility} disabled={saving}>
              {saving ? t('saving') : t('updateEligibility')}
            </Button>
            <Button variant="ghost" onClick={() => setShowEligibilityForm(false)}>
              {t('cancel')}
            </Button>
          </div>
        </Card>
      )}

      {/* Applied Schemes */}
      {appliedSchemes.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {t('activeSchemes')}
          </h3>
          <div className="space-y-3">
            {appliedSchemes.map((result, index) => (
              <motion.div
                key={result.scheme._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-green-50 border-green-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-foreground">{result.scheme.name}</h4>
                    </div>
                    <Badge variant="success">
                      <CheckCircle className="w-3 h-3" />
                      {t('activeApplied')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{result.scheme.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Eligible & Not Applied Schemes */}
      {availableSchemes.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#0b6e4f]" />
            {t('availableSchemes')}
          </h3>
          <div className="space-y-3">
            {availableSchemes.map((result, index) => (
              <motion.div
                key={result.scheme._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{result.scheme.name}</h4>
                        <Badge variant="ai">
                          <Sparkles className="w-3 h-3" />
                          {t('aiDetected')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{result.scheme.description}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('keyBenefits')}:</p>
                    <ul className="space-y-1">
                      {result.scheme.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Apply Button */}
                  <Button 
                    variant="primary" 
                    fullWidth 
                    icon={<ExternalLink className="w-4 h-4" />}
                    onClick={() => handleApply(result.scheme._id)}
                  >
                    {t('applyNow')}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Other Schemes */}
      {otherSchemes.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">{t('otherSchemes')}</h3>
          <div className="space-y-3">
            {otherSchemes.map((result, index) => (
              <motion.div
                key={result.scheme._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="opacity-60 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{result.scheme.name}</h4>
                      <p className="text-sm text-muted-foreground">{result.scheme.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">{t('needHelp')}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t('schemeHelpDesc')}
            </p>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('ai')}>
              {t('chatWithAI')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
