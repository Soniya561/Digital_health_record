import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, User, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';

interface Appointment {
  _id: string;
  doctor: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  type: 'in-person' | 'video';
  status: 'upcoming' | 'completed' | 'cancelled';
  summary?: string;
}

export function AppointmentsTab() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });

  // Form State
  const [formData, setFormData] = useState({
    doctor: '',
    specialty: '',
    hospital: '',
    date: '',
    time: '',
    type: 'in-person' as 'in-person' | 'video'
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments');
      setAppointments(response.appointments);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBookingLoading(true);
      const response = await api.post('/appointments', formData);
      setAppointments([...appointments, response.appointment]);
      setShowBookDialog(false);
      setFormData({
        doctor: '',
        specialty: '',
        hospital: '',
        date: '',
        time: '',
        type: 'in-person'
      });
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm(t('confirmCancelAppointment') || 'Are you sure you want to cancel this appointment?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments(appointments.map(a => a._id === id ? { ...a, status: 'cancelled' } : a));
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    try {
      setBookingLoading(true);
      const response = await api.put(`/appointments/${selectedAppointment._id}`, rescheduleData);
      setAppointments(appointments.map(a => a._id === selectedAppointment._id ? response.appointment : a));
      setShowRescheduleDialog(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      alert('Failed to reschedule. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleOpenReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleData({
      date: appointment.date.split('T')[0],
      time: appointment.time
    });
    setShowRescheduleDialog(true);
  };

  const handleOpenDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsDialog(true);
  };

  const upcomingAppointments = appointments.filter(a => a.status === 'upcoming');
  const pastAppointments = appointments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Book Appointment */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">{t('myAppointments')}</h2>
            <p className="text-sm text-muted-foreground">
              {upcomingAppointments.length} {t('upcomingAppointments')}
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => setShowBookDialog(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('bookNew')}
          </Button>
        </div>
      </Card>

      {/* Upcoming Appointments */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">{t('upcoming')}</h3>
        <div className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('noUpcomingAppointments')}</p>
          ) : (
            upcomingAppointments.map((appointment, index) => (
              <motion.div
                key={appointment._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="bg-gradient-to-r from-white to-[#e8f5e9]">
                  <div className="flex items-start gap-4">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 text-center bg-[#0b6e4f] text-white rounded-xl p-3">
                      <div className="text-2xl font-bold">
                        {new Date(appointment.date).getDate()}
                      </div>
                      <div className="text-xs">
                        {new Date(appointment.date).toLocaleDateString(language === 'en' ? 'en-IN' : language, { month: 'short' })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            {appointment.doctor}
                          </h4>
                          <p className="text-sm text-muted-foreground">{appointment.specialty}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {appointment.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {appointment.hospital}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleOpenDetails(appointment)}
                        >
                          {t('viewDetails')}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenReschedule(appointment)}
                        >
                          {t('reschedule')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCancelAppointment(appointment._id)}>
                          {t('cancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Smart Reminders Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔔</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">{t('smartReminders')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('smartRemindersDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">{t('past')}</h3>
          <div className="space-y-3">
            {pastAppointments.map((appointment, index) => (
              <motion.div
                key={appointment._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="opacity-75 hover:opacity-100 transition-all">
                  <div className="flex items-start gap-4">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 text-center bg-muted text-foreground rounded-xl p-3">
                      <div className="text-2xl font-bold">
                        {new Date(appointment.date).getDate()}
                      </div>
                      <div className="text-xs">
                        {new Date(appointment.date).toLocaleDateString(language === 'en' ? 'en-IN' : language, { month: 'short' })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{appointment.doctor}</h4>
                      <p className="text-sm text-muted-foreground mb-1">{appointment.specialty}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Clock className="w-3 h-3" />
                        {appointment.time}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenDetails(appointment)}
                      >
                        {t('viewSummary')}
                      </Button>
                    </div>

                    <Badge variant="success">✓ {t('completed')}</Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Book Appointment Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('bookNewAppointment')}</DialogTitle>
            <DialogDescription>
              {t('bookAppointmentDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookAppointment}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="doctor">{t('doctorName')}</Label>
                <Input
                  id="doctor"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  placeholder="e.g. Dr. Priya Menon"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialty">{t('specialty')}</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g. Cardiologist"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hospital">{t('hospital')}</Label>
                <Input
                  id="hospital"
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  placeholder="e.g. City Hospital"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">{t('date')}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">{t('time')}</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBookDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={bookingLoading}>
                {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('confirmBooking')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('appointmentDetails')}</DialogTitle>
            <DialogDescription>
              {t('appointmentDetailsDesc')}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{selectedAppointment.doctor}</h4>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.specialty}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('date')}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    {new Date(selectedAppointment.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('time')}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    {selectedAppointment.time}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">{t('hospital')}</p>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  {selectedAppointment.hospital}
                </div>
              </div>

              {selectedAppointment.summary && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('summary')}</p>
                  <p className="text-sm border rounded-lg p-2 bg-muted/50">{selectedAppointment.summary}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t('close')}
            </Button>
            {selectedAppointment?.status === 'upcoming' && (
              <Button variant="primary" onClick={() => { setShowDetailsDialog(false); handleOpenReschedule(selectedAppointment); }}>
                {t('reschedule')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('rescheduleAppointment')}</DialogTitle>
            <DialogDescription>
              {t('rescheduleDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReschedule}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reschedule-date">{t('newDate')}</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reschedule-time">{t('newTime')}</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={rescheduleData.time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={bookingLoading}>
                {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('confirmReschedule')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
