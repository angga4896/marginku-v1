import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  Database, Calculator, BookOpen, Settings, Trash2, 
  Printer, Download, Cloud, Lock, Unlock, Wrench, RefreshCw
} from 'lucide-react';
import { BahanBaku, TenagaKerja, AlatProduksi, ResepHPP } from './types';
import { safeNum, formatRp, exportToCSV } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<'master' | 'kalkulator' | 'katalog' | 'pengaturan'>('kalkulator');
  
  // Master Data State
  const [bahanMaster, setBahanMaster] = useState<BahanBaku[]>([]);
  const [tenagaMaster, setTenagaMaster] = useState<TenagaKerja[]>([]);
  const [alatMaster, setAlatMaster] = useState<AlatProduksi[]>([]);
  const [resepList, setResepList] = useState<ResepHPP[]>([]);

  // Master Data Inputs
  const [newBahan, setNewBahan] = useState({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' as const });
  const [newAlat, setNewAlat] = useState({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });

  // Kalkulator Form State
  const [namaProduk, setNamaProduk] = useState('');
  const [targetPorsi, setTargetPorsi] = useState<string>('10');
  const [selectedBahanList, setSelectedBahanList] = useState<{ id: string; bahanId: string; pemakaian: string }[]>([]);
  const [selectedAlatList, setSelectedAlatList] = useState<{ id: string; alatId: string }[]>([]);
  const [operasionalList, setOperasionalList] = useState<{ id: string; nama: string; nominal: string }[]>([]);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  // Settings & Sync State
  const [isAdmin, setIsAdmin] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Load Synchronous Local Storage
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

  // Save to LocalStorage
  useEffect(() => { localStorage.setItem('marginku_bahan', JSON.stringify(bahanMaster)); }, [bahanMaster]);
  useEffect(() => { localStorage.setItem('marginku_tenaga', JSON.stringify(tenagaMaster)); }, [tenagaMaster]);
  useEffect(() => { localStorage.setItem('marginku_alat', JSON.stringify(alatMaster)); }, [alatMaster]);
  useEffect(() => { localStorage.setItem('marginku_resep', JSON.stringify(resepList)); }, [resepList]);

  // 2. AUTO-FETCH DARI CLOUD SAAT APLIKASI PERTAMA DIBUKA
  useEffect(() => {
    const savedWebhook = localStorage.getItem('marginku_webhook');
    if (savedWebhook) {
      fetchFromCloud(savedWebhook);
    }
  }, []);

  const fetchFromCloud = async (url: string) => {
    if (!url) return;
    setIsSyncing(true);
    setSyncStatus('Mengambil data terbaru dari Cloud...');
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        const cloudData = json.data;
        if (cloudData.bahanMaster) setBahanMaster(cloudData.bahanMaster);
        if (cloudData.tenagaMaster) setTenagaMaster(cloudData.tenagaMaster);
        if (cloudData.alatMaster) setAlatMaster(cloudData.alatMaster);
        if (cloudData.resepList) setResepList(cloudData.resepList);
        setSyncStatus('Data tersinkronisasi otomatis dari Cloud!');
      } else {
        setSyncStatus('Cloud kosong atau format data tidak sesuai.');
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

  // Safe Math Calculations
  const porsi = Math.max(1, safeNum(targetPorsi));

  const totalBiayaBahan = selectedBahanList.reduce((acc, item) => {
    const bahan = bahanMaster.find((b) => b.id === item.bahanId);
    if (!bahan) return acc;
    const hargaPerSatuan = bahan.hargaBeli / Math.max(1, bahan.isiKemasan);
    return acc + (hargaPerSatuan * safeNum(item.pemakaian));
  }, 0);

  const totalBiayaAlat = selectedAlatList.reduce((acc, item) => {
    const alat = alatMaster.find((a) => a.id === item.alatId);
    if (!alat) return acc;
    const totalHari = Math.max(1, alat.umurBulan) * 30;
    const totalPorsiUmur = totalHari * Math.max(1, alat.targetPorsiHarian);
    const depresiasiPerPorsi = alat.hargaBeli / totalPorsiUmur;
    return acc + (depresiasiPerPorsi * porsi);
  }, 0);

  const totalBiayaOperasional = operasionalList.reduce((acc, item) => acc + safeNum(item.nominal), 0);

  const totalHppKeseluruhan = totalBiayaBahan + totalBiayaAlat + totalBiayaOperasional;
  const hppPerPorsi = totalHppKeseluruhan / porsi;
  const hargaJualTarget = hppPerPorsi / Math.max(0.01, (1 - (safeNum(targetMargin) / 100)));

  const handleSimpanResep = () => {
    if (!namaProduk) return alert('Masukkan Nama Produk!');
    const resepBaru: ResepHPP = {
      id: Date.now().toString(),
      namaProduk,
      targetPorsi: porsi,
      bahanList: selectedBahanList.map(i => {
        const b = bahanMaster.find(x => x.id === i.bahanId);
        return { bahanId: i.bahanId, nama: b?.nama || '', jumlahPemakaian: safeNum(i.pemakaian), biayaSubtotal: ((b?.hargaBeli || 0) / Math.max(1, b?.isiKemasan || 1)) * safeNum(i.pemakaian) };
      }),
      operasionalList: operasionalList.map(o => ({ id: o.id, nama: o.nama, nominal: safeNum(o.nominal) })),
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
    setSelectedAlatList([]);
    setOperasionalList([]);
    
    // Auto sync ke cloud saat resep disimpan
    syncToCloud({ bahanMaster, tenagaMaster, alatMaster, resepList: updatedResep });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">MarginKu</h1>
          <p className="text-xs text-emerald-100">Kalkulator HPP & Margin UMKM</p>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <RefreshCw size={14} className="animate-spin text-emerald-200" />}
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className="text-xs bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-full flex items-center gap-1 border border-emerald-600"
          >
            {isAdmin ? <Unlock size={14}/> : <Lock size={14}/>}
            {isAdmin ? 'Admin' : 'Viewer'}
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
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm text-emerald-700">+ Tambah Bahan Baku</h3>
              <input type="text" placeholder="Nama Bahan (cth: Terigu)" value={newBahan.nama} onChange={e => setNewBahan({...newBahan, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Harga Beli (Rp)" value={newBahan.hargaBeli} onChange={e => setNewBahan({...newBahan, hargaBeli: e.target.value})} className="p-2 border text-sm rounded-lg" />
                <input type="number" placeholder="Isi Kemasan" value={newBahan.isiKemasan} onChange={e => setNewBahan({...newBahan, isiKemasan: e.target.value})} className="p-2 border text-sm rounded-lg" />
              </div>
              <button onClick={handleAddBahan} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-emerald-700">Simpan Bahan</button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm text-emerald-700">+ Tambah Master Alat Produksi</h3>
              <input type="text" placeholder="Nama Alat (cth: Mixer)" value={newAlat.nama} onChange={e => setNewAlat({...newAlat, nama: e.target.value})} className="w-full p-2 border text-sm rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Harga (Rp)" value={newAlat.hargaBeli} onChange={e => setNewAlat({...newAlat, hargaBeli: e.target.value})} className="p-2 border text-xs rounded-lg" />
                <input type="number" placeholder="Umur (Bln)" value={newAlat.umurBulan} onChange={e => setNewAlat({...newAlat, umurBulan: e.target.value})} className="p-2 border text-xs rounded-lg" />
                <input type="number" placeholder="Porsi/Hari" value={newAlat.targetPorsiHarian} onChange={e => setNewAlat({...newAlat, targetPorsiHarian: e.target.value})} className="p-2 border text-xs rounded-lg" />
              </div>
              <button onClick={handleAddAlat} className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-emerald-700">Simpan Alat</button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-sm mb-2">Master Bahan ({bahanMaster.length})</h3>
              <div className="divide-y max-h-36 overflow-y-auto">
                {bahanMaster.map((b) => (
                  <div key={b.id} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold">{b.nama}</p>
                      <p className="text-slate-500">{formatRp(b.hargaBeli)} / {b.isiKemasan} {b.satuan}</p>
                    </div>
                    <button onClick={() => {
                      const updated = bahanMaster.filter(x => x.id !== b.id);
                      setBahanMaster(updated);
                      syncToCloud({ bahanMaster: updated, tenagaMaster, alatMaster, resepList });
                    }} className="text-red-500 p-1"><Trash2 size={14}/></button>
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
              <input type="text" placeholder="Nama Produk (cth: Dimsum Ayam)" value={namaProduk} onChange={e => setNamaProduk(e.target.value)} className="w-full p-2.5 border text-sm rounded-lg" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 whitespace-nowrap">Target Hasil Porsi:</label>
                <input type="number" value={targetPorsi} onChange={e => setTargetPorsi(e.target.value)} className="w-full p-2 border text-sm rounded-lg" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">2. Bahan Baku</h3>
                <button onClick={() => setSelectedBahanList([...selectedBahanList, { id: Date.now().toString(), bahanId: '', pemakaian: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">+ Tambah Bahan</button>
              </div>
              {selectedBahanList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center text-xs">
                  <select value={item.bahanId} onChange={e => {
                    const copy = [...selectedBahanList];
                    copy[index].bahanId = e.target.value;
                    setSelectedBahanList(copy);
                  }} className="w-full p-2 border rounded-lg">
                    <option value="">-- Pilih Bahan --</option>
                    {bahanMaster.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                  </select>
                  <input type="number" placeholder="Jumlah" value={item.pemakaian} onChange={e => {
                    const copy = [...selectedBahanList];
                    copy[index].pemakaian = e.target.value;
                    setSelectedBahanList(copy);
                  }} className="w-24 p-2 border rounded-lg" />
                  <button onClick={() => setSelectedBahanList(selectedBahanList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1"><Wrench size={16}/> 3. Penyusutan Alat</h3>
                <button onClick={() => setSelectedAlatList([...selectedAlatList, { id: Date.now().toString(), alatId: '' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">+ Tambah Alat</button>
              </div>
              {selectedAlatList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center text-xs">
                  <select value={item.alatId} onChange={e => {
                    const copy = [...selectedAlatList];
                    copy[index].alatId = e.target.value;
                    setSelectedAlatList(copy);
                  }} className="w-full p-2 border rounded-lg">
                    <option value="">-- Pilih Alat Master --</option>
                    {alatMaster.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                  </select>
                  <button onClick={() => setSelectedAlatList(selectedAlatList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-800">4. Operasional / Stiker</h3>
                <button onClick={() => setOperasionalList([...operasionalList, { id: Date.now().toString(), nama: '', nominal: '0' }])} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">+ Biaya Lain</button>
              </div>
              {operasionalList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center text-xs">
                  <input type="text" placeholder="Nama Biaya" value={item.nama} onChange={e => {
                    const copy = [...operasionalList];
                    copy[index].nama = e.target.value;
                    setOperasionalList(copy);
                  }} className="w-full p-2 border rounded-lg" />
                  <input type="number" placeholder="Rp" value={item.nominal} onChange={e => {
                    const copy = [...operasionalList];
                    copy[index].nominal = e.target.value;
                    setOperasionalList(copy);
                  }} className="w-24 p-2 border rounded-lg" />
                  <button onClick={() => setOperasionalList(operasionalList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-md space-y-3">
              <div className="flex justify-between items-center text-xs text-emerald-200">
                <span>HPP per Porsi:</span>
                <span className="text-lg font-bold text-white">{formatRp(hppPerPorsi)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Target Margin: {targetMargin}%</span>
                  <span className="font-semibold text-emerald-300">Harga Jual Target: {formatRp(hargaJualTarget)}</span>
                </div>
                <input type="range" min="5" max="80" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-400" />
              </div>
              <button onClick={handleSimpanResep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-2.5 rounded-lg shadow">Simpan Resep HPP</button>
            </div>
          </div>
        )}

        {/* TAB 3: KATALOG */}
        {activeTab === 'katalog' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Katalog Resep</h2>
            {resepList.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{r.namaProduk}</h3>
                    <p className="text-xs text-slate-500">{r.targetPorsi} Porsi • Dibuat: {r.tanggalDibuat}</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">{formatRp(r.hargaJualTarget)}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => window.print()} className="flex-1 text-xs border py-1.5 rounded-lg flex justify-center items-center gap-1"><Printer size={14}/> Cetak PDF</button>
                  <button onClick={() => exportToCSV(`Resep-${r.namaProduk}`, r.bahanList)} className="flex-1 text-xs border py-1.5 rounded-lg flex justify-center items-center gap-1"><Download size={14}/> CSV Excel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PENGATURAN */}
        {activeTab === 'pengaturan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Pengaturan & Cloud</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Cloud size={16}/> Integrasi Google Drive</h3>
              <input type="text" placeholder="Google Webhook App URL" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full p-2 border text-xs rounded-lg" />
              <div className="flex gap-2">
                <button onClick={() => fetchFromCloud(webhookUrl)} className="flex-1 bg-emerald-700 text-white text-xs py-2 rounded-lg font-medium">Tarik Data Cloud</button>
                <button onClick={() => syncToCloud()} className="flex-1 bg-slate-800 text-white text-xs py-2 rounded-lg font-medium">Kirim Data Cloud</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50">
        <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center text-[10px] ${activeTab === 'master' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Database size={18}/> Master</button>
        <button onClick={() => setActiveTab('kalkulator')} className={`flex flex-col items-center text-[10px] ${activeTab === 'kalkulator' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Calculator size={18}/> Kalkulator</button>
        <button onClick={() => setActiveTab('katalog')} className={`flex flex-col items-center text-[10px] ${activeTab === 'katalog' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><BookOpen size={18}/> Katalog</button>
        <button onClick={() => setActiveTab('pengaturan')} className={`flex flex-col items-center text-[10px] ${activeTab === 'pengaturan' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Settings size={18}/> Pengaturan</button>
      </nav>
    </div>
  );
}
