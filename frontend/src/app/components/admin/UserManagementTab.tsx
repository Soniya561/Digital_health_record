import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, UserCheck, UserX, Shield, Building2, User, Mail, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';

interface UserRecord {
  id: string;
  name: string;
  role: 'doctor' | 'hospital' | 'patient';
  email: string;
  phone: string;
  organization?: string;
  verified: boolean;
  lastActive: string;
  status: 'active' | 'pending' | 'suspended';
}

export function UserManagementTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const users: UserRecord[] = [
    {
      id: '1',
      name: 'Dr. Priya Menon',
      role: 'doctor',
      email: 'priya.menon@hospital.gov',
      phone: '+91 98765 43210',
      organization: 'Medical College Hospital, Trivandrum',
      verified: true,
      lastActive: '2 hours ago',
      status: 'active',
    },
    {
      id: '2',
      name: 'District Hospital Ernakulam',
      role: 'hospital',
      email: 'admin@dhernakulam.gov',
      phone: '+91 98765 43211',
      organization: 'District Hospital, Ernakulam',
      verified: true,
      lastActive: '1 day ago',
      status: 'active',
    },
    {
      id: '3',
      name: 'Dr. Suresh Kumar',
      role: 'doctor',
      email: 'suresh.kumar@hospital.gov',
      phone: '+91 98765 43212',
      organization: 'Community Health Center, Kozhikode',
      verified: false,
      lastActive: '3 days ago',
      status: 'pending',
    },
    {
      id: '4',
      name: 'Rajesh Kumar',
      role: 'patient',
      email: 'rajesh.kumar@email.com',
      phone: '+91 98765 43213',
      verified: true,
      lastActive: '5 hours ago',
      status: 'active',
    },
  ];

  const roleFilters = [
    { id: 'all', name: 'All Users', count: users.length },
    { id: 'doctor', name: 'Doctors', count: users.filter(u => u.role === 'doctor').length },
    { id: 'hospital', name: 'Hospitals', count: users.filter(u => u.role === 'hospital').length },
    { id: 'patient', name: 'Patients', count: users.filter(u => u.role === 'patient').length },
  ];

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter(u => u.role === filterRole);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'doctor':
        return <User className="w-5 h-5" />;
      case 'hospital':
        return <Building2 className="w-5 h-5" />;
      case 'patient':
        return <User className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-100 text-blue-700';
      case 'hospital':
        return 'bg-purple-100 text-purple-700';
      case 'patient':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage doctors, hospitals, and patient accounts
            </p>
          </div>
          <Button variant="primary" icon={<UserCheck className="w-4 h-4" />}>
            Add User
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />

          <div className="flex gap-2 overflow-x-auto">
            {roleFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterRole(filter.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterRole === filter.id
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

      {/* Pending Verifications */}
      {users.filter(u => !u.verified).length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Pending Verifications ({users.filter(u => !u.verified).length})
              </h3>
              <p className="text-sm text-muted-foreground">
                Review and verify new healthcare professional accounts
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Review Pending
          </Button>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-[#0b6e4f]">{users.filter(u => u.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Active Users</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{users.filter(u => u.status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-red-600">{users.filter(u => u.status === 'suspended').length}</p>
          <p className="text-sm text-muted-foreground">Suspended</p>
        </Card>
        <Card hover className="text-center">
          <p className="text-2xl font-bold text-[#2196F3]">{users.filter(u => u.verified).length}</p>
          <p className="text-sm text-muted-foreground">Verified</p>
        </Card>
      </div>

      {/* User List */}
      <div className="space-y-3">
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
                  <div className={`w-12 h-12 rounded-full ${getRoleColor(user.role)} flex items-center justify-center`}>
                    {getRoleIcon(user.role)}
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
                      <p>📱 {user.phone}</p>
                      {user.organization && (
                        <p>🏥 {user.organization}</p>
                      )}
                      <p className="text-xs">Last active: {user.lastActive}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!user.verified && (
                    <Button variant="primary" size="sm">
                      Verify
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Role Assignment Info */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔐</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Role-Based Access Control</h3>
            <p className="text-sm text-muted-foreground mb-2">
              The system uses strict role-based permissions to ensure data security and privacy.
            </p>
            <div className="text-sm space-y-1">
              <p>• <strong>Patients:</strong> View own records, manage consent</p>
              <p>• <strong>Doctors:</strong> Access patient records with consent, upload documents</p>
              <p>• <strong>Hospitals:</strong> Manage facilities, verify doctors</p>
              <p>• <strong>Admins:</strong> Full system access, analytics, user management</p>
            </div>
          </div>
        </div>
      </Card>

      <UserDetailDialog 
        user={selectedUser} 
        open={!!selectedUser} 
        onOpenChange={(open) => !open && setSelectedUser(null)} 
      />
    </div>
  );
}

function UserDetailDialog({ user, open, onOpenChange }: { 
  user: UserRecord | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              user.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
              user.role === 'hospital' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {user.role === 'doctor' ? <User className="w-6 h-6" /> :
               user.role === 'hospital' ? <Building2 className="w-6 h-6" /> :
               <User className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{user.name}</DialogTitle>
              <DialogDescription className="text-zinc-400 capitalize">
                {user.role} • {user.status}
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
              <p className="text-sm">{user.phone}</p>
            </div>
          </div>

          {user.organization && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Organization
              </p>
              <p className="text-sm">{user.organization}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Verification
              </p>
              <Badge variant={user.verified ? 'success' : 'warning'}>
                {user.verified ? 'Verified' : 'Pending'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3" /> Last Active
              </p>
              <p className="text-sm">{user.lastActive}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-800 flex gap-2">
            <Button variant="outline" className="flex-1 border-zinc-800 hover:bg-zinc-900" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {user.role === 'patient' && (
              <Button className="flex-1 bg-[#0b6e4f] hover:bg-[#0b6e4f]/90 text-white">
                Download Records
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
