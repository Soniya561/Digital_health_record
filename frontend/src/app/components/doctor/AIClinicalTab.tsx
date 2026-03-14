import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Brain, AlertTriangle, Sparkles, Loader2, Save, Send, Bot, User, Trash2, Info } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';
import { useLanguage } from '@/app/context/LanguageContext';

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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isClinicalOutput?: boolean;
  clinicalNotes?: string;
  prescriptions?: Prescription[];
}

interface AIClinicalTabProps {
  patient?: any;
}

export function AIClinicalTab({ patient }: AIClinicalTabProps) {
  const { language } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello Doctor. I'm your AI Clinical Assistant. I can help you analyze patient data, suggest clinical notes, or answer medical queries. How can I assist you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating]);

  const fetchDoctorAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const res = await api.get('/appointments/doctor');
      setAppointments(Array.isArray(res?.appointments) ? res.appointments : []);
    } catch (err: any) {
      console.error('Failed to load doctor appointments', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

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
    if (filteredAppointments.length > 0 && !selectedAppointmentId) {
      setSelectedAppointmentId(filteredAppointments[0]._id);
    }
  }, [filteredAppointments, selectedAppointmentId]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || generating) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/ai/clinical-chat', {
        messages: updatedMessages.map(({ role, content }) => ({ role, content })),
        patientId: patient?._id || patient?.id,
        appointmentId: selectedAppointmentId,
        language: language
      });

      if (res?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.answer }]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!selectedAppointmentId) {
      setError('Please select an appointment first.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await api.post('/ai/clinical-notes', { 
        appointmentId: selectedAppointmentId,
        language: language
      });
      
      let responseContent = `**Clinical Summary:**\n${res.clinicalNotes}\n\n`;
      if (res.prescriptions && res.prescriptions.length > 0) {
        responseContent += `**Suggested Prescriptions:**\n`;
        res.prescriptions.forEach((p: Prescription, i: number) => {
          responseContent += `${i + 1}. ${p.medicine} (${p.dosage}) for ${p.duration}. ${p.instructions}\n`;
        });
      }
      
      if (res.warning) {
        responseContent += `\n*Note: ${res.warning}*`;
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseContent,
        isClinicalOutput: true,
        clinicalNotes: res.clinicalNotes,
        prescriptions: res.prescriptions
      }]);
      setSuccess('Clinical notes generated below.');
    } catch (err: any) {
      setError('Failed to generate notes: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (notes: string, pre: Prescription[]) => {
    if (!selectedAppointmentId) {
      setError('Select an appointment first');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.put(`/appointments/${selectedAppointmentId}`, {
        clinicalNotes: notes,
        prescriptions: pre,
        language
      });
      setSuccess('Clinical notes saved to appointment');
    } catch (err: any) {
      setError(err.message || 'Failed to save clinical notes');
    } finally {
      setSaving(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: "Chat cleared. How can I help you now?" }]);
    setError('');
    setSuccess('');
  };

  return (
    <div className="flex flex-col h-[750px] gap-4">
      {/* Header Info */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Clinical Assistant</h2>
              <p className="text-xs text-muted-foreground">Context-aware medical decision support</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearChat} className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white">
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative">
          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar"
          >
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className="space-y-2">
                    <div className={`p-4 rounded-2xl text-sm shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none'
                    }`}>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                    
                    {msg.isClinicalOutput && msg.clinicalNotes && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7 px-3 rounded-full shadow-lg"
                        onClick={() => handleSave(msg.clinicalNotes!, msg.prescriptions || [])}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        Save to Appointment
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {generating && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none border border-zinc-800 shadow-md">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error/Success overlay */}
          {(error || success) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-auto max-w-md">
              <div className={`px-4 py-2 rounded-full shadow-2xl border flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-4 ${
                error ? 'bg-red-500/90 border-red-400 text-white' : 'bg-green-500/90 border-green-400 text-white'
              }`}>
                {error ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                {error || success}
                <button onClick={() => { setError(''); setSuccess(''); }} className="ml-2 hover:opacity-70">×</button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about patient history, symptoms, or medications..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder:text-zinc-600 shadow-inner"
                disabled={generating}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || generating}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 h-auto transition-all shadow-lg active:scale-95"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar Context */}
        <div className="w-72 flex flex-col gap-4">
          <Card className="p-4 space-y-4 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <Info className="w-4 h-4 text-blue-400" />
              Clinical Context
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Active Appointment</label>
              {loadingAppointments ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/50">
                   <p className="text-[10px] text-zinc-500 italic text-center">No appointments for this patient</p>
                </div>
              ) : (
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
                >
                  {filteredAppointments.map((appt) => (
                    <option key={appt._id} value={appt._id}>
                      {new Date(appt.date).toLocaleDateString('en-IN')} - {appt.specialty || 'General'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Quick Actions</p>
              <Button 
                className="w-full justify-start text-[11px] h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 rounded-lg transition-colors" 
                variant="outline"
                onClick={handleGenerateNotes}
                disabled={generating || !selectedAppointmentId}
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-400" />
                Draft Clinical Notes
              </Button>
              <Button 
                className="w-full justify-start text-[11px] h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 rounded-lg transition-colors" 
                variant="outline"
                onClick={() => handleSend("Analyze this patient's history for potential risks or allergies.")}
                disabled={generating || !patient}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-2 text-amber-400" />
                Analyze Patient Risks
              </Button>
              <Button 
                className="w-full justify-start text-[11px] h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 rounded-lg transition-colors" 
                variant="outline"
                onClick={() => handleSend("Suggest a treatment plan for the current symptoms based on medical best practices.")}
                disabled={generating}
              >
                <Brain className="w-3.5 h-3.5 mr-2 text-blue-400" />
                Suggest Treatment Plan
              </Button>
            </div>
          </Card>

          <div className="flex-1"></div>

          <Card className="p-4 bg-yellow-500/5 border-yellow-500/20 rounded-xl">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                <strong>Decision Support Only:</strong> AI responses must be reviewed by a licensed professional before clinical implementation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
