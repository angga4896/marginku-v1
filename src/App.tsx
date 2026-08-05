import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  Database, Calculator, BookOpen, Settings, Trash2, 
  Printer, Download, Cloud, Lock, Unlock, Wrench, RefreshCw, Plus, Users, Copy, Check, Search, Store, UserCheck
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

  // Platform Fee Ojol
  const [goFoodFee, setGoFoodFee] = useState<string>('20');
  const [fixedFeeOjol, setFixedFeeOjol] = useState<string>('1000');

  // Cloud Sync Settings
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

  // Save LocalStorage
  useEffect(() => { localStorage.setItem('marginku_bahan', JSON.stringify(bahanMaster)); }, [bahanMaster]);
  useEffect(() => { localStorage.setItem('marginku_tenaga', JSON.stringify(tenagaMaster)); }, [tenagaMaster]);
  useEffect(() => { localStorage.setItem('marginku_alat', JSON.stringify(alatMaster)); }, [alatMaster]);
  useEffect(() => { localStorage.setItem('marginku_overhead', JSON.stringify(overheadMaster)); }, [overheadMaster]);
  useEffect(() => { localStorage.setItem('marginku_resep', JSON.stringify(resepList)); }, [resepList]);

  // Cloud Pull & Push Functions
  const fetchFromCloud = async (url: string) => {
    if (!url) return alert('Masukkan URL Google Apps Script di Pengaturan!');
    setIsSyncing(true);
    setSyncStatus('Mengambil data dari Cloud...');
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        const cloudData = json.data;
        if (cloudData.Bahan_Baku) setBahanMaster(cloudData.Bahan_Baku);
        if (cloudData.Tenaga_Kerja) setTenagaMaster(cloudData.Tenaga_Kerja);
        if (cloudData.Aset_Alat) setAlatMaster(cloudData.Aset_Alat);
        if (cloudData.Overhead) setOverheadMaster(cloudData.Overhead);
        if (cloudData.Resep) setResepList(cloudData.Resep);
        setSyncStatus('Data tersinkronisasi dari Cloud!');
      }
    } catch (e) {
      setSyncStatus('Mode Offline / Menggunakan Data Lokal.');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async (overrideData?: any) => {
    if (!webhookUrl) return alert('Masukkan URL Webhook Google Apps Script di Pengaturan!');
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

  // Handlers Master Adders
  const handleAddBahan = () => {
    if (!newBahan.nama || !newBahan.hargaBeli || !newBahan.isiKemasan) return;
    const updated = [...bahanMaster, { id: Date.now().toString(), nama: newBahan.nama, hargaBeli: safeNum(newBahan.hargaBeli), isiKemasan: Math.max(1, safeNum(newBahan.isiKemasan)), satuan: newBahan.satuan }];
    setBahanMaster(updated);
    setNewBahan({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' });
  };

  const handleAddTenaga = () => {
    if (!newTenaga.nama || !newTenaga.nominal) return;
    const updated = [...tenagaMaster, { id: Date.now().toString(), nama: newTenaga.nama, tipe: newTenaga.tipe, nominal: safeNum(newTenaga.nominal), jamKerjaHarian: safeNum(newTenaga.jamKerjaHarian || '8') }];
    setTenagaMaster(updated);
    setNewTenaga({ nama: '', tipe: 'gaji_harian', nominal: '', jamKerjaHarian: '8' });
  };

  const handleAddAlat = () => {
    if (!newAlat.nama || !newAlat.hargaBeli) return;
    const updated = [...alatMaster, { id: Date.now().toString(), nama: newAlat.nama, hargaBeli: safeNum(newAlat.hargaBeli), umurBulan: Math.max(1, safeNum(newAlat.umurBulan)), targetPorsiHarian: Math.max(1, safeNum(newAlat.targetPorsiHarian)) }];
    setAlatMaster(updated);
    setNewAlat({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
  };

  const handleAddOverhead = () => {
    if (!newOverhead.nama || !newOverhead.nominal) return;
    const updated = [...overheadMaster, { id: Date.now().toString(), nama: newOverhead.nama, nominal: safeNum(newOverhead.nominal) }];
    setOverheadMaster(updated);
    setNewOverhead({ nama: '', nominal: '' });
  };

  // Kalkulasi HPP & BEP Realtime
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
    if (item.tenagaId === 'MANUAL') {
      const tarifPerMenit = (safeNum(item.durasiAtauNominal) / 8) / 60;
      return acc + (tarifPerMenit * safeNum(item.durasiAtauNominal));
    }
    const tenaga = tenagaMaster.find(t => t.id === item.tenagaId);
    if (!tenaga) return acc;
    const tarifPerMenit = (tenaga.nominal / Math.max(1, tenaga.jamKerjaHarian)) / 60;
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
  const hargaJualTarget = hppPerPorsi / Math.max(0.01, (1 - (safeNum(targetMargin) / 100)));

  const calcOnlinePrice = (feePercentStr: string) => {
    const feePct = safeNum(feePercentStr) / 100;
    const extraFixed = safeNum(fixedFeeOjol);
    return (hargaJualTarget + extraFixed) / Math.max(0.01, (1 - feePct));
  };

  const handleSimpanResep = async () => {
    if (!isAdmin) return alert('Mode Staff hanya dapat membaca data!');
    if (!namaProduk) return alert('Masukkan Nama Produk!');

    const resepBaru: ResepHPP = {
      id: Date.now().toString(),
      namaProduk,
      targetPorsi: porsi,
      bahanList: selectedBahanList.map(i => {
        const b = i.bahanId === 'MANUAL' ? null : bahanMaster.find(x => x.id === i.bahanId);
        const nama = i.bahanId === 'MANUAL' ? i.namaManual : (b?.nama || '');
        const harga = i.bahanId === 'MANUAL' ? safeNum(i.hargaBeli) : (b?.hargaBeli || 0);
        const isi = i.bahanId === 'MANUAL' ? Math.max(1, safeNum(i.isiKemasan)) : Math.max(1, b?.isiKemasan || 1);
        return { bahanId: i.bahanId, nama, jumlahPemakaian: safeNum(i.pemakaian), biayaSubtotal: (harga / isi) * safeNum(i.pemakaian) };
      }),
      operasionalList: selectedOverheadList.map(o => ({ id: o.id, nama: o.overheadId === 'MANUAL' ? o.namaManual : (overheadMaster.find(x => x.id === o.overheadId)?.nama || ''), nominal: safeNum(o.nominal) })),
      totalHppPerPorsi: hppPerPorsi,
      targetMarginPersen: targetMargin,
      hargaJualBEP: hppPerPorsi,
      hargaJualTarget,
      tanggalDibuat: new Date().toLocaleDateString('id-ID'),
    };

    setResepList([...resepList, resepBaru]);
    alert('Resep HPP Berhasil Disimpan!');
    setNamaProduk('');
    setSelectedBahanList([]);
    setSelectedTenagaList([]);
    setSelectedAlatList([]);
    setSelectedOverheadList([]);
  };

  const filteredResep = resepList.filter(r => r.namaProduk.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">MarginKu</h1>
          <p className="text-xs text-emerald-100">{isAdmin ? 'Kalkulator HPP & Margin (Admin)' : 'Katalog Resep (Staff)'}</p>
        </div>
        <button onClick={() => setIsAdmin(!isAdmin)} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border ${isAdmin ? 'bg-emerald-800 border-emerald-600' : 'bg-amber-600 border-amber-500'}`}>
          {isAdmin ? 'Mode Admin' : 'Mode Staff'}
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {syncStatus && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg text-center font-medium">
            {syncStatus}
          </div>
        )}

        {/* TAB 1: MASTER DATA */}
        {activeTab === 'master' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Database size={20}/> Bank Master Data</h2>
            
            {isAdmin && (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Bahan Baku</h3>
                  <input type="text" placeholder="Nama Bahan" value={newBahan.nama} onChange={e => setNewBahan({...newBahan, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Harga Beli (Rp)" value={newBahan.hargaBeli} onChange={e => setNewBahan({...newBahan, hargaBeli: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Isi Kemasan" value={newBahan.isiKemasan} onChange={e => setNewBahan({...newBahan, isiKemasan: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddBahan} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg font-medium">Simpan Bahan</button>
                </div>

                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Tenaga Kerja</h3>
                  <input type="text" placeholder="Nama / Posisi Pekerja" value={newTenaga.nama} onChange={e => setNewTenaga({...newTenaga, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Gaji Harian (Rp)" value={newTenaga.nominal} onChange={e => setNewTenaga({...newTenaga, nominal: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Jam Kerja/Hari" value={newTenaga.jamKerjaHarian} onChange={e => setNewTenaga({...newTenaga, jamKerjaHarian: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddTenaga} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg font-medium">Simpan Pekerja</button>
                </div>

                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Alat Produksi</h3>
                  <input type="text" placeholder="Nama Alat" value={newAlat.nama} onChange={e => setNewAlat({...newAlat, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="number" placeholder="Harga Rp" value={newAlat.hargaBeli} onChange={e => setNewAlat({...newAlat, hargaBeli: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                    <input type="number" placeholder="Umur Bln" value={newAlat.umurBulan} onChange={e => setNewAlat({...newAlat, umurBulan: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                    <input type="number" placeholder="Porsi/Hari" value={newAlat.targetPorsiHarian} onChange={e => setNewAlat({...newAlat, targetPorsiHarian: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                  </div>
                  <button onClick={handleAddAlat} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg font-medium">Simpan Alat</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KALKULATOR HPP */}
        {activeTab === 'kalkulator' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border space-y-3">
              <h2 className="text-md font-bold text-slate-800">1. Resep Produk</h2>
              <input type="text" placeholder="Nama Produk (cth: Dimsum Ayam)" value={namaProduk} onChange={e => setNamaProduk(e.target.value)} className="w-full p-2 border text-sm rounded-lg" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 whitespace-nowrap">Target Hasil Porsi:</label>
                <input type="number" value={targetPorsi} onChange={e => setTargetPorsi(e.target.value)} className="w-full p-2 border text-sm rounded-lg font-bold" />
              </div>
            </div>

            {/* Section 2: Bahan Baku */}
            <div className="bg-white p-4 rounded-xl border space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-xs text-slate-800">2. Biaya Bahan Baku</h3>
                <button onClick={() => setSelectedBahanList([...selectedBahanList, { id: Date.now().toString(), bahanId: '', namaManual: '', hargaBeli: '', isiKemasan: '1000', pemakaian: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border">+ Bahan</button>
              </div>
              {selectedBahanList.map((item, index) => (
                <div key={item.id} className="p-2 border rounded-lg bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex gap-2 items-center">
                    <select value={item.bahanId} onChange={e => { const copy = [...selectedBahanList]; copy[index].bahanId = e.target.value; setSelectedBahanList(copy); }} className="w-full p-1.5 border rounded bg-white">
                      <option value="">-- Pilih Bahan Master --</option>
                      {bahanMaster.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                      <option value="MANUAL">+ Manual</option>
                    </select>
                    <button onClick={() => setSelectedBahanList(selectedBahanList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1 rounded border">
                    <span className="text-slate-500 text-[11px]">Jumlah Pakai (gr/ml):</span>
                    <input type="number" placeholder="0" value={item.pemakaian} onChange={e => { const copy = [...selectedBahanList]; copy[index].pemakaian = e.target.value; setSelectedBahanList(copy); }} className="w-24 p-1 border rounded text-right font-semibold" />
                  </div>
                </div>
              ))}
            </div>

            {/* RINGKASAN HPP */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span>HPP per Porsi:</span>
                <span className="text-base font-bold text-emerald-400">{formatRp(hppPerPorsi)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Margin Profit: {targetMargin}%</span>
                  <span className="font-bold text-emerald-300">Target Jual: {formatRp(hargaJualTarget)}</span>
                </div>
                <input type="range" min="5" max="80" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-400" />
              </div>
              <button onClick={handleSimpanResep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs py-2.5 rounded-lg shadow">Simpan Resep HPP</button>
            </div>
          </div>
        )}

        {/* TAB 3: KATALOG RESEP (DOWNLOAD EXCEL & PDF) */}
        {activeTab === 'katalog' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Katalog Resep</h2>
              <span className="text-xs text-slate-500 font-medium">{filteredResep.length} Resep</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Cari resep..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm" />
            </div>

            {filteredResep.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-xl border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{r.namaProduk}</h3>
                    <p className="text-xs text-slate-500">{r.targetPorsi} Porsi • Dibuat: {r.tanggalDibuat}</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">{formatRp(r.hargaJualTarget)}</span>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => window.print()} className="flex-1 text-xs border py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium"><Printer size={14}/> Cetak PDF</button>
                  <button onClick={() => exportToCSV(`Resep-${r.namaProduk}`, r.bahanList)} className="flex-1 text-xs border border-emerald-300 text-emerald-800 bg-emerald-50 py-1.5 rounded-lg flex justify-center items-center gap-1.5 font-medium"><Download size={14}/> Download Excel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PENGATURAN & GOOGLE CLOUD SYNC */}
        {activeTab === 'pengaturan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Pengaturan Cloud</h2>
            <div className="bg-white p-4 rounded-xl border space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Cloud size={16}/> Integrasi Google Sheet Apps Script</h3>
              <input type="text" placeholder="Google Webhook App URL (/exec)" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full p-2 border text-xs rounded-lg" />
              <div className="flex gap-2">
                <button onClick={() => fetchFromCloud(webhookUrl)} className="flex-1 bg-emerald-700 text-white text-xs py-2 rounded-lg font-medium">Tarik Data Cloud</button>
                <button onClick={() => syncToCloud()} className="flex-1 bg-slate-800 text-white text-xs py-2 rounded-lg font-medium">Kirim Data Cloud</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigasi Bawah */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-50">
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
