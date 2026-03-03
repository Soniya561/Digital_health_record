import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  MapPin, 
  AlertTriangle, 
  Activity, 
  User, 
  Droplet,
  Heart,
  Navigation,
  ShieldAlert,
  Edit2,
  Save,
  X,
  MessageSquare
} from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from '@/app/utils/translations';
import { useLanguage } from '@/app/context/LanguageContext';
import { api } from '@/app/utils/api';

export function EmergencyTab() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editedProfile, setEditedProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.get('/patients/me');
      setProfile(data.user);
      setEditedProfile(data.user);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put('/patients/me', {
        bloodGroup: editedProfile.bloodGroup,
        allergies: editedProfile.allergies,
        emergencyContact: editedProfile.emergencyContact
      });
      setProfile(editedProfile);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update emergency details');
    }
  };

  const handleSOS = () => {
    const primaryNumber = profile?.emergencyContact?.phone || '108';
    window.location.href = `tel:${primaryNumber}`;
    
    // Optionally send SMS if supported
    if (profile?.emergencyContact?.phone) {
      const message = encodeURIComponent(`EMERGENCY! I need help. My location: ${window.location.href}`);
      // Some devices support triggering SMS automatically, but usually it requires user interaction
      // window.location.href = `sms:${profile.emergencyContact.phone}?body=${message}`;
    }
  };

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleMessage = (number: string) => {
    const message = encodeURIComponent("EMERGENCY! I need help.");
    window.location.href = `sms:${number}?body=${message}`;
  };

  const handleNavigate = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const emergencyContacts = [
    { label: t('ambulance'), number: '108', color: 'bg-red-100 text-red-600', icon: Activity },
    { label: t('police'), number: '100', color: 'bg-blue-100 text-blue-600', icon: ShieldAlert },
    { label: t('fireStation'), number: '101', color: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
    { label: t('womenHelpline'), number: '1091', color: 'bg-pink-100 text-pink-600', icon: Heart },
  ];

  const hospitals = [
    {
      name: 'City Medical Center',
      distance: '0.8 km',
      type: 'Tertiary Care',
      open: true,
      phone: '+91 98765 43210',
      address: 'City Medical Center, Main Road'
    },
    {
      name: 'General Hospital',
      distance: '2.4 km',
      type: 'Government',
      open: true,
      phone: '+91 98765 43211',
      address: 'General Hospital, Station Road'
    }
  ];

  if (loading) return <div className="p-8 text-center">Loading emergency data...</div>;

  return (
    <div className="space-y-6">
      {/* SOS Button */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <button 
          onClick={handleSOS}
          className="w-full aspect-square max-w-[200px] mx-auto block rounded-full bg-red-600 text-white font-bold text-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] border-[10px] border-red-100 animate-pulse relative z-10"
        >
          SOS
        </button>
        <div className="absolute inset-0 bg-red-600 rounded-full blur-3xl opacity-20 animate-pulse" />
        <p className="text-center mt-4 text-red-600 font-bold animate-bounce uppercase tracking-widest">
          {t('tapToCallEmergency')}
        </p>
      </motion.div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 gap-3">
        {emergencyContacts.map((contact, index) => (
          <motion.div
            key={contact.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="p-4 text-center cursor-pointer active:bg-accent transition-colors border-zinc-700"
              onClick={() => handleCall(contact.number)}
            >
              <div className={`w-12 h-12 ${contact.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <contact.icon className="w-6 h-6" />
              </div>
              <div className="font-bold text-foreground">{contact.number}</div>
              <div className="text-xs text-muted-foreground">{contact.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Emergency Profile Summary */}
      <Card className="bg-red-950/20 border-red-900/50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-red-400 flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('emergencyMedicalCard')}
          </h3>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 rounded-full text-red-400 hover:bg-red-900/30"
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-red-300/70 flex items-center gap-1">
              <Droplet className="w-3 h-3" />
              {t('bloodGroup')}
            </div>
            {isEditing ? (
              <input
                className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-1 text-red-100 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                value={editedProfile?.bloodGroup || ''}
                onChange={(e) => setEditedProfile({...editedProfile, bloodGroup: e.target.value})}
                placeholder="e.g. O+"
              />
            ) : (
              <div className="font-bold text-red-100 text-xl">{profile?.bloodGroup || 'Not set'}</div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-red-300/70 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t('allergies')}
            </div>
            {isEditing ? (
              <input
                className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-1 text-red-100 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                value={editedProfile?.allergies?.join(', ') || ''}
                onChange={(e) => setEditedProfile({...editedProfile, allergies: e.target.value.split(',').map((s: string) => s.trim())})}
                placeholder="e.g. Peanuts, Penicillin"
              />
            ) : (
              <div className="font-bold text-red-100">{profile?.allergies?.join(', ') || 'None'}</div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-red-900/30">
          <div className="text-xs text-red-300/70 mb-1">{t('emergencyContact')}</div>
          {isEditing ? (
            <div className="space-y-2">
              <input
                className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-1 text-red-100 text-sm"
                value={editedProfile?.emergencyContact?.name || ''}
                onChange={(e) => setEditedProfile({
                  ...editedProfile, 
                  emergencyContact: { ...editedProfile.emergencyContact, name: e.target.value }
                })}
                placeholder="Name"
              />
              <input
                className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-1 text-red-100 text-sm"
                value={editedProfile?.emergencyContact?.relation || ''}
                onChange={(e) => setEditedProfile({
                  ...editedProfile, 
                  emergencyContact: { ...editedProfile.emergencyContact, relation: e.target.value }
                })}
                placeholder="Relation (e.g. Wife)"
              />
              <input
                className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-1 text-red-100 text-sm"
                value={editedProfile?.emergencyContact?.phone || ''}
                onChange={(e) => setEditedProfile({
                  ...editedProfile, 
                  emergencyContact: { ...editedProfile.emergencyContact, phone: e.target.value }
                })}
                placeholder="Phone Number"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-red-100">{profile?.emergencyContact?.name || 'Not set'}</div>
                <div className="text-xs text-red-400">{profile?.emergencyContact?.relation}</div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-red-800 text-red-400 bg-red-900/20"
                  onClick={() => handleCall(profile?.emergencyContact?.phone)}
                  disabled={!profile?.emergencyContact?.phone}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-red-800 text-red-400 bg-red-900/20"
                  onClick={() => handleMessage(profile?.emergencyContact?.phone)}
                  disabled={!profile?.emergencyContact?.phone}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Nearby Hospitals */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          {t('nearbyHospitals')}
        </h3>
        <div className="space-y-3">
          {hospitals.map((hospital, index) => (
            <Card key={index} className="flex items-center justify-between p-4 border-zinc-800">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">{hospital.name}</h4>
                  <Badge className="bg-green-950 text-green-400 border-green-900">OPEN</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {hospital.distance}
                  </span>
                  <span>•</span>
                  <span>{hospital.type}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleNavigate(hospital.address)}
                  variant="outline"
                  className="h-10 w-10 p-0 rounded-full border-zinc-700"
                >
                  <Navigation className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => handleCall(hospital.phone)}
                  className="h-10 w-10 p-0 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
          <Button 
            variant="outline" 
            fullWidth 
            className="border-dashed border-zinc-700 text-muted-foreground hover:text-foreground"
            onClick={() => handleNavigate('hospitals nearby')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Find More Nearby Hospitals
          </Button>
        </div>
      </div>

      {/* First Aid Tips */}
      <Card className="bg-amber-950/20 border-amber-900/50">
        <h3 className="font-semibold text-amber-400 mb-2">{t('firstAidTips')}</h3>
        <ul className="space-y-2">
          <li className="text-sm text-amber-200/70 flex items-start gap-2">
            <span className="font-bold text-amber-500">1.</span>
            Stay calm and check for safety
          </li>
          <li className="text-sm text-amber-200/70 flex items-start gap-2">
            <span className="font-bold text-amber-500">2.</span>
            Call emergency services immediately
          </li>
          <li className="text-sm text-amber-200/70 flex items-start gap-2">
            <span className="font-bold text-amber-500">3.</span>
            Keep the patient warm and still
          </li>
        </ul>
      </Card>
    </div>
  );
}
