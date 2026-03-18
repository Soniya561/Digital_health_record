import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, User, Loader2 } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTranslation } from '@/app/utils/translations';

type Appointment = {
  _id: string;
  date: string;
  time: string;
  type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  specialty?: string;
  patient?: {
    name?: string;
    abhaId?: string;
  };
};

export function MyAppointmentsTab() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/appointments/doctor');
      setAppointments(Array.isArray(res?.appointments) ? res.appointments : []);
    } catch (err: any) {
      setError(err.message || t('failedToLoadAppointments'));
    } finally {
      setLoading(false);
    }
  };

  const todaysDate = new Date().toDateString();
  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          new Date(a.date).toDateString() === todaysDate &&
          a.status !== 'cancelled'
      ),
    [appointments, todaysDate]
  );
  const completedToday = todayAppointments.filter((a) => a.status === 'completed').length;
  const pendingToday = todayAppointments.filter((a) => a.status === 'upcoming').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card hover>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#0b6e4f]">{todayAppointments.length}</p>
            <p className="text-sm text-muted-foreground">{t('totalToday')}</p>
          </div>
        </Card>
        <Card hover>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{completedToday}</p>
            <p className="text-sm text-muted-foreground">{t('completed')}</p>
          </div>
        </Card>
        <Card hover>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{pendingToday}</p>
            <p className="text-sm text-muted-foreground">{t('pending')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('myAppointments')}
        </h2>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loadingAppointments')}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button variant="outline" onClick={fetchAppointments}>
              {t('retry')}
            </Button>
          </div>
        ) : appointments.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t('noAppointmentsAssigned')}</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment, index) => (
              <motion.div
                key={appointment._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-accent rounded-lg hover:bg-[#e8f5e9] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#0b6e4f] text-white rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{appointment.time}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.date).toLocaleDateString(language === 'en' ? 'en-IN' : language)} | {appointment.specialty ? t(appointment.specialty) : t('generalSpecialty')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      appointment.status === 'completed'
                        ? 'success'
                        : appointment.status === 'cancelled'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {t(appointment.status) || appointment.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{appointment.patient?.name || t('unknownPatient')}</p>
                    <p className="text-xs text-muted-foreground">{appointment.patient?.abhaId || t('noAbhaId')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
