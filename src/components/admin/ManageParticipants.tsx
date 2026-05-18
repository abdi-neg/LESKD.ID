import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, UserX, RefreshCw, Users, Clock, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';

export default function ManageParticipants() {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'participant')
      .order('created_at', { ascending: false });
    if (data) setParticipants(data as Profile[]);
    setLoading(false);
  }

  useEffect(() => { loadParticipants(); }, []);

  async function handleApprove(id: string) {
    setActionLoading(id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('profiles')
      .update({ is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq('id', id);
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, is_approved: true } : p));
    setActionLoading(null);
  }

  async function handleRevoke(id: string) {
    setActionLoading(id);
    await supabase
      .from('profiles')
      .update({ is_approved: false, approved_by: null, approved_at: null })
      .eq('id', id);
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, is_approved: false } : p));
    setActionLoading(null);
  }

  const filtered = participants.filter((p) => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'pending' && !p.is_approved) || (filter === 'approved' && p.is_approved);
    return matchSearch && matchFilter;
  });

  const pendingCount = participants.filter((p) => !p.is_approved).length;
  const approvedCount = participants.filter((p) => p.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kelola Peserta</h1>
          <p className="text-gray-500 text-sm mt-0.5">Setujui atau nonaktifkan akun Peserta</p>
        </div>
        <button onClick={loadParticipants} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Peserta', value: participants.length, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
          { label: 'Menunggu Persetujuan', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Peserta Aktif', value: approvedCount, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? 'bg-[#1e3a8a] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'pending' ? 'Pending' : 'Aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada peserta ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((participant, i) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-[#10b981]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[#10b981]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{participant.full_name}</p>
                <p className="text-gray-500 text-sm truncate">{participant.email}</p>
                {participant.created_at && (
                  <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Daftar {new Date(participant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {participant.is_approved ? (
                  <>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981] bg-emerald-50 px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Aktif
                    </span>
                    <button
                      onClick={() => handleRevoke(participant.id)}
                      disabled={actionLoading === participant.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Nonaktifkan
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                    <button
                      onClick={() => handleApprove(participant.id)}
                      disabled={actionLoading === participant.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#10b981] hover:bg-[#059669] px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Setujui
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
