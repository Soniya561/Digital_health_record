import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, UserCheck, UserX, Shield, Building2, User, Mail, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/app/utils/api';
import { useTranslation } from '@/app/utils/translations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';

type FilterRole = 'all' | 'doctor' | 'hospital' | 'patient' | 'admin';

interface UserRecord {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  organization?: string;
  verified: boolean;
  lastActive: string | Date;
  status: 'active' | 'pending' | 'suspended';
  photoUrl?: string;
  abhaId?: string;
  blockchainId?: string;
  gender?: string;
  bloodGroup?: string;
  preferredLanguage?: string;
  homeState?: string;
  dob?: string | Date | null;
  isProfileComplete?: boolean;
  stats?: {
    recordCount: number;
    upcomingAppointments: number;
    completedAppointments: number;
  };
}

interface UserManagementTabProps {
  language?: string;
}

export function UserManagementTab({ language = 'en' }: UserManagementTabProps) {
  const { t } = useTranslation(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === 'pending' || !u.verified),
    [users]
  );
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [loadingPendingAppts, setLoadingPendingAppts] = useState(true);

  const fetchUsers = useCallback(async (query = '', role = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (role && role !== 'all') params.append('role', role);
      
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers((res as any).users || []);
    } catch (err: any) {
      setError(err?.message || t('failedToLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery, filterRole);
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, filterRole, fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;
    
    setSavingUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (err: any) {
      alert(err?.message || t('failedToDeleteUser'));
    } finally {
      setSavingUserId(null);
    }
  };

  useEffect(() => {
    const loadPendingAppts = async () => {
      setLoadingPendingAppts(true);
      try {
        const res = await api.get('/admin/pending-appointments');
        setPendingAppointments((res as any).appointments || []);
      } catch {
        setPendingAppointments([]);
      } finally {
        setLoadingPendingAppts(false);
      }
    };
    loadPendingAppts();
  }, []);

  const normalizeRole = (role?: string) => (role ? role.toString().trim().toUpperCase() : 'PATIENT');

  const roleFilters: { id: FilterRole; name: string; count: number }[] = useMemo(() => ([
    { id: 'all', name: t('allUsers'), count: users.length },
    { id: 'doctor', name: t('doctorCount', { count: users.filter(u => normalizeRole(u.role) === 'DOCTOR').length }), count: users.filter(u => normalizeRole(u.role) === 'DOCTOR').length },
    { id: 'hospital', name: t('hospitalCount', { count: users.filter(u => normalizeRole(u.role) === 'HOSPITAL').length }), count: users.filter(u => normalizeRole(u.role) === 'HOSPITAL').length },
    { id: 'patient', name: t('patientCount', { count: users.filter(u => normalizeRole(u.role) === 'PATIENT').length }), count: users.filter(u => normalizeRole(u.role) === 'PATIENT').length },
    { id: 'admin', name: t('adminCount', { count: users.filter(u => normalizeRole(u.role) === 'ADMIN').length }), count: users.filter(u => normalizeRole(u.role) === 'ADMIN').length },
  ]), [users, t]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const targetRole = filterRole.toString().trim().toUpperCase();
    return users.filter((u) => {
      const matchesRole = filterRole === 'all' ? true : normalizeRole(u.role) === targetRole;
      if (!matchesRole) return false;
      if (!query) return true;
      const phoneClean = (u.phone || '').replace(/\s|-/g, '').toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.abhaId || '').toLowerCase().includes(query) ||
        phoneClean.includes(query.replace(/\s|-/g, '')) ||
        (u.organization || '').toLowerCase().includes(query) ||
        normalizeRole(u.role).includes(query.toUpperCase()) ||
        (u.status || '').toLowerCase().includes(query)
      );
    });
  }, [users, filterRole, searchQuery]);

  const getRoleIcon = (role: string) => {
    const normalized = role?.toUpperCase();
    switch (normalized) {
      case 'DOCTOR':
        return <User className="w-5 h-5" />;
      case 'HOSPITAL':
        return <Building2 className="w-5 h-5" />;
      case 'PATIENT':
        return <User className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    const normalized = role?.toUpperCase();
    switch (normalized) {
      case 'DOCTOR':
        return 'bg-blue-100 text-blue-700';
      case 'HOSPITAL':
        return 'bg-purple-100 text-purple-700';
      case 'PATIENT':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLastActive = (value: any) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-IN');
  };

  const updateUserInList = (updated: UserRecord) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    setSelectedUser((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };
  
  const handleVerify = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/verify`, {});
      if ((res as any).user) {
        updateUserInList((res as any).user);
      }
    } catch (err: any) {
      alert(err?.message || t('failedToVerifyUser'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setSavingUserId(user.id);
    try {
      const res = await api.patch(`/admin/users/${user.id}/status`, { status: nextStatus });
      if ((res as any).user) {
        updateUserInList((res as any).user);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveUser = async (userId: string, updates: Partial<UserRecord>) => {
    setSavingUserId(userId);
    try {
      const payload: any = {};
      if (updates.status) payload.status = updates.status;
      if (updates.role) payload.role = normalizeRole(updates.role);
      if (updates.organization !== undefined) payload.organization = updates.organization;
      if (typeof updates.verified === 'boolean') payload.verified = updates.verified;

      const res = await api.patch(`/admin/users/${userId}`, payload);
      if ((res as any).user) {
        updateUserInList((res as any).user);
      }
      setSelectedUser(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save user');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('userManagement')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('manageUsersDesc')}
            </p>
          </div>
          <Button variant="primary" icon={<UserCheck className="w-4 h-4" />} onClick={fetchUsers} disabled={loading}>
            {t('refresh')}
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={t('searchUsersPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                className="px-3 h-[46px]"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {roleFilters.map((filter) => {
              const active = filterRole === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilterRole(filter.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    active
                      ? 'bg-[#0b6e4f] text-white border-[#0b6e4f]'
                      : 'bg-muted text-muted-foreground hover:bg-accent border-transparent'
                  }`}
                >
                  {filter.name} ({filter.count})
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Loading / error */}
      {loading && (
        <Card className="p-4 text-sm text-muted-foreground">
          {t('loadingUsers')}
        </Card>
      )}
      {error && (
        <Card className="p-4 text-sm text-red-500 border-red-200 bg-red-50">
          {t('failedToLoadUsers')}
        </Card>
      )}
      {!loading && !error && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {t('pendingAppointments')} ({pendingAppointments.length || 0})
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('upcomingAppointmentsReview')}
              </p>
            </div>
          </div>
          {loadingPendingAppts ? (
            <p className="text-sm text-muted-foreground">{t('loadingPendingAppointments')}</p>
          ) : pendingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noPendingAppointments')}</p>
          ) : (
            <div className="space-y-2">
              {pendingAppointments.slice(0, 4).map((appt) => (
                <div key={appt.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-zinc-900">
                  <p className="font-semibold text-zinc-900">{appt.patientName}</p>
                  <p className="text-xs text-zinc-700">
                    {appt.specialty} • {appt.doctor} • {new Date(appt.date).toLocaleDateString('en-IN')} {appt.time}
                  </p>
                  <p className="text-xs text-zinc-700">{appt.hospital}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-[#0b6e4f]">{users.filter(u => u.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">{t('activeUsers')}</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{users.filter(u => u.status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground">{t('pending')}</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-red-600">{users.filter(u => u.status === 'suspended').length}</p>
          <p className="text-sm text-muted-foreground">{t('suspended')}</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-[#2196F3]">{users.filter(u => u.verified).length}</p>
          <p className="text-sm text-muted-foreground">{t('verified')}</p>
        </Card>
      </div>

      {/* Current filter + count */}
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('showingUsers', { current: filteredUsers.length, total: users.length })}
        </div>
        <div className="text-xs text-muted-foreground capitalize">
          {t('filterLabel', { filter: t(filterRole) })}
          {searchQuery && ` • ${t('searchLabel')}: "${searchQuery}"`}
        </div>
      </Card>

      {/* User List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 && (
          <Card className="p-12 text-center bg-zinc-900/50 border-zinc-800">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{t('noUsersFound')}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t('noUsersMatch', { query: searchQuery || t('currentFilter') })}
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => {
                setSearchQuery('');
              }}
            >
              {t('clearSearch')}
            </Button>
          </Card>
        )}

        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card hover>
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full ${getRoleColor(user.role)} flex items-center justify-center overflow-hidden border-2 border-[#0b6e4f]/10`}>
                    {user.photoUrl ? (
                      <img
                        src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getRoleIcon(user.role)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 
                        className="font-semibold text-foreground hover:text-[#0b6e4f] cursor-pointer transition-colors"
                        onClick={() => setSelectedUser(user)}
                      >
                        {user.name}
                      </h4>
                      {user.verified && (
                        <Shield className="w-4 h-4 text-green-600" />
                      )}
                      <Badge variant={
                        user.status === 'active' ? 'success' :
                        user.status === 'pending' ? 'warning' :
                        'danger'
                      }>
                        {user.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>📧 {user.email}</p>
                      <p>📱 {user.phone || 'Not provided'}</p>
                      {user.organization && (
                        <p>🏥 {user.organization}</p>
                      )}
                      <p className="text-xs">Last active: {formatLastActive(user.lastActive)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!user.verified && (
                    <Button variant="primary" size="sm" disabled={savingUserId === user.id} onClick={() => handleVerify(user.id)}>
                      {t('verify')}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    {t('view')}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={savingUserId === user.id} onClick={() => handleToggleStatus(user)}>
                    {user.status === 'suspended' ? t('activate') : t('suspend')}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" disabled={savingUserId === user.id} onClick={() => handleDeleteUser(user.id)}>
                    {t('delete')}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <UserDetailDialog 
        user={selectedUser} 
        open={!!selectedUser} 
        onOpenChange={(open) => !open && setSelectedUser(null)}
        onSave={handleSaveUser}
        savingId={savingUserId}
        formatDate={formatLastActive}
        t={t}
      />
    </div>
  );
}

function UserDetailDialog({ user, open, onOpenChange, onSave, savingId, formatDate, t }: { 
  user: UserRecord | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onSave: (id: string, updates: Partial<UserRecord>) => void,
  savingId: string | null,
  formatDate: (v: any) => string,
  t: (key: string) => string
}) {
  if (!user) return null;

  const [role, setRole] = useState(user.role?.toUpperCase?.() || 'PATIENT');
  const [status, setStatus] = useState<UserRecord['status']>(user.status || 'active');
  const [verified, setVerified] = useState<boolean>(user.verified || false);
  const [organization, setOrganization] = useState<string>(user.organization || '');
  const [detail, setDetail] = useState<UserRecord | null>(user);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role?.toUpperCase?.() || 'PATIENT');
      setStatus(user.status || 'active');
      setVerified(!!user.verified);
      setOrganization(user.organization || '');
      setDetail(user);
      const fetchDetail = async () => {
        setLoadingDetail(true);
        try {
          const res = await api.get(`/admin/users/${user.id}`);
          if ((res as any).user) {
            setDetail(res.user);
            setRole(res.user.role?.toUpperCase?.() || role);
            setStatus(res.user.status || status);
            setVerified(!!res.user.verified);
            setOrganization(res.user.organization || '');
          }
        } catch {
          // ignore
        } finally {
          setLoadingDetail(false);
        }
      };
      fetchDetail();
    }
  }, [user]);

  const handleSave = () => {
    onSave(user.id, { role, status, verified, organization });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 ${
              user.role?.toUpperCase?.() === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
              user.role?.toUpperCase?.() === 'HOSPITAL' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {user.photoUrl ? (
                <img
                  src={`${api.API_URL.replace('/api', '')}/uploads/${user.photoUrl}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.role?.toUpperCase?.() === 'DOCTOR' ? <User className="w-6 h-6" /> :
                user.role?.toUpperCase?.() === 'HOSPITAL' ? <Building2 className="w-6 h-6" /> :
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{user.name}</DialogTitle>
              <DialogDescription className="text-zinc-400 capitalize">
                {role} • {status}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="text-sm">{user.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Organization
            </p>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Hospital/Company"
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" /> {t('verification')}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                <span className="text-sm">{verified ? t('verified') : t('pending')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3" /> Last Active
              </p>
              <p className="text-sm">{formatDate(user.lastActive)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold">Role</p>
              <select
                className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold">Status</p>
              <select
                className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserRecord['status'])}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {detail && (
            <div className="grid grid-cols-2 gap-3 text-sm bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg">
              <p><span className="text-zinc-500">ABHA:</span> {detail.abhaId || '—'}</p>
              <p><span className="text-zinc-500">Blockchain ID:</span> {detail.blockchainId || '—'}</p>
              <p><span className="text-zinc-500">Gender:</span> {detail.gender || '—'}</p>
              <p><span className="text-zinc-500">Blood Group:</span> {detail.bloodGroup || '—'}</p>
              <p><span className="text-zinc-500">DOB:</span> {detail.dob ? formatDate(detail.dob) : '—'}</p>
              <p><span className="text-zinc-500">Language:</span> {detail.preferredLanguage || '—'}</p>
              <p><span className="text-zinc-500">Home State:</span> {detail.homeState || '—'}</p>
              <p><span className="text-zinc-500">Profile Complete:</span> {detail.isProfileComplete ? 'Yes' : 'No'}</p>
              <p><span className="text-zinc-500">Records:</span> {detail.stats?.recordCount ?? 0}</p>
              <p><span className="text-zinc-500">Upcoming Appts:</span> {detail.stats?.upcomingAppointments ?? 0}</p>
              <p><span className="text-zinc-500">Completed Appts:</span> {detail.stats?.completedAppointments ?? 0}</p>
            </div>
          )}
          
          <div className="pt-4 border-t border-zinc-800 flex gap-2">
            <Button variant="outline" className="flex-1 border-zinc-800 hover:bg-zinc-900" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              className="flex-1 bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white"
              onClick={handleSave}
              disabled={savingId === user.id}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
