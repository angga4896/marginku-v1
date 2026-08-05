import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  Database, Calculator, BookOpen, Settings, Trash2, 
  Printer, Download, Cloud, Lock, Unlock, Wrench, RefreshCw, Plus, AlertTriangle, Users, Copy, Check, Search, Store, DollarSign
} from 'lucide-react';
import { BahanBaku, TenagaKerja, AlatProduksi, ResepHPP } from './types';
import { safeNum, formatRp, exportToCSV } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<'master' | 'kalkulator' | 'katalog' | 'pengaturan'>('kalkulator');
  
  // Mode User (Admin vs Staff)
  const [isAdmin, setIsAdmin] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto detect mode staff (?mode=staff)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'staff') {
      setIsAdmin(false);
      setActiveTab('katalog');
    }
  }, []);

  // Master Data State
  const [bahanMaster, setBahanMaster] = useState<BahanBaku[]>([]);
  const [tenagaMaster, setTenagaMaster] = useState<TenagaKerja[]>([]);
  const [alatMaster, setAlatMaster] = useState<AlatProduksi[]>([]);
  const [overheadMaster, setOverheadMaster] = useState<{ id: string; nama: string; nominal: number }[]>([]);
  const [resepList, setResepList] = useState<ResepHPP[]>([]);

  // Master Inputs
  const [newBahan, setNewBahan] = useState({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' as const });
  const [newTenaga, setNewTenaga] = useState({ nama: '', tipe: 'gaji_harian' as const, nominal: '', jamKerjaHarian: '8' });
  const [newAlat, setNewAlat] = useState({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
  const [newOverhead, setNewOverhead] = useState({ nama: '', nominal: '' });

  // Kalkulator Form State
  const [namaProduk, setNamaProduk] = useState('');
  const [targetPorsi, setTargetPorsi] = useState<string>('10');
  const [selectedBahanList, setSelectedBahanList] = useState<{ id: string; bahanId: string; namaManual: string; hargaBeli: string; isiKemasan: string; pemakaian: string }[]>([]);
  const [selectedTenagaList, setSelectedTenagaList] = useState<{ id: string; tenagaId: string; namaManual: string; tipe: 'jam' | 'borongan'; durasiAtauNominal: string }[]>([]);
  const [selectedAlatList, setSelectedAlatList] = useState<{ id: string; alatId: string; namaManual: string; hargaBeli: string; umurBulan: string; targetPorsiHarian: string }[]>([]);
  const [selectedOverheadList, setSelectedOverheadList] = useState<{ id: string; overheadId: string; namaManual: string; nominal: string }[]>([]);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // Platform Ojek Online Admin Fee State (%)
  const [goFoodFee, setGoFoodFee] = useState<string>('20');
  const [grabFoodFee, setGrabFoodFee] = useState<string>('20');
  const [shopeeFoodFee, setShopeeFoodFee] = useState<string>('20');
  const [fixedFeeOjol, setFixedFeeOjol] = useState<string>('1000'); // Biaya penanganan/stiker jika ada

  // Modal Deduplication State
  const [duplicateModal, setDuplicateModal] = useState<{
    show: boolean;
    type: 'bahan' | 'alat' | 'overhead';
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
      const savedOverhead = localStorage.getItem('marginku_overhead');
      const savedResep = localStorage.getItem('marginku_resep');
      const savedWebhook = localStorage.getItem('marginku_webhook');

      if (savedBahan) setBahanMaster(JSON.parse(savedBahan));
      if (savedTenaga) setTenagaMaster(JSON.parse(savedTenaga));
      if (savedAlat) setAlatMaster(JSON.parse(savedAlat));
      if (savedOverhead) setOverheadMaster(JSON.parse(savedOverhead));
      if (savedResep) setResepList(JSON.parse(savedResep));
      if (savedWebhook) setWebhookUrl(savedWebhook);
    } catch (e) {
      console.error('Error LocalStorage:', e);
    }
  }, []);

  // Auto Save LocalStorage
  useEffect(() => { localStorage.setItem('marginku_bahan', JSON.stringify(bahanMaster)); }, [bahanMaster]);
  useEffect(() => { localStorage.setItem('marginku_tenaga', JSON.stringify(tenagaMaster)); }, [tenagaMaster]);
  useEffect(() => { localStorage.setItem('marginku_alat', JSON.stringify(alatMaster)); }, [alatMaster]);
  useEffect(() => { localStorage.setItem('marginku_overhead', JSON.stringify(overheadMaster)); }, [overheadMaster]);
  useEffect(() => { localStorage.setItem('marginku_resep', JSON.stringify(resepList)); }, [resepList]);

  // Cloud Sync
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
        if (cloudData.overheadMaster) setOverheadMaster(cloudData.overheadMaster);
        if (cloudData.resepList) setResepList(cloudData.resepList);
        setSyncStatus('Data tersinkronisasi dari Cloud!');
      }
    } catch (e) {
      setSyncStatus('Mode Offline / Data Lokal.');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async (overrideData?: any) => {
    if (!webhookUrl) return;
    setIsSyncing(true);
    setSyncStatus('Mengirim pembaruan ke Cloud...');
    try {
      const payload = overrideData || { bahanMaster, tenagaMaster, alatMaster, overheadMaster, resepList };
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'MARGINKU_BACKUP', payload }),
      });
      localStorage.setItem('marginku_webhook', webhookUrl);
      setSyncStatus('Pembaruan tersimpan di Cloud!');
    } catch (e) {
      setSyncStatus('Gagal update ke Cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Master Data Adders
  const handleAddBahan = () => {
    if (!newBahan.nama || !newBahan.hargaBeli || !newBahan.isiKemasan) return;
    const updated = [...bahanMaster, { id: Date.now().toString(), nama: newBahan.nama, hargaBeli: safeNum(newBahan.hargaBeli), isiKemasan: Math.max(1, safeNum(newBahan.isiKemasan)), satuan: newBahan.satuan }];
    setBahanMaster(updated);
    setNewBahan({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' });
    syncToCloud({ bahanMaster: updated, tenagaMaster, alatMaster, overheadMaster, resepList });
  };

  const handleAddTenaga = () => {
    if (!newTenaga.nama || !newTenaga.nominal) return;
    const updated = [...tenagaMaster, { id: Date.now().toString(), nama: newTenaga.nama, tipe: newTenaga.tipe, nominal: safeNum(newTenaga.nominal), jamKerjaHarian: safeNum(newTenaga.jamKerjaHarian || '8') }];
    setTenagaMaster(updated);
    setNewTenaga({ nama: '', tipe: 'gaji_harian', nominal: '', jamKerjaHarian: '8' });
    syncToCloud({ bahanMaster, tenagaMaster: updated, alatMaster, overheadMaster, resepList });
  };

  const handleAddAlat = () => {
    if (!newAlat.nama || !newAlat.hargaBeli) return;
    const updated = [...alatMaster, { id: Date.now().toString(), nama: newAlat.nama, hargaBeli: safeNum(newAlat.hargaBeli), umurBulan: Math.max(1, safeNum(newAlat.umurBulan)), targetPorsiHarian: Math.max(1, safeNum(newAlat.targetPorsiHarian)) }];
    setAlatMaster(updated);
    setNewAlat({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
    syncToCloud({ bahanMaster, tenagaMaster, alatMaster: updated, overheadMaster, resepList });
  };

  const handleAddOverhead = () => {
    if (!newOverhead.nama || !newOverhead.nominal) return;
    const updated = [...overheadMaster, { id: Date.now().toString(), nama: newOverhead.nama, nominal: safeNum(newOverhead.nominal) }];
    setOverheadMaster(updated);
    setNewOverhead({ nama: '', nominal: '' });
    syncToCloud({ bahanMaster, tenagaMaster, alatMaster, overheadMaster: updated, resepList });
  };

  // Math Calculations
  const porsi = Math.max(1, safeNum(targetPorsi));

  const totalBiayaBahan = selectedBahanList.reduce((acc, item) => {
    if (item.bahanId === 'MANUAL') {
      const hargaPerSatuan = safeNum(item.hargaBeli) / Math.max(1, safeNum(item.isiKemasan));
      return acc + (hargaPerSatuan * safeNum(item.pemakaian));
    }
    const bahan = bahanMaster.find((b) => b.id === item.bahanId);
    if (!bahan) return acc;
    return acc + ((bahan.hargaBeli / Math.max(1, bahan.isiKemasan)) * safeNum(item.pemakaian));
  }, 0);

  const totalBiayaTenaga = selectedTenagaList.reduce((acc, item) => {
    if (item.tipe === 'borongan') return acc + safeNum(item.durasiAtauNominal);
    const tarifPerMenit = (safeNum(item.durasiAtauNominal) / 8) / 60;
    return acc + (tarifPerMenit * safeNum(item.durasiAtauNominal));
  }, 0);

  const totalBiayaAlat = selectedAlatList.reduce((acc, item) => {
    if (item.alatId === 'MANUAL') {
      const totalHari = Math.max(1, safeNum(item.umurBulan)) * 30;
      const totalPorsiUmur = totalHari * Math.max(1, safeNum(item.targetPorsiHarian));
      return acc + ((safeNum(item.hargaBeli) / Math.max(1, totalPorsiUmur)) * porsi);
    }
    const alat = alatMaster.find((a) => a.id === item.alatId);
    if (!alat) return acc;
    const totalHari = Math.max(1, alat.umurBulan) * 30;
    const totalPorsiUmur = totalHari * Math.max(1, alat.targetPorsiHarian);
    return acc + ((alat.hargaBeli / Math.max(1, totalPorsiUmur)) * porsi);
  }, 0);

  const totalBiayaOverhead = selectedOverheadList.reduce((acc, item) => {
    if (item.overheadId === 'MANUAL') return acc + safeNum(item.nominal);
    const ov = overheadMaster.find((o) => o.id === item.overheadId);
    return acc + (ov ? ov.nominal : 0);
  }, 0);

  const totalHppKeseluruhan = totalBiayaBahan + totalBiayaTenaga + totalBiayaAlat + totalBiayaOverhead;
  const hppPerPorsi = totalHppKeseluruhan / porsi;
  
  // Harga BEP & Harga Jual Target Normal
  const hargaJualBEP = hppPerPorsi; 
  const hargaJualTarget = hppPerPorsi / Math.max(0.01, (1 - (safeNum(targetMargin) / 100)));

  // Formula Online Merchant Pricing (Gross-Up Fee)
  const calcOnlinePrice = (feePercentStr: string) => {
    const feePct = safeNum(feePercentStr) / 100;
    const extraFixed = safeNum(fixedFeeOjol);
    return (hargaJualTarget + extraFixed) / Math.max(0.01, (1 - feePct));
  };

  const hargaGoFood = calcOnlinePrice(goFoodFee);
  const hargaGrabFood = calcOnlinePrice(grabFoodFee);
  const hargaShopeeFood = calcOnlinePrice(shopeeFoodFee);

  // Simpan Resep HPP
  const handleSimpanResep = async () => {
    if (!isAdmin) return alert('Mode Staff hanya dapat membaca data!');
    if (!namaProduk) return alert('Masukkan Nama Produk!');

    let currentBahan = [...bahanMaster];
    let currentAlat = [...alatMaster];
    let currentOverhead = [...overheadMaster];

    // Auto-Save Manual Items to Master Data
    for (const item of selectedBahanList) {
      if (item.bahanId === 'MANUAL' && item.namaManual) {
        const existing = currentBahan.find(b => b.nama.toLowerCase().trim() === item.namaManual.toLowerCase().trim());
        if (!existing) {
          currentBahan.push({ id: Date.now().toString(), nama: item.namaManual, hargaBeli: safeNum(item.hargaBeli), isiKemasan: Math.max(1, safeNum(item.isiKemasan)), satuan: 'gram' });
        }
      }
    }

    for (const item of selectedAlatList) {
      if (item.alatId === 'MANUAL' && item.namaManual) {
        const existing = currentAlat.find(a => a.nama.toLowerCase().trim() === item.namaManual.toLowerCase().trim());
        if (!existing) {
          currentAlat.push({ id: Date.now().toString(), nama: item.namaManual, hargaBeli: safeNum(item.hargaBeli), umurBulan: Math.max(1, safeNum(item.umurBulan)), targetPorsiHarian: Math.max(1, safeNum(item.targetPorsiHarian)) });
        }
      }
    }

    for (const item of selectedOverheadList) {
      if (item.overheadId === 'MANUAL' && item.namaManual) {
        const existing = currentOverhead.find(o => o.nama.toLowerCase().trim() === item.namaManual.toLowerCase().trim());
        if (!existing) {
          currentOverhead.push({ id: Date.now().toString(), nama: item.namaManual, nominal: safeNum(item.nominal) });
        }
      }
    }

    setBahanMaster(currentBahan);
    setAlatMaster(currentAlat);
    setOverheadMaster(currentOverhead);

    const resepBaru: ResepHPP = {
      id: Date.now().toString(),
      namaProduk,
      targetPorsi: porsi,
      bahanList: selectedBahanList.map(i => {
        const b = i.bahanId === 'MANUAL' ? null : currentBahan.find(x => x.id === i.bahanId);
        const nama = i.bahanId === 'MANUAL' ? i.namaManual : (b?.nama || '');
        const harga = i.bahanId === 'MANUAL' ? safeNum(i.hargaBeli) : (b?.hargaBeli || 0);
        const isi = i.bahanId === 'MANUAL' ? Math.max(1, safeNum(i.isiKemasan)) : Math.max(1, b?.isiKemasan || 1);
        return { bahanId: i.bahanId, nama, jumlahPemakaian: safeNum(i.pemakaian), biayaSubtotal: (harga / isi) * safeNum(i.pemakaian) };
      }),
      operasionalList: selectedOverheadList.map(o => ({ id: o.id, nama: o.overheadId === 'MANUAL' ? o.namaManual : (currentOverhead.find(x => x.id === o.overheadId)?.nama || ''), nominal: safeNum(o.nominal) })),
      totalHppPerPorsi: hppPerPorsi,
      targetMarginPersen: targetMargin,
      hargaJualBEP,
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
    setSelectedOverheadList([]);

    syncToCloud({ bahanMaster: currentBahan, tenagaMaster, alatMaster: currentAlat, overheadMaster: currentOverhead, resepList: updatedResep });
  };

  const handleCopyStaffLink = () => {
    const staffUrl = `${window.location.origin}${window.location.pathname}?mode=staff`;
    navigator.clipboard.writeText(staffUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredResep = resepList.filter(r => r.namaProduk.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">MarginKu</h1>
          <p className="text-xs text-emerald-100">{isAdmin ? 'Kalkulator HPP & Margin (Admin)' : 'Katalog Resep (Akses Staff)'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <RefreshCw size={14} className="animate-spin text-emerald-200" />}
          <button onClick={() => setIsAdmin(!isAdmin)} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border ${isAdmin ? 'bg-emerald-800 border-emerald-600' : 'bg-amber-600 border-amber-500'}`}>
            {isAdmin ? <Unlock size={14}/> : <Lock size={14}/>}
            {isAdmin ? 'Mode Admin' : 'Mode Staff'}
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
            <h2 className="text-lg font-bold flex items-center gap-2"><Database size={20}/> Bank Master Data</h2>
            
            {isAdmin && (
              <div className="space-y-4">
                {/* Master Bahan */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-emerald-700">+ Master Bahan Baku</h3>
                  <input type="text" placeholder="Nama Bahan" value={newBahan.nama} onChange={e => setNewBahan({...newBahan, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Harga Beli (Rp)" value={newBahan.hargaBeli} onChange={e => setNewBahan({...newBahan, hargaBeli: e.target.value})} className="p-2 border text-sm rounded-lg" />
                    <input type="number" placeholder="Isi Kemasan" value={newBahan.isiKemasan} onChange={e => setNewBahan({...newBahan, isiKemasan: e.target.value})} className="p-2 border text-sm rounded-lg" />
                  </div>
                  <button onClick={handleAddBahan} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium">Simpan Bahan</button>
                </div>

                {/* Master Alat / Aset */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-emerald-700">+ Master Alat / Aset Produksi</h3>
                  <input type="text" placeholder="Nama Alat (cth: Gas Stove/Mixer)" value={newAlat.nama} onChange={e => setNewAlat({...newAlat, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Harga (Rp)" value={newAlat.hargaBeli} onChange={e => setNewAlat({...newAlat, hargaBeli: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Umur (Bln)" value={newAlat.umurBulan} onChange={e => setNewAlat({...newAlat, umurBulan: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Porsi/Hari" value={newAlat.targetPorsiHarian} onChange={e => setNewAlat({...newAlat, targetPorsiHarian: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddAlat} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium">Simpan Alat</button>
                </div>

                {/* Master Overhead */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-emerald-700">+ Master Biaya Overhead / Operasional</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Biaya (cth: Gas/Stiker)" value={newOverhead.nama} onChange={e => setNewOverhead({...newOverhead, nama: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Estimasi Rp/Resep" value={newOverhead.nominal} onChange={e => setNewOverhead({...newOverhead, nominal: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddOverhead} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium">Simpan Overhead</button>
                </div>
              </div>
            )}

            {/* List Master Data */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-semibold text-sm">Daftar Aset & Overhead Tersimpan</h3>
              <div className="divide-y max-h-60 overflow-y-auto text-xs space-y-2">
                <p className="font-bold text-slate-500 pt-2">1. Alat Produksi ({alatMaster.length})</p>
                {alatMaster.map(a => (
                  <div key={a.id} className="py-1 flex justify-between">
                    <span>{a.nama} ({formatRp(a.hargaBeli)})</span>
                    <span className="text-slate-500">{a.umurBulan} Bln</span>
                  </div>
                ))}
                <p className="font-bold text-slate-500 pt-2">2. Biaya Overhead ({overheadMaster.length})</p>
                {overheadMaster.map(o => (
                  <div key={o.id} className="py-1 flex justify-between">
                    <span>{o.nama}</span>
                    <span className="font-semibold text-emerald-700">{formatRp(o.nominal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KALKULATOR HPP */}
        {activeTab === 'kalkulator' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-md font-bold text-slate-800">1. Identitas Resep</h2>
              <input type="text" placeholder="Nama Produk (cth: Dimsum Ayam)" value={namaProduk} onChange={e => setNamaProduk(e.target.value)} className="w-full p-2.5 border text-sm rounded-lg" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 whitespace-nowrap">Target Hasil Porsi:</label>
                <input type="number" value={targetPorsi} onChange={e => setTargetPorsi(e.target.value)} className="w-full p-2 border text-sm rounded-lg font-bold" />
              </div>
            </div>

            {/* Bahan Baku */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">2. Biaya Bahan Baku</h3>
                <button onClick={() => setSelectedBahanList([...selectedBahanList, { id: Date.now().toString(), bahanId: '', namaManual: '', hargaBeli: '', isiKemasan: '1000', pemakaian: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>
              </div>
              {selectedBahanList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select value={item.bahanId} onChange={e => { const copy = [...selectedBahanList]; copy[index].bahanId = e.target.value; setSelectedBahanList(copy); }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih Bahan Master --</option>
                      {bahanMaster.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                      <option value="MANUAL">+ Input Manual (Simpan Baru)</option>
                    </select>
                    <button onClick={() => setSelectedBahanList(selectedBahanList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  {item.bahanId === 'MANUAL' && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <input type="text" placeholder="Nama" value={item.namaManual} onChange={e => { const copy = [...selectedBahanList]; copy[index].namaManual = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Harga" value={item.hargaBeli} onChange={e => { const copy = [...selectedBahanList]; copy[index].hargaBeli = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Isi Kemasan" value={item.isiKemasan} onChange={e => { const copy = [...selectedBahanList]; copy[index].isiKemasan = e.target.value; setSelectedBahanList(copy); }} className="p-1.5 border rounded bg-white" />
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border">
                    <span className="text-slate-500">Jumlah Pakai (gr/ml):</span>
                    <input type="number" placeholder="Pemakaian" value={item.pemakaian} onChange={e => { const copy = [...selectedBahanList]; copy[index].pemakaian = e.target.value; setSelectedBahanList(copy); }} className="w-28 p-1 border rounded text-right font-semibold" />
                  </div>
                </div>
              ))}
            </div>

            {/* Penyusutan Alat */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1"><Wrench size={16}/> 3. Penyusutan Alat / Aset</h3>
                <button onClick={() => setSelectedAlatList([...selectedAlatList, { id: Date.now().toString(), alatId: '', namaManual: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah Alat</button>
              </div>
              {selectedAlatList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select value={item.alatId} onChange={e => { const copy = [...selectedAlatList]; copy[index].alatId = e.target.value; setSelectedAlatList(copy); }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih Alat Master --</option>
                      {alatMaster.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                      <option value="MANUAL">+ Manual (Simpan Baru)</option>
                    </select>
                    <button onClick={() => setSelectedAlatList(selectedAlatList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  {item.alatId === 'MANUAL' && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <input type="text" placeholder="Nama Alat" value={item.namaManual} onChange={e => { const copy = [...selectedAlatList]; copy[index].namaManual = e.target.value; setSelectedAlatList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Harga Rp" value={item.hargaBeli} onChange={e => { const copy = [...selectedAlatList]; copy[index].hargaBeli = e.target.value; setSelectedAlatList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Umur Bln" value={item.umurBulan} onChange={e => { const copy = [...selectedAlatList]; copy[index].umurBulan = e.target.value; setSelectedAlatList(copy); }} className="p-1.5 border rounded bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Biaya Overhead / Operasional */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">4. Biaya Overhead / Operasional</h3>
                <button onClick={() => setSelectedOverheadList([...selectedOverheadList, { id: Date.now().toString(), overheadId: '', namaManual: '', nominal: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><Plus size={14}/> Tambah</button>
              </div>
              {selectedOverheadList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-2 text-xs">
                  <div className="flex gap-2 items-center">
                    <select value={item.overheadId} onChange={e => { const copy = [...selectedOverheadList]; copy[index].overheadId = e.target.value; setSelectedOverheadList(copy); }} className="w-full p-2 border rounded-lg bg-white">
                      <option value="">-- Pilih Overhead Master --</option>
                      {overheadMaster.map(o => <option key={o.id} value={o.id}>{o.nama} ({formatRp(o.nominal)})</option>)}
                      <option value="MANUAL">+ Input Manual (Simpan Baru)</option>
                    </select>
                    <button onClick={() => setSelectedOverheadList(selectedOverheadList.filter(x => x.id !== item.id))} className="text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  {item.overheadId === 'MANUAL' && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <input type="text" placeholder="Nama Operasional" value={item.namaManual} onChange={e => { const copy = [...selectedOverheadList]; copy[index].namaManual = e.target.value; setSelectedOverheadList(copy); }} className="p-1.5 border rounded bg-white" />
                      <input type="number" placeholder="Nominal Rp" value={item.nominal} onChange={e => { const copy = [...selectedOverheadList]; copy[index].nominal = e.target.value; setSelectedOverheadList(copy); }} className="p-1.5 border rounded bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* RINGKASAN & REKOMENDASI HARGA JUAL */}
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg space-y-4">
              <div className="border-b border-slate-700 pb-3 space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>HPP per Porsi:</span>
                  <span className="text-base font-bold text-emerald-400">{formatRp(hppPerPorsi)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Harga BEP (Titik Impas):</span>
                  <span className="font-semibold text-slate-200">{formatRp(hargaJualBEP)} / porsi</span>
                </div>
              </div>

              {/* Slider Profit Margin */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Target Margin keuntungan: <strong>{targetMargin}%</strong></span>
                  <span className="font-bold text-emerald-300">Target Jual (Dine-in): {formatRp(hargaJualTarget)}</span>
                </div>
                <input type="range" min="5" max="80" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-400" />
              </div>

              {/* REKOMENDASI HARGA OJEK ONLINE */}
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2 text-xs">
                <p className="font-bold text-amber-400 flex items-center gap-1"><Store size={14}/> Rekomendasi Harga Ojek Online (Merchant)</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-700">
                  <div>
                    <label className="text-slate-400">Komisi Ojol (%):</label>
                    <input type="number" value={goFoodFee} onChange={e => { setGoFoodFee(e.target.value); setGrabFoodFee(e.target.value); setShopeeFoodFee(e.target.value); }} className="w-full p-1 bg-slate-900 border border-slate-600 rounded text-white mt-0.5" />
                  </div>
                  <div>
                    <label className="text-slate-400">Biaya Tetap (Rp):</label>
                    <input type="number" value={fixedFeeOjol} onChange={e => setFixedFeeOjol(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-600 rounded text-white mt-0.5" />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Shopee Food / GoFood:</span>
                    <span className="font-bold text-amber-300">{formatRp(hargaGoFood)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Grab Food:</span>
                    <span className="font-bold text-amber-300">{formatRp(hargaGrabFood)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-1">*Harga di atas disesuaikan agar penghasilan bersih Anda tetap senilai {formatRp(hargaJualTarget)}.</p>
                </div>
              </div>

              <button onClick={handleSimpanResep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-2.5 rounded-lg shadow transition">Simpan Resep HPP</button>
            </div>
          </div>
        )}

        {/* TAB 3: KATALOG RESEP */}
        {activeTab === 'katalog' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Katalog Resep</h2>
              <span className="text-xs text-slate-500 font-medium">{filteredResep.length} Resep</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Cari resep..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm" />
            </div>

            {filteredResep.map((r) => (
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

                <div className="flex gap-2 pt-1">
                  <button onClick={() => window.print()} className="flex-1 text-xs border border-slate-300 py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium hover:bg-slate-50"><Printer size={14}/> Cetak PDF</button>
                  <button onClick={() => exportToCSV(`Resep-${r.namaProduk}`, r.bahanList)} className="flex-1 text-xs border border-emerald-300 text-emerald-800 bg-emerald-50 py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium hover:bg-emerald-100"><Download size={14}/> Download Excel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PENGATURAN */}
        {activeTab === 'pengaturan' && isAdmin && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Pengaturan</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-800"><Users size={16}/> Akses Mode Staff</h3>
              <button onClick={handleCopyStaffLink} className="w-full bg-slate-100 border text-slate-800 text-xs py-2.5 rounded-lg font-semibold flex justify-center items-center gap-2">
                {copiedLink ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
                {copiedLink ? 'Link Berhasil Disalin!' : 'Salin Link Akses Staff'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50">
        <button onClick={() => setActiveTab('katalog')} className={`flex flex-col items-center text-[10px] ${activeTab === 'katalog' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><BookOpen size={18}/> Katalog</button>
        <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center text-[10px] ${activeTab === 'master' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Database size={18}/> Master Data</button>
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('kalkulator')} className={`flex flex-col items-center text-[10px] ${activeTab === 'kalkulator' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Calculator size={18}/> Kalkulator</button>
            <button onClick={() => setActiveTab('pengaturan')} className={`flex flex-col items-center text-[10px] ${activeTab === 'pengaturan' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Settings size={18}/> Pengaturan</button>
          </>
        )}
      </nav>
    </div>
  );
}
