import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit3,
  Trash2,
  Video,
  FileText,
  PlayCircle,
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  Megaphone
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { AccessGroup, PackageTargetGroup, PACKAGE_TARGET_OPTIONS } from '../../types';

interface ClassroomSetting {
  group_id: string;
  class_title: string;
  schedule_summary: string;
  zoom_url: string;
  zoom_meeting_id: string;
  zoom_passcode: string;
  announcement: string;
}

interface ClassSession {
  id: string;
  target_groups: string[];
  meeting_number: number;
  category: string;
  title: string;
  tutor_name: string;
  schedule_text: string;
  material_pdf_url: string;
  recording_url: string;
  notes: string;
  is_published: boolean;
}

const CLASS_GROUPS: { id: AccessGroup; label: string }[] = [
  { id: 'ONLINE_B1', label: 'Kelas Online Batch 1' },
  { id: 'OFFLINE', label: 'Kelas Offline' },
];

const SESSION_CATEGORIES = ['TWK', 'TIU', 'TKP', 'TRYOUT', 'UMUM'];

const emptySessionForm = {
  meeting_number: 1,
  category: 'TWK',
  title: '',
  tutor_name: '',
  schedule_text: '',
  target_groups: ['ONLINE_B1'] as PackageTargetGroup[],
  material_pdf_url: '',
  recording_url: '',
  notes: '',
  is_published: true,
};

export default function ClassroomManager() {
  const { state } = useApp();

  // State Pengaturan Zoom per Grup
  const [selectedConfigGroup, setSelectedConfigGroup] = useState<AccessGroup>('ONLINE_B1');
  const [zoomForm, setZoomForm] = useState<ClassroomSetting>({
    group_id: 'ONLINE_B1',
    class_title: 'Kelas Online Intensif SKD — Batch 1',
    schedule_summary: 'Senin, Rabu, Jumat • 19.45 WITA',
    zoom_url: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    announcement: '',
  });
  const [savingZoom, setSavingZoom] = useState(false);
  const [zoomSavedToast, setZoomSavedToast] = useState(false);

  // State Daftar Pertemuan
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState<'ALL' | AccessGroup>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [form, setForm] = useState(emptySessionForm);
  const [savingSession, setSavingSession] = useState(false);
  const [deleteId, setDeleteId] = useState<string>('');

  async function loadZoomConfig(groupId: AccessGroup) {
    const { data } = await supabase
      .from('classroom_settings')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle();

    if (data) {
      setZoomForm({
        group_id: data.group_id,
        class_title: data.class_title ?? '',
        schedule_summary: data.schedule_summary ?? '',
        zoom_url: data.zoom_url ?? '',
        zoom_meeting_id: data.zoom_meeting_id ?? '',
        zoom_passcode: data.zoom_passcode ?? '',
        announcement: data.announcement ?? '',
      });
    } else {
      const grpLabel = CLASS_GROUPS.find((g) => g.id === groupId)?.label ?? groupId;
      setZoomForm({
        group_id: groupId,
        class_title: grpLabel,
        schedule_summary: '',
        zoom_url: '',
        zoom_meeting_id: '',
        zoom_passcode: '',
        announcement: '',
      });
    }
  }

  async function loadSessions() {
    setLoading(true);
    const { data } = await supabase
      .from('class_sessions')
      .select('*')
      .order('meeting_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (data) setSessions(data as ClassSession[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadZoomConfig(selectedConfigGroup);
  }, [selectedConfigGroup]);

  async function handleSaveZoom(e: React.FormEvent) {
    e.preventDefault();
    setSavingZoom(true);
    setZoomSavedToast(false);

    const { error } = await supabase.from('classroom_settings').upsert(
      {
        ...zoomForm,
        group_id: selectedConfigGroup,
        updated_at: new Date().toISOString(),
        updated_by: state.profile?.id ?? null,
      },
      { onConflict: 'group_id' }
    );

    setSavingZoom(false);
    if (!error) {
      setZoomSavedToast(true);
      window.setTimeout(() => setZoomSavedToast(false), 3000);
    } else {
      console.error('Gagal menyimpan pengaturan Zoom:', error);
    }
  }

  function toggleTargetGroup(target: PackageTargetGroup) {
    setForm((prev) => {
      if (target === 'SEMUA') return { ...prev, target_groups: ['SEMUA'] };
      const withoutAll = prev.target_groups.filter((g) => g !== 'SEMUA');
      if (withoutAll.includes(target)) {
        const next = withoutAll.filter((g) => g !== target);
        return { ...prev, target_groups: next.length > 0 ? next : ['ONLINE_B1'] };
      }
      return { ...prev, target_groups: [...withoutAll, target] };
    });
  }

  function openNewForm() {
    const maxMeeting = sessions.reduce((max, s) => Math.max(max, s.meeting_number || 0), 0);
    setEditId('');
    setForm({
      ...emptySessionForm,
      meeting_number: maxMeeting + 1,
      target_groups: [selectedConfigGroup],
    });
    setShowForm(true);
  }

  function openEditForm(session: ClassSession) {
    setEditId(session.id);
    setForm({
      meeting_number: session.meeting_number || 1,
      category: session.category || 'TWK',
      title: session.title || '',
      tutor_name: session.tutor_name || '',
      schedule_text: session.schedule_text || '',
      target_groups: (session.target_groups?.length ? session.target_groups : ['ONLINE_B1']) as PackageTargetGroup[],
      material_pdf_url: session.material_pdf_url || '',
      recording_url: session.recording_url || '',
      notes: session.notes || '',
      is_published: Boolean(session.is_published),
    });
    setShowForm(true);
  }

  async function handleSubmitSession(e: React.FormEvent) {
    e.preventDefault();
    setSavingSession(true);

    const payload = {
      meeting_number: Number(form.meeting_number) || 1,
      category: form.category,
      title: form.title.trim(),
      tutor_name: form.tutor_name.trim(),
      schedule_text: form.schedule_text.trim(),
      target_groups: form.target_groups.length > 0 ? form.target_groups : ['ONLINE_B1'],
      material_pdf_url: form.material_pdf_url.trim(),
      recording_url: form.recording_url.trim(),
      notes: form.notes.trim(),
      is_published: form.is_published,
      created_by: state.profile?.id ?? null,
    };

    if (editId) {
      await supabase.from('class_sessions').update(payload).eq('id', editId);
    } else {
      await supabase.from('class_sessions').insert(payload);
    }

    setSavingSession(false);
    setShowForm(false);
    setEditId('');
    loadSessions();
  }

  async function togglePublished(session: ClassSession) {
    const nextStatus = !session.is_published;
    setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, is_published: nextStatus } : s)));
    await supabase.from('class_sessions').update({ is_published: nextStatus }).eq('id', session.id);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await supabase.from('class_sessions').delete().eq('id', deleteId);
    setDeleteId('');
    loadSessions();
  }

  const filteredSessions = sessions.filter((s) => {
    if (groupFilter === 'ALL') return true;
    const targets = s.target_groups || [];
    return targets.includes('SEMUA') || targets.includes(groupFilter);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Video className="w-6 h-6 text-[#1e3a8a]" />
            Kelola Ruang Kelas
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Atur Link Zoom rutin, pengumuman, materi PDF, dan rekaman Google Drive per pertemuan
          </p>
        </div>
        <button
          type="button"
          onClick={loadSessions}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          title="Muat Ulang Data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* PANEL 1: PENGATURAN ZOOM & PENGUMUMAN PER GRUP */}
      <form onSubmit={handleSaveZoom} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Banner Info Zoom &amp; Pengumuman Kelas</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Cukup diatur sekali untuk tautan Zoom berulang (Senin, Rabu, Jumat) pada masing-masing grup kelas.
            </p>
          </div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
            {CLASS_GROUPS.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setSelectedConfigGroup(grp.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedConfigGroup === grp.id
                    ? 'bg-white text-[#1e3a8a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Judul Kelas</label>
            <input
              value={zoomForm.class_title}
              onChange={(e) => setZoomForm({ ...zoomForm, class_title: e.target.value })}
              required
              placeholder="Contoh: Kelas Online Intensif SKD — Batch 1"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ringkasan Jadwal Rutin</label>
            <input
              value={zoomForm.schedule_summary}
              onChange={(e) => setZoomForm({ ...zoomForm, schedule_summary: e.target.value })}
              placeholder="Contoh: Senin, Rabu, Jumat • 19.45 WITA"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link Zoom Live (URL Lengkap)</label>
            <input
              type="url"
              value={zoomForm.zoom_url}
              onChange={(e) => setZoomForm({ ...zoomForm, zoom_url: e.target.value })}
              placeholder="https://us06web.zoom.us/j/..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Meeting ID (Opsional)</label>
            <input
              value={zoomForm.zoom_meeting_id}
              onChange={(e) => setZoomForm({ ...zoomForm, zoom_meeting_id: e.target.value })}
              placeholder="Contoh: 842 1920 3311"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Passcode Zoom (Opsional)</label>
            <input
              value={zoomForm.zoom_passcode}
              onChange={(e) => setZoomForm({ ...zoomForm, zoom_passcode: e.target.value })}
              placeholder="Contoh: LESKD2026"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-500" />
              Pengumuman Singkat di Atas Ruang Kelas (Opsional)
            </label>
            <input
              value={zoomForm.announcement}
              onChange={(e) => setZoomForm({ ...zoomForm, announcement: e.target.value })}
              placeholder="Contoh: Pertemuan 2 besok membahas TIU Hitung Cepat. Siapkan kertas coretan sebelum jam 19.45 WITA."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25 focus:border-[#1e3a8a]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {zoomSavedToast && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Info Zoom &amp; Pengumuman tersimpan!
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={savingZoom}
            className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {savingZoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Info Zoom
          </button>
        </div>
      </form>

      {/* PANEL 2: DAFTAR PERTEMUAN (MATERI PDF & REKAMAN GOOGLE DRIVE) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-gray-800 mr-2">Daftar Pertemuan ({filteredSessions.length})</h3>
            <button
              type="button"
              onClick={() => setGroupFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                groupFilter === 'ALL'
                  ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Semua
            </button>
            {CLASS_GROUPS.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setGroupFilter(grp.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  groupFilter === grp.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openNewForm}
            className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Pertemuan
          </button>
        </div>

        {/* Form Tambah / Edit Pertemuan */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmitSession}
              className="bg-white rounded-3xl border border-indigo-200 shadow-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800">
                  {editId ? 'Edit Materi Pertemuan' : 'Tambah Pertemuan Baru'}
                </h4>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pertemuan Ke-</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.meeting_number}
                    onChange={(e) => setForm({ ...form, meeting_number: parseInt(e.target.value, 10) || 1 })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  >
                    {SESSION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Judul Materi Pertemuan</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Contoh: TWK — Nasionalisme & Bela Negara"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Jadwal / Tanggal</label>
                  <input
                    value={form.schedule_text}
                    onChange={(e) => setForm({ ...form, schedule_text: e.target.value })}
                    placeholder="Contoh: Rabu, 25 Nov 2026 • 19.45 WITA"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Tentor</label>
                  <input
                    value={form.tutor_name}
                    onChange={(e) => setForm({ ...form, tutor_name: e.target.value })}
                    placeholder="Contoh: Kak Abdi"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Link Google Drive — Materi PDF (Opsional)
                  </label>
                  <input
                    type="url"
                    value={form.material_pdf_url}
                    onChange={(e) => setForm({ ...form, material_pdf_url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Link Google Drive — Video Rekaman (Opsional)
                  </label>
                  <input
                    type="url"
                    value={form.recording_url}
                    onChange={(e) => setForm({ ...form, recording_url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                  />
                </div>
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                Pastikan izin file di Google Drive sudah diset ke <strong>&ldquo;Siapa saja yang memiliki tautan (Pelihat/Viewer)&rdquo;</strong> agar peserta bisa langsung membacanya di dalam web.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Catatan Singkat (Opsional)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Contoh: Silakan kerjakan paket Drilling TWK 1 setelah membaca PDF ini."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Tag className="w-3.5 h-3.5 text-[#1e3a8a]" /> Target Grup Kelas
                </label>
                <div className="flex flex-wrap gap-2">
                  {PACKAGE_TARGET_OPTIONS.filter((o) => o.id !== 'UMUM').map((opt) => {
                    const isSelected = form.target_groups.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleTargetGroup(opt.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? opt.activeBtnClass
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  Tampilkan langsung di Ruang Kelas peserta
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingSession}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold disabled:opacity-60"
                  >
                    {savingSession ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {editId ? 'Simpan Perubahan' : 'Simpan Pertemuan'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* List Pertemuan */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
            Belum ada pertemuan. Klik &ldquo;Tambah Pertemuan&rdquo; untuk memasukkan jadwal dan link Google Drive.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                      P{session.meeting_number}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {session.category}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${session.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {session.is_published ? 'Tayang' : 'Draft'}
                    </span>
                    {(session.target_groups || []).map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {t}
                      </span>
                    ))}
                  </div>

                  <p className="font-bold text-gray-800 text-sm">{session.title}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {session.schedule_text && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> {session.schedule_text}
                      </span>
                    )}
                    {session.tutor_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" /> {session.tutor_name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {session.material_pdf_url ? (
                      <a
                        href={session.material_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <FileText className="w-3 h-3" /> PDF Siap <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">PDF belum diisi</span>
                    )}

                    {session.recording_url ? (
                      <a
                        href={session.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <PlayCircle className="w-3 h-3" /> Rekaman Siap <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">Rekaman belum diisi</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePublished(session)}
                    className={`p-2 rounded-xl transition-colors ${
                      session.is_published
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                    }`}
                    title={session.is_published ? 'Sembunyikan (Draft)' : 'Tayangkan ke peserta'}
                  >
                    {session.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(session)}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                    title="Edit pertemuan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(session.id)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                    title="Hapus pertemuan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-1">Hapus Pertemuan?</h3>
              <p className="text-gray-500 text-xs mb-5">File asli di Google Drive Anda tetap aman; hanya daftar di web yang dihapus.</p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteId('')}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
