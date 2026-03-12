import React, { useEffect, useMemo, useState } from 'react';
import { Brain, AlertTriangle, Sparkles, Loader2, Save } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';

type Prescription = {
  medicine: string;
  dosage: string;
  duration: string;
  instructions: string;
};

type Appointment = {
  _id: string;
  date: string;
  time?: string;
  specialty?: string;
  hospital?: string;
  patient?: {
    _id?: string;
    name?: string;
    abhaId?: string;
  };
};

interface AIClinicalTabProps {
  patient?: any;
}

export function AIClinicalTab({ patient }: AIClinicalTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  const selectedPatientName = (patient?.name || '').trim().toLowerCase();
  const selectedPatientAbha = (patient?.abhaId || patient?.id || '').trim().toLowerCase();

  const filteredAppointments = useMemo(() => {
    const validAppointments = appointments.filter((a) => !!a.patient?._id);
    if (!selectedPatientName && !selectedPatientAbha) return validAppointments;
    return validAppointments.filter((a) => {
      const apptName = (a.patient?.name || '').trim().toLowerCase();
      const apptAbha = (a.patient?.abhaId || '').trim().toLowerCase();
      return (
        (!!selectedPatientName && apptName === selectedPatientName) ||
        (!!selectedPatientAbha && apptAbha === selectedPatientAbha)
      );
    });
  }, [appointments, selectedPatientName, selectedPatientAbha]);

  useEffect(() => {
    if (!filteredAppointments.length) {
      setSelectedAppointmentId('');
      return;
    }
    const stillExists = filteredAppointments.some((a) => a._id === selectedAppointmentId);
    if (!stillExists) {
      setSelectedAppointmentId(filteredAppointments[0]._id);
    }
  }, [filteredAppointments, selectedAppointmentId]);

  const fetchDoctorAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setError('');
      const res = await api.get('/appointments/doctor');
      setAppointments(Array.isArray(res?.appointments) ? res.appointments : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load doctor appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAppointmentId) {
      setError('Select an appointment first');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      setWarning('');
      const res = await api.post('/ai/clinical-notes', { appointmentId: selectedAppointmentId });
      setClinicalNotes(res?.clinicalNotes || '');
      setPrescriptions(Array.isArray(res?.prescriptions) ? res.prescriptions : []);
      setSuccess('AI clinical notes generated successfully');
      if (res?.warning) setWarning(res.warning);
    } catch (err: any) {
      setError(err.message || 'Failed to generate clinical notes');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAppointmentId) {
      setError('Select an appointment first');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setWarning('');
      await api.put(`/appointments/${selectedAppointmentId}`, {
        clinicalNotes,
        prescriptions
      });
      setSuccess('Clinical notes saved to appointment');
    } catch (err: any) {
      setError(err.message || 'Failed to save clinical notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">AI Clinical Assistant</h2>
            <p className="text-sm text-zinc-800 font-medium">Generate notes and prescriptions from appointment context</p>
          </div>
        </div>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> AI output is decision support only. Review before finalizing prescriptions.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Appointment Context
        </h3>

        {loadingAppointments ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching appointments found. Select a patient with appointments or create one first.
          </p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              {filteredAppointments.map((appt) => (
                <option key={appt._id} value={appt._id}>
                  {appt.patient?.name || 'Unknown Patient'} | {new Date(appt.date).toLocaleDateString('en-IN')} {appt.time || ''} | {appt.specialty || 'General'}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={!selectedAppointmentId || generating || loadingAppointments}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Notes
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={fetchDoctorAppointments} disabled={loadingAppointments}>
                Refresh Appointments
              </Button>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="bg-green-50 border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </Card>
      )}

      {warning && (
        <Card className="bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700">{warning}</p>
        </Card>
      )}

      {(clinicalNotes || prescriptions.length > 0) && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Generated Clinical Output</h3>
            <Button onClick={handleSave} disabled={saving || !selectedAppointmentId}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Appointment
                </>
              )}
            </Button>
          </div>

          {clinicalNotes && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Clinical Notes</h4>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full min-h-36 bg-zinc-900 text-white border border-zinc-700 rounded-lg p-3 text-sm"
              />
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Suggested Prescriptions</h4>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions generated.</p>
            ) : (
              prescriptions.map((p, index) => (
                <div key={`${p.medicine}-${index}`} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{p.medicine || 'Medicine'}</p>
                    <Badge variant="info">{p.dosage || 'Dosage not set'}</Badge>
                  </div>
                  <p className="text-sm mt-1">{p.instructions || 'No instructions provided'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duration: {p.duration || 'Not specified'}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
