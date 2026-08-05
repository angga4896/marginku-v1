import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  Database, Calculator, BookOpen, Settings, Trash2, 
  Printer, Download, Cloud, Lock, Unlock, Wrench, RefreshCw, Plus, AlertTriangle, Users, Copy, Check
} from 'lucide-react';
import { BahanBaku, TenagaKerja, AlatProduksi, ResepHPP } from './types';
import { safeNum, formatRp, exportToCSV } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<'master' | 'kalkulator' | 'katalog' | 'pengaturan'>('kalkulator');
  
  // Mode User (Admin vs Staff) & URL Handling
  const [isAdmin, setIsAdmin] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto detect mode staff dari URL (?mode=staff)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'staff') {
      setIsAdmin(false);
    }
  }, []);

  // Master Data State
  const [bahanMaster, setBahanMaster] = useState<BahanBaku[]>([]);
  const [tenagaMaster, setTenagaMaster] = useState<TenagaKerja[]>([]);
  const [alatMaster, setAlatMaster] = useState<AlatProduksi[]>([]);
  const [resepList, setResepList] = useState<ResepHPP[]>([]);

  // Master Inputs
  const [newBahan, setNewBahan] = useState({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' as const });
  const [newTenaga, setNewTenaga] = useState({ nama: '', tipe: 'gaji_harian' as const, nominal: '', jamKerjaHarian: '8' });
  const [newAlat, setNewAlat] = useState({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });

  // Kalkulator Form State
  const [namaProduk, setNamaProduk] = useState('');
  const [targetPorsi, setTargetPorsi] = useState<string>('10');
  const [selectedBahanList, setSelectedBahanList] = useState<{ id: string; bahanId: string; namaManual: string; hargaBeli: string; isiKemasan: string; pemakaian: string }[]>([]);
  const [selectedTenagaList, setSelectedTenagaList] = useState<{ id: string; tenagaId: string; namaManual: string; tipe: 'jam' | 'borongan'; durasiAtauNominal: string }[]>([]);
  const [selectedAlatList, setSelectedAlatList] = useState<{ id: string; alatId: string; namaManual: string; hargaBeli: string; umurBulan: string; targetPorsiHarian: string }[]>([]);
  const [overheadList, setOverheadList] = useState<{ id: string; nama: string; nominal: string }[]>([]);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // Modal Deduplication State
  const [duplicateModal, setDuplicateModal] = useState<{
    show: boolean;
    type: 'bahan' | 'alat';
    newItem: any;
    existingItem: any;
    onResolve: (action: 'overwrite' | 'keep_old' | 'save_new') => void;
  }>({ show: false, type: 'bahan', newItem: null, existingItem: null, onResolve: () => {} });

  // Settings & Sync State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronous LocalStorage Load
  useLayoutEffect(() => {
    try {
      const savedBahan = localStorage.getItem('marginku_bahan');
      const savedTenaga = localStorage.getItem('marginku_tenaga');
      const savedAlat = localStorage.getItem('marginku_alat');
      const savedResep = localStorage.getItem('marginku_resep');
      const savedWebhook = localStorage.getItem('marginku_webhook');

      if (savedBahan) setBahanMaster(JSON.parse(savedBahan));
      if (savedTenaga) setTenagaMaster(JSON.parse(savedTenaga));
      if (savedAlat) setAlatMaster(JSON.parse(savedAlat));
      if (savedResep) setResepList(JSON.parse(savedResep));
      if (savedWebhook) setWebhookUrl(savedWebhook);
    } catch (e) {
      console.error('Error LocalStorage:', e);
    }
  }, []);

  // Save LocalStorage
  useEffect(() => { localStorage.setItem('marginku_bahan', JSON.stringify(bahanMaster)); }, [bahanMaster]);
  useEffect(() => { localStorage.setItem('marginku_tenaga', JSON.stringify(tenagaMaster)); }, [tenagaMaster]);
  useEffect(() => { localStorage.setItem('marginku_alat', JSON.stringify(alatMaster)); }, [alatMaster]);
  useEffect(() => { localStorage.setItem('marginku_resep', JSON.stringify(resepList)); }, [resepList]);

  // Auto Fetch dari Cloud
  useEffect(() => {
    const savedWebhook = localStorage.getItem('marginku_webhook');
    if (savedWebhook) fetchFromCloud(savedWebhook);
  }, []);

  const fetchFromCloud = async (url: string) => {
    if (!url) return;
    setIsSyncing(true);
    setSyncStatus('Mengambil data dari Cloud...');
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        const cloudData = json.data;
        if (cloudData.bahanMaster) setBahanMaster(cloudData.bahanMaster);
        if (cloudData.tenagaMaster) setTenagaMaster(cloudData.tenagaMaster);
        if (cloudData.alatMaster) setAlatMaster(cloudData.alatMaster);
        if (cloudData.resepList) setResepList(cloudData.resepList);
        setSyncStatus('Data tersinkronisasi dari Cloud!');
      }
    } catch (e) {
      setSyncStatus('Mode Offline / Menggunakan Data Lokal.');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async (overrideData?: any) => {
    if (!webhookUrl) return;
    setIsSyncing(true);
    setSyncStatus('Mengirim pembaruan ke Cloud...');
    try {
      const payload = overrideData || { bahanMaster, tenagaMaster, alatMaster, resepList };
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'MARGINKU_BACKUP', payload }),
      });
      localStorage.setItem('marginku_webhook', webhookUrl);
      setSyncStatus('Pembaruan tersimpan ke Cloud!');
    } catch (e) {
      setSyncStatus('Gagal update ke Cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers Master Data
  const handleAddBahan = () => {
    if (!newBahan.nama || !newBahan.hargaBeli || !newBahan.isiKemasan) return;
    const updated = [...bahanMaster, {
      id: Date.now().toString(),
      nama: newBahan.nama,
      hargaBeli: safeNum(newBahan.hargaBeli),
      isiKemasan: Math.max(1, safeNum(newBahan.isiKemasan)),
      satuan: newBahan.satuan,
    }];
    setBahanMaster(updated);
    setNewBahan({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' });
    syncToCloud({ bahanMaster: updated, tenagaMaster, alatMaster, resepList });
  };

  const handleAddTenaga = () => {
    if (!newTenaga.nama || !newTenaga.nominal) return;
    const updated = [...tenagaMaster, {
      id: Date.now().toString(),
      nama: newTenaga.nama,
      tipe: newTenaga.tipe,
      nominal: safeNum(newTenaga.nominal),
      jamKerjaHarian: safeNum(newTenaga.jamKerjaHarian || '8')
    }];
    setTenagaMaster(updated);
    setNewTenaga({ nama: '', tipe: 'gaji_harian', nominal: '', jamKerjaHarian: '8' });
    syncToCloud({ bahanMaster, tenagaMaster: updated, alatMaster, resepList });
  };

  const handleAddAlat = () => {
    if (!newAlat.nama || !newAlat.hargaBeli) return;
    const updated = [...alatMaster, {
      id: Date.now().toString(),
      nama: newAlat.nama,
      hargaBeli: safeNum(newAlat.hargaBeli),
      umurBulan: Math.max(1, safeNum(newAlat.umurBulan)),
      targetPorsiHarian: Math.max(1, safeNum(newAlat.targetPorsiHarian)),
    }];
    setAlatMaster(updated);
    setNewAlat({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
    syncToCloud({ bahanMaster, tenagaMaster, alatMaster: updated, resepList });
  };

  // Kalkulasi Math Defensive
  const porsi = Math.max(1, safeNum(targetPorsi));

  const totalBiayaBahan = selectedBahanList.reduce((acc, item) => {
    if (item.bahanId === 'MANUAL') {
      const hargaPerSatuan = safeNum(item.hargaBeli) / Math.max(1, safeNum(item.isiKemasan));
      return acc + (hargaPerSatuan * safeNum(item.pemakaian));
    }
    const bahan = bahanMaster.find((b) => b.id === item.bahanId);
    if (!bahan) return acc;
    const hargaPerSatuan = bahan.hargaBeli / Math.max(1, bahan.isiKemasan);
    return acc + (hargaPerSatuan * safeNum(item.pemakaian));
  }, 0);

  const totalBiayaTenaga = selectedTenagaList.reduce((acc, item) => {
    if (item.tipe === 'borongan') {
      return acc + safeNum(item.durasiAtauNominal);
    }
    // Gaji Harian pro-rata menit (8 jam = 480 menit)
    const tarifPerMenit = (safeNum(item.durasiAtauNominal) / 8) / 60;
    return acc + (tarifPerMenit * safeNum(item.durasiAtauNominal));
  }, 0);

  const totalBiayaAlat = selectedAlatList.reduce((acc, item) => {
    if (item.alatId === 'MANUAL') {
      const totalHari = Math.max(1, safeNum(item.umurBulan)) * 30;
      const totalPorsiUmur = totalHari * Math.max(1, safeNum(item.targetPorsiHarian));
      const depresiasiPerPorsi = safeNum(item.hargaBeli) / Math.max(1, totalPorsiUmur);
      return acc + (depresiasiPerPorsi * porsi);
    }
    const alat = alatMaster.find((a) => a.id === item.alatId);
    if (!alat) return acc;
    const totalHari = Math.max(1, alat.umurBulan) * 30;
    const totalPorsiUmur = totalHari * Math.max(1, alat.targetPorsiHarian);
    const depresiasiPerPorsi = alat.hargaBeli / Math.max(1, totalPorsiUmur);
    return acc + (depresiasiPerPorsi * porsi);
  }, 0);

  const totalBiayaOverhead = overheadList.reduce((acc, item) => acc + safeNum(item.nominal), 0);
  const totalHppKeseluruhan = totalBiayaBahan + totalBiayaTenaga + totalBiayaAlat + totalBiayaOverhead;
  const hppPerPorsi = totalHppKeseluruhan / porsi;
  const hargaJualTarget = hppPerPorsi / Math.max(0.01, (1 - (safeNum(targetMargin) / 100)));

  // Simpan Resep HPP
  const handleSimpanResep = async () => {
    if (!isAdmin) return alert('Mode Staff hanya dapat membaca data!');
    if (!namaProduk) return alert('Masukkan Nama Produk!');

    let currentBahanMaster = [...bahanMaster];
    let currentAlatMaster = [...alatMaster];

    // Check Auto-Save Bahan Manual
    for (const item of selectedBahanList) {
      if (item.bahanId === 'MANUAL' && item.namaManual) {
        const existing = currentBahanMaster.find(b => b.nama.toLowerCase().trim() === item.namaManual.toLowerCase().trim());
        if (existing) {
          const choice = await new Promise<'overwrite' | 'keep_old' | 'save_new'>((resolve) => {
            setDuplicateModal({
              show: true,
              type: 'bahan',
              newItem: { nama: item.namaManual, hargaBeli: safeNum(item.hargaBeli), isiKemasan: safeNum(item.isiKemasan) },
              existingItem: existing,
              onResolve: resolve
            });
          });
          setDuplicateModal(prev => ({ ...prev, show: false }));

          if (choice === 'overwrite') {
            currentBahanMaster = currentBahanMaster.map(b => b.id === existing.id ? { ...b, hargaBeli: safeNum(item.hargaBeli), isiKemasan: Math.max(1, safeNum(item.isiKemasan)) } : b);
          } else if (choice === 'save_new') {
            currentBahanMaster.push({ id: Date.now().toString(), nama: item.namaManual + ' (Baru)', hargaBeli: safeNum(item.hargaBeli), isiKemasan: Math.max(1, safeNum(item.isiKemasan)), satuan: 'gram' });
          }
        } else {
          currentBahanMaster.push({ id: Date.now().toString(), nama: item.namaManual, hargaBeli: safeNum(item.hargaBeli), isiKemasan: Math.max(1, safeNum(item.isiKemasan)), satuan: 'gram' });
        }
      }
    }

    setBahanMaster(currentBahanMaster);

    const resepBaru: ResepHPP = {
      id: Date.now().toString(),
      namaProduk,
      targetPorsi: porsi,
      bahanList: selectedBahanList.map(i => {
        const b = i.bahanId === 'MANUAL' ? null : currentBahanMaster.find(x => x.id === i.bahanId);
        const namaBahan = i.bahanId === 'MANUAL' ? i.namaManual : (b?.nama || '');
        const hargaBeli = i.bahanId === 'MANUAL' ? safeNum(i.hargaBeli) : (b?.hargaBeli || 0);
        const isi = i.bahanId === 'MANUAL' ? Math.max(1, safeNum(i.isiKemasan)) : Math.max(1, b?.isiKemasan || 1);
        return { bahanId: i.bahanId, nama: namaBahan, jumlahPemakaian: safeNum(i.pemakaian), biayaSubtotal: (hargaBeli / isi) * safeNum(i.pemakaian) };
      }),
      operasionalList: overheadList.map(o => ({ id: o.id, nama: o.nama, nominal: safeNum(o.nominal) })),
      totalHppPerPorsi: hppPerPorsi,
      targetMarginPersen: targetMargin,
      hargaJualBEP: hppPerPorsi,
      hargaJualTarget,
      tanggalDibuat: new Date().toLocaleDateString('id-ID'),
    };

    const updatedResep = [...resepList, resepBaru];
    setResepList(updatedResep);
    alert('Resep HPP Berhasil Disimpan!');
    setNamaProduk('');
    setSelectedBahanList([]);
    setSelectedTenagaList([]);
    setSelectedAlatList([]);
    setOverheadList([]);
    
    syncToCloud({ bahanMaster: currentBahanMaster, tenagaMaster, alatMaster: currentAlatMaster, resepList: updatedResep });
  };

  // Copy Link Staff
  const handleCopyStaffLink = () => {
    const staffUrl = `${window.location.origin}${window.location.pathname}?mode=staff`;
    navigator.clipboard.writeText(staffUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">MarginKu</h1>
          <p className="text-xs text-emerald-100">Kalkulator HPP & Margin UMKM</p>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <RefreshCw size={14} className="animate-spin text-emerald-200" />}
          <button onClick={() => setIsAdmin(!isAdmin)} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border ${isAdmin ? 'bg-emerald-800 border-emerald-600' : 'bg-amber-600 border-amber-500'}`}>
            {isAdmin ? <Unlock size={14}/> : <Lock size={14}/>}
            {isAdmin ? 'Mode Admin' : 'Mode Staff (Read-Only)'}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {syncStatus && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg text-center font-medium">
            {syncStatus}
          </div>
        )}

        {/* TAB 1: MASTER DATA */}
        {activeTab === 'master' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Database size={20}/> Bank Data Reusable</h2>
            
            {isAdmin && (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-emerald-700">+ Master Bahan Baku</h3>
                  <input type="text" placeholder="Nama Bahan" value={newBahan.nama} onChange={e => setNewBahan({...newBahan, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Harga Beli (Rp)" value={newBahan.hargaBeli} onChange={e => setNewBahan({...newBahan, hargaBeli: e.target.value})} className="p-2 border text-sm rounded-lg" />
                    <input type="number" placeholder="Isi Kemasan" value={newBahan.isiKemasan} onChange={e => setNewBahan({...newBahan, isiKemasan: e.target.value})} className="p-2 border text-sm rounded-lg" />
                  </div>
                  <button onClick={handleAddBahan} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium">Simpan Bahan</button>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-emerald-700">+ Master Tenaga Kerja</h3>
                  <input type="text" placeholder="Nama / Jabatan Staf" value={newTenaga.nama} onChange={e => setNewTenaga({...newTenaga, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newTenaga.tipe} onChange={e => setNewTenaga({...newTenaga, tipe: e.target.value as any})} className="p-2 border text-xs rounded-lg">
                      <option value="gaji_harian">Gaji Harian</option>
                      <option value="borongan">Tarif Borongan</option>
                    </select>
                    <input type="number" placeholder="Nominal (Rp)" value={newTenaga.nominal} onChange={e => setNewTenaga({...newTenaga, nominal: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddTenaga} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium">Simpan Tenaga Kerja</button>
                </div>
              </>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-sm mb-2">Master Bahan Baku ({bahanMaster.length})</h3>
              <div className="divide-y max-h-48 overflow-y-auto">
                {bahanMaster.map((b) => (
                  <div key={b.id} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold">{b.nama}</p>
                      <p className="text-slate-500">{formatRp(b.hargaBeli)} / {b.isiKemasan} {b.satuan}</p>
                    </div>
                    {isAdmin && <button onClick={() => {
                      const updated = bahanMaster.filter(x => x.id !== b.id);
                      setBahanMaster(updated);
                      syncToCloud({ bahanMaster: updated, tenagaMaster, alatMaster, resepList });
                    }} className="text-red-500 p-1"><Trash2 size={14}/></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KALKULATOR HPP */}
        {activeTab === 'kalkulator' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-md font-bold text-slate-800">1. Resep Produk</h2>
              <input type="text" disabled={!isAdmin} placeholder="Nama Produk (cth: Dimsum Ayam)" value={namaProduk} onChange={e => setNamaProduk(e.target.value)} className="w-full p-2.5 border text-sm rounded-lg" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 whitespace-nowrap">Target Hasil Porsi:</label>
                <input type="number" disabled={!isAdmin} value={targetPorsi} onChange={e => setTargetPorsi(e.target.value)} className="w-full p-2 border text-sm rounded-lg" />
              </div>
            </div>

            {/* Section 2: Bahan Baku */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">2. Biaya Bahan Baku</h3>
                {isAdmin && <button onClick={() => setSelectedBahanList([...selectedBahanList, { id: Date.now().toString(), bahanId: '', namaManual: '', hargaBeli: '', isiKemasan: '1000', pemakaian: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>}
              </div>
              {selectedBahanList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select disabled={!isAdmin} value={item.bahanId} onChange={e => {
                      const copy = [...selectedBahanList]; copy[index].bahanId = e.target.value; setSelectedBahanList(copy);
                    }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih dari Master --</option>
                      {bahanMaster.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                      <option value="MANUAL">+ Input Manual (Simpan Baru)</option>
                    </select>
                    {isAdmin && <button onClick={() => setSelectedBahanList(selectedBahanList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>}
                  </div>
                  {item.bahanId === 'MANUAL' && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <input type="text" placeholder="Nama" value={item.namaManual} onChange={e => { const copy = [...selectedBahanList]; copy[index].namaManual = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Harga" value={item.hargaBeli} onChange={e => { const copy = [...selectedBahanList]; copy[index].hargaBeli = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Isi (gr/ml)" value={item.isiKemasan} onChange={e => { const copy = [...selectedBahanList]; copy[index].isiKemasan = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border">
                    <span className="text-slate-500">Pemakaian:</span>
                    <input type="number" disabled={!isAdmin} placeholder="Gram/ml" value={item.pemakaian} onChange={e => { const copy = [...selectedBahanList]; copy[index].pemakaian = e.target.value; setSelectedBahanList(copy); }} className="w-28 p-1 border rounded text-right font-semibold" />
                  </div>
                </div>
              ))}
            </div>

            {/* Section 3: Tenaga Kerja */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1"><Users size={16}/> 3. Biaya Tenaga Kerja</h3>
                {isAdmin && <button onClick={() => setSelectedTenagaList([...selectedTenagaList, { id: Date.now().toString(), tenagaId: '', namaManual: '', tipe: 'borongan', durasiAtauNominal: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>}
              </div>
              {selectedTenagaList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select disabled={!isAdmin} value={item.tenagaId} onChange={e => {
                      const copy = [...selectedTenagaList]; copy[index].tenagaId = e.target.value; setSelectedTenagaList(copy);
                    }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih Tenaga Kerja --</option>
                      {tenagaMaster.map(t => <option key={t.id} value={t.id}>{t.nama} ({t.tipe})</option>)}
                      <option value="MANUAL">+ Manual / Borongan Baru</option>
                    </select>
                    {isAdmin && <button onClick={() => setSelectedTenagaList(selectedTenagaList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>}
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border">
                    <span className="text-slate-500">Tarif / Durasi:</span>
                    <input type="number" disabled={!isAdmin} placeholder="Nominal (Rp)" value={item.durasiAtauNominal} onChange={e => { const copy = [...selectedTenagaList]; copy[index].durasiAtauNominal = e.target.value; setSelectedTenagaList(copy); }} className="w-28 p-1 border rounded text-right font-semibold" />
                  </div>
                </div>
              ))}
            </div>

            {/* Section 4: Penyusutan Alat */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1"><Wrench size={16}/> 4. Penyusutan Alat</h3>
                {isAdmin && <button onClick={() => setSelectedAlatList([...selectedAlatList, { id: Date.now().toString(), alatId: '', namaManual: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>}
              </div>
              {selectedAlatList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select disabled={!isAdmin} value={item.alatId} onChange={e => {
                      const copy = [...selectedAlatList]; copy[index].alatId = e.target.value; setSelectedAlatList(copy);
                    }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih Alat Master --</option>
                      {alatMaster.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                    </select>
                    {isAdmin && <button onClick={() => setSelectedAlatList(selectedAlatList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Section 5: Overhead & Biaya Lainnya */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">5. Biaya Overhead & Stiker</h3>
                {isAdmin && <button onClick={() => setOverheadList([...overheadList, { id: Date.now().toString(), nama: '', nominal: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>}
              </div>
              {overheadList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center text-xs">
                  <input type="text" disabled={!isAdmin} placeholder="Nama Biaya (Gas/Listrik/Stiker)" value={item.nama} onChange={e => { const copy = [...overheadList]; copy[index].nama = e.target.value; setOverheadList(copy); }} className="w-full p-2 border rounded-lg" />
                  <input type="number" disabled={!isAdmin} placeholder="Rp" value={item.nominal} onChange={e => { const copy = [...overheadList]; copy[index].nominal = e.target.value; setOverheadList(copy); }} className="w-24 p-2 border rounded-lg" />
                  {isAdmin && <button onClick={() => setOverheadList(overheadList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>}
                </div>
              ))}
            </div>

            {/* Ringkasan & Profit Slider */}
            <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-md space-y-3">
              <div className="flex justify-between items-center text-xs text-emerald-200">
                <span>HPP per Porsi:</span>
                <span className="text-lg font-bold text-white">{formatRp(hppPerPorsi)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Target Margin: {targetMargin}%</span>
                  <span className="font-semibold text-emerald-300">Target Jual: {formatRp(hargaJualTarget)}</span>
                </div>
                <input type="range" disabled={!isAdmin} min="5" max="80" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-400" />
              </div>
              {isAdmin && <button onClick={handleSimpanResep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-2.5 rounded-lg shadow">Simpan Resep HPP</button>}
            </div>
          </div>
        )}

        {/* TAB 3: KATALOG RESEP (Download PDF & Excel Per Resep) */}
        {activeTab === 'katalog' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Katalog Resep HPP</h2>
            {resepList.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{r.namaProduk}</h3>
                    <p className="text-xs text-slate-500">{r.targetPorsi} Porsi • Dibuat: {r.tanggalDibuat}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">{formatRp(r.hargaJualTarget)}</span>
                    <p className="text-[10px] text-slate-400 mt-1">HPP: {formatRp(r.totalHppPerPorsi)}/porsi</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => window.print()} className="flex-1 text-xs border border-slate-300 py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium hover:bg-slate-50">
                    <Printer size={14}/> Cetak PDF
                  </button>
                  <button onClick={() => exportToCSV(`Resep-${r.namaProduk}`, r.bahanList)} className="flex-1 text-xs border border-emerald-300 text-emerald-800 bg-emerald-50 py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium hover:bg-emerald-100">
                    <Download size={14}/> Download Excel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PENGATURAN & LINK AKSES STAFF */}
        {activeTab === 'pengaturan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Pengaturan System</h2>
            
            {isAdmin && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-800"><Users size={16}/> Akses Mode Staff (Read-Only)</h3>
                <p className="text-xs text-slate-500">Bagikan link khusus di bawah ini ke tim/staf agar mereka hanya bisa membaca katalog & resep tanpa bisa merubah data.</p>
                <button onClick={handleCopyStaffLink} className="w-full bg-slate-100 hover:bg-slate-200 border text-slate-800 text-xs py-2.5 rounded-lg font-semibold flex justify-center items-center gap-2">
                  {copiedLink ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
                  {copiedLink ? 'Link Berhasil Disalin!' : 'Salin Link Akses Staff'}
                </button>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Cloud size={16}/> Integrasi Google Drive</h3>
              <input type="text" disabled={!isAdmin} placeholder="Google Webhook App URL" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full p-2 border text-xs rounded-lg" />
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => fetchFromCloud(webhookUrl)} className="flex-1 bg-emerald-700 text-white text-xs py-2 rounded-lg font-medium">Tarik Data Cloud</button>
                  <button onClick={() => syncToCloud()} className="flex-1 bg-slate-800 text-white text-xs py-2 rounded-lg font-medium">Kirim Data Cloud</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* POPUP DEDUPLICATION */}
      {duplicateModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm border-b pb-2">
              <AlertTriangle size={18}/> Data Sudah Ada di Master
            </div>
            <p className="text-xs text-slate-600">
              Data <strong>"{duplicateModal.newItem?.nama}"</strong> sudah ada. Pilih opsi penanganan:
            </p>
            <div className="space-y-2">
              <button onClick={() => duplicateModal.onResolve('overwrite')} className="w-full text-xs bg-emerald-600 text-white py-2.5 rounded-xl font-semibold">Timpa / Update Data Lama</button>
              <button onClick={() => duplicateModal.onResolve('save_new')} className="w-full text-xs bg-slate-100 text-slate-800 border py-2.5 rounded-xl font-semibold">Simpan Sebagai Data Baru</button>
              <button onClick={() => duplicateModal.onResolve('keep_old')} className="w-full text-xs text-slate-500 py-2 hover:underline">Gunakan Data Lama</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50">
        <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center text-[10px] ${activeTab === 'master' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Database size={18}/> Master</button>
        <button onClick={() => setActiveTab('kalkulator')} className={`flex flex-col items-center text-[10px] ${activeTab === 'kalkulator' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Calculator size={18}/> Kalkulator</button>
        <button onClick={() => setActiveTab('katalog')} className={`flex flex-col items-center text-[10px] ${activeTab === 'katalog' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><BookOpen size={18}/> Katalog</button>
        <button onClick={() => setActiveTab('pengaturan')} className={`flex flex-col items-center text-[10px] ${activeTab === 'pengaturan' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Settings size={18}/> Pengaturan</button>
      </nav>
    </div>
  );
}
