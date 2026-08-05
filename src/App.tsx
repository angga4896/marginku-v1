import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  Database, Calculator, BookOpen, Settings, Trash2, 
  Printer, Download, Cloud, Search
} from 'lucide-react';
import { BahanBaku, TenagaKerja, AlatProduksi, ResepHPP } from './types';
import { safeNum, formatRp, exportToCSV } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<'master' | 'kalkulator' | 'katalog' | 'pengaturan'>('kalkulator');
  const [isAdmin, setIsAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'staff') {
      setIsAdmin(false);
      setActiveTab('katalog');
    }
  }, []);

  // ================= STATE MASTER DATA =================
  const [bahanMaster, setBahanMaster] = useState<BahanBaku[]>([]);
  const [tenagaMaster, setTenagaMaster] = useState<TenagaKerja[]>([]);
  const [alatMaster, setAlatMaster] = useState<AlatProduksi[]>([]);
  const [overheadMaster, setOverheadMaster] = useState<{ id: string; nama: string; nominal: number }[]>([]);
  const [resepList, setResepList] = useState<ResepHPP[]>([]);

  // ================= STATE INPUT MASTER =================
  const [newBahan, setNewBahan] = useState({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' as const });
  const [newTenaga, setNewTenaga] = useState({ nama: '', tipe: 'gaji_harian' as const, nominal: '', jamKerjaHarian: '8' });
  const [newAlat, setNewAlat] = useState({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
  const [newOverhead, setNewOverhead] = useState({ nama: '', nominal: '' });

  // ================= STATE KALKULATOR HPP =================
  const [namaProduk, setNamaProduk] = useState('');
  const [targetPorsi, setTargetPorsi] = useState<string>('10');
  
  // List Item Terpilih di Kalkulator
  const [selectedBahanList, setSelectedBahanList] = useState<{ id: string; bahanId: string; pemakaian: string }[]>([]);
  const [selectedTenagaList, setSelectedTenagaList] = useState<{ id: string; tenagaId: string; durasiMenit: string }[]>([]);
  const [selectedAlatList, setSelectedAlatList] = useState<{ id: string; alatId: string; }[]>([]);
  const [selectedOverheadList, setSelectedOverheadList] = useState<{ id: string; overheadId: string; }[]>([]);
  
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // ================= LOCAL STORAGE SYNC =================
  useLayoutEffect(() => {
    try {
      if (localStorage.getItem('marginku_bahan')) setBahanMaster(JSON.parse(localStorage.getItem('marginku_bahan')!));
      if (localStorage.getItem('marginku_tenaga')) setTenagaMaster(JSON.parse(localStorage.getItem('marginku_tenaga')!));
      if (localStorage.getItem('marginku_alat')) setAlatMaster(JSON.parse(localStorage.getItem('marginku_alat')!));
      if (localStorage.getItem('marginku_overhead')) setOverheadMaster(JSON.parse(localStorage.getItem('marginku_overhead')!));
      if (localStorage.getItem('marginku_resep')) setResepList(JSON.parse(localStorage.getItem('marginku_resep')!));
      if (localStorage.getItem('marginku_webhook')) setWebhookUrl(localStorage.getItem('marginku_webhook')!);
    } catch (e) {
      console.error('Error load LocalStorage', e);
    }
  }, []);

  useEffect(() => { localStorage.setItem('marginku_bahan', JSON.stringify(bahanMaster)); }, [bahanMaster]);
  useEffect(() => { localStorage.setItem('marginku_tenaga', JSON.stringify(tenagaMaster)); }, [tenagaMaster]);
  useEffect(() => { localStorage.setItem('marginku_alat', JSON.stringify(alatMaster)); }, [alatMaster]);
  useEffect(() => { localStorage.setItem('marginku_overhead', JSON.stringify(overheadMaster)); }, [overheadMaster]);
  useEffect(() => { localStorage.setItem('marginku_resep', JSON.stringify(resepList)); }, [resepList]);

  // ================= FUNGSI CLOUD SYNC =================
  const fetchFromCloud = async () => {
    if (!webhookUrl) return alert('Masukkan URL Webhook Google Sheet di Pengaturan!');
    setSyncStatus('Mengambil data dari Cloud...');
    try {
      const res = await fetch(webhookUrl);
      const json = await res.json();
      if (json && json.status === 'success') {
        const cloudData = json.data;
        if (cloudData.Bahan_Baku) setBahanMaster(cloudData.Bahan_Baku);
        if (cloudData.Tenaga_Kerja) setTenagaMaster(cloudData.Tenaga_Kerja);
        if (cloudData.Aset_Alat) setAlatMaster(cloudData.Aset_Alat);
        if (cloudData.Overhead) setOverheadMaster(cloudData.Overhead);
        if (cloudData.Resep) setResepList(cloudData.Resep);
        setSyncStatus('Data tersinkronisasi dari Cloud!');
      }
    } catch (e) {
      setSyncStatus('Gagal koneksi ke Cloud.');
    }
  };

  const syncToCloud = async () => {
    if (!webhookUrl) return alert('Masukkan URL Webhook Google Sheet!');
    setSyncStatus('Mengirim pembaruan ke Cloud...');
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'MARGINKU_BACKUP', payload: { bahanMaster, tenagaMaster, alatMaster, overheadMaster, resepList } }),
      });
      localStorage.setItem('marginku_webhook', webhookUrl);
      setSyncStatus('Pembaruan tersimpan di Cloud!');
    } catch (e) {
      setSyncStatus('Gagal update ke Cloud.');
    }
  };

  // ================= PERHITUNGAN HPP REALTIME =================
  const porsi = Math.max(1, safeNum(targetPorsi));

  const totalBiayaBahan = selectedBahanList.reduce((acc, item) => {
    const bahan = bahanMaster.find((b) => b.id === item.bahanId);
    if (!bahan) return acc;
    return acc + ((bahan.hargaBeli / Math.max(1, bahan.isiKemasan)) * safeNum(item.pemakaian));
  }, 0);

  const totalBiayaTenaga = selectedTenagaList.reduce((acc, item) => {
    const tenaga = tenagaMaster.find(t => t.id === item.tenagaId);
    if (!tenaga) return acc;
    if (tenaga.tipe === 'borongan') return acc + tenaga.nominal;
    const tarifPerMenit = (tenaga.nominal / Math.max(1, tenaga.jamKerjaHarian)) / 60;
    return acc + (tarifPerMenit * safeNum(item.durasiMenit));
  }, 0);

  const totalBiayaAlat = selectedAlatList.reduce((acc, item) => {
    const alat = alatMaster.find((a) => a.id === item.alatId);
    if (!alat) return acc;
    const totalHari = Math.max(1, alat.umurBulan) * 30;
    const totalPorsiUmur = totalHari * Math.max(1, alat.targetPorsiHarian);
    return acc + ((alat.hargaBeli / Math.max(1, totalPorsiUmur)) * porsi);
  }, 0);

  const totalBiayaOverhead = selectedOverheadList.reduce((acc, item) => {
    const ov = overheadMaster.find((o) => o.id === item.overheadId);
    return acc + (ov ? ov.nominal : 0);
  }, 0);

  const totalHppKeseluruhan = totalBiayaBahan + totalBiayaTenaga + totalBiayaAlat + totalBiayaOverhead;
  const hppPerPorsi = totalHppKeseluruhan / porsi;
  const hargaJualTarget = hppPerPorsi / Math.max(0.01, (1 - (safeNum(targetMargin) / 100)));

  // ================= FUNGSI SIMPAN RESEP =================
  const handleSimpanResep = () => {
    if (!isAdmin) return alert('Mode Staff hanya dapat membaca data!');
    if (!namaProduk) return alert('Masukkan Nama Produk!');

    const resepBaru: ResepHPP = {
      id: Date.now().toString(),
      namaProduk,
      targetPorsi: porsi,
      bahanList: selectedBahanList.map(i => {
        const b = bahanMaster.find(x => x.id === i.bahanId);
        return { bahanId: i.bahanId, nama: b?.nama || '', jumlahPemakaian: safeNum(i.pemakaian), biayaSubtotal: ((b?.hargaBeli || 0) / (b?.isiKemasan || 1)) * safeNum(i.pemakaian) };
      }),
      operasionalList: selectedOverheadList.map(o => ({ id: o.id, nama: overheadMaster.find(x => x.id === o.overheadId)?.nama || '', nominal: overheadMaster.find(x => x.id === o.overheadId)?.nominal || 0 })),
      totalHppPerPorsi: hppPerPorsi,
      targetMarginPersen: targetMargin,
      hargaJualBEP: hppPerPorsi,
      hargaJualTarget,
      tanggalDibuat: new Date().toLocaleDateString('id-ID'),
    };

    setResepList([...resepList, resepBaru]);
    alert('Resep HPP Berhasil Disimpan di Katalog!');
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
          <p className="text-xs text-emerald-100">{isAdmin ? 'Kalkulator HPP (Admin)' : 'Katalog Resep (Staff)'}</p>
        </div>
        <button onClick={() => setIsAdmin(!isAdmin)} className={`text-xs px-3 py-1.5 rounded-full border ${isAdmin ? 'bg-emerald-800 border-emerald-600' : 'bg-amber-600 border-amber-500'}`}>
          {isAdmin ? 'Mode Admin' : 'Mode Staff'}
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {syncStatus && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg text-center font-medium">
            {syncStatus}
          </div>
        )}

        {/* ================= TAB MASTER DATA ================= */}
        {activeTab === 'master' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Database size={20}/> Input Master Data</h2>
            
            {isAdmin && (
              <div className="space-y-4">
                {/* Master Bahan */}
                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Bahan Baku</h3>
                  <input type="text" placeholder="Nama Bahan" value={newBahan.nama} onChange={e => setNewBahan({...newBahan, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Harga Beli (Rp)" value={newBahan.hargaBeli} onChange={e => setNewBahan({...newBahan, hargaBeli: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Isi Kemasan (gram/ml)" value={newBahan.isiKemasan} onChange={e => setNewBahan({...newBahan, isiKemasan: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={() => { 
                    if(newBahan.nama) setBahanMaster([...bahanMaster, { id: Date.now().toString(), nama: newBahan.nama, hargaBeli: safeNum(newBahan.hargaBeli), isiKemasan: Math.max(1, safeNum(newBahan.isiKemasan)), satuan: newBahan.satuan }]); 
                    setNewBahan({ nama: '', hargaBeli: '', isiKemasan: '', satuan: 'gram' }); 
                  }} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg">Simpan Bahan</button>
                </div>

                {/* Master Tenaga Kerja */}
                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Tenaga Kerja</h3>
                  <input type="text" placeholder="Nama / Posisi Pekerja" value={newTenaga.nama} onChange={e => setNewTenaga({...newTenaga, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Gaji/Tarif (Rp)" value={newTenaga.nominal} onChange={e => setNewTenaga({...newTenaga, nominal: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Jam Kerja/Hari" value={newTenaga.jamKerjaHarian} onChange={e => setNewTenaga({...newTenaga, jamKerjaHarian: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={() => {
                    if(newTenaga.nama) setTenagaMaster([...tenagaMaster, { id: Date.now().toString(), nama: newTenaga.nama, tipe: newTenaga.tipe, nominal: safeNum(newTenaga.nominal), jamKerjaHarian: safeNum(newTenaga.jamKerjaHarian) }]);
                    setNewTenaga({ nama: '', tipe: 'gaji_harian', nominal: '', jamKerjaHarian: '8' });
                  }} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg">Simpan Tenaga Kerja</button>
                </div>

                {/* Master Alat */}
                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Alat Produksi</h3>
                  <input type="text" placeholder="Nama Alat" value={newAlat.nama} onChange={e => setNewAlat({...newAlat, nama: e.target.value})} className="w-full p-2 border text-xs rounded-lg" />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="number" placeholder="Harga Rp" value={newAlat.hargaBeli} onChange={e => setNewAlat({...newAlat, hargaBeli: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                    <input type="number" placeholder="Umur Bln" value={newAlat.umurBulan} onChange={e => setNewAlat({...newAlat, umurBulan: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                    <input type="number" placeholder="Porsi/Hari" value={newAlat.targetPorsiHarian} onChange={e => setNewAlat({...newAlat, targetPorsiHarian: e.target.value})} className="p-1.5 border text-xs rounded-lg" />
                  </div>
                  <button onClick={() => {
                    if(newAlat.nama) setAlatMaster([...alatMaster, { id: Date.now().toString(), nama: newAlat.nama, hargaBeli: safeNum(newAlat.hargaBeli), umurBulan: Math.max(1, safeNum(newAlat.umurBulan)), targetPorsiHarian: Math.max(1, safeNum(newAlat.targetPorsiHarian)) }]);
                    setNewAlat({ nama: '', hargaBeli: '', umurBulan: '12', targetPorsiHarian: '50' });
                  }} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg">Simpan Alat</button>
                </div>

                {/* Master Overhead */}
                <div className="bg-white p-4 rounded-xl border space-y-2">
                  <h3 className="font-semibold text-xs text-emerald-700">+ Master Overhead (Listrik/Air dll)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Pengeluaran" value={newOverhead.nama} onChange={e => setNewOverhead({...newOverhead, nama: e.target.value})} className="p-2 border text-xs rounded-lg" />
                    <input type="number" placeholder="Nominal (Rp)" value={newOverhead.nominal} onChange={e => setNewOverhead({...newOverhead, nominal: e.target.value})} className="p-2 border text-xs rounded-lg" />
                  </div>
                  <button onClick={() => {
                    if(newOverhead.nama) setOverheadMaster([...overheadMaster, { id: Date.now().toString(), nama: newOverhead.nama, nominal: safeNum(newOverhead.nominal) }]);
                    setNewOverhead({ nama: '', nominal: '' });
                  }} className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg">Simpan Overhead</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB KALKULATOR HPP ================= */}
        {activeTab === 'kalkulator' && isAdmin && (
          <div className="space-y-4">
            
            {/* Bagian 1: Produk & Porsi */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <h2 className="text-md font-bold text-slate-800">1. Resep Produk</h2>
              <input type="text" placeholder="Nama Produk (cth: Dimsum Ayam)" value={namaProduk} onChange={e => setNamaProduk(e.target.value)} className="w-full p-2 border text-sm rounded-lg bg-slate-50" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 font-medium whitespace-nowrap">Target Hasil Porsi:</label>
                <input type="number" value={targetPorsi} onChange={e => setTargetPorsi(e.target.value)} className="w-full p-2 border text-sm rounded-lg font-bold text-center bg-emerald-50 text-emerald-700" />
              </div>
            </div>

            {/* Bagian 2: Bahan Baku */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-xs text-slate-800">2. Komponen Bahan Baku</h3>
                <button onClick={() => setSelectedBahanList([...selectedBahanList, { id: Date.now().toString(), bahanId: '', pemakaian: '0' }])} className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">+ Tambah Bahan</button>
              </div>
              {selectedBahanList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 border rounded-lg">
                  <select value={item.bahanId} onChange={e => { const copy = [...selectedBahanList]; copy[index].bahanId = e.target.value; setSelectedBahanList(copy); }} className="w-full p-1.5 text-xs border rounded bg-white">
                    <option value="">-- Pilih Bahan --</option>
                    {bahanMaster.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                  </select>
                  <input type="number" placeholder="gr/ml" value={item.pemakaian} onChange={e => { const copy = [...selectedBahanList]; copy[index].pemakaian = e.target.value; setSelectedBahanList(copy); }} className="w-16 p-1.5 text-xs border rounded text-center" />
                  <button onClick={() => setSelectedBahanList(selectedBahanList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            {/* Bagian 3: Tenaga Kerja */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-xs text-slate-800">3. Komponen Tenaga Kerja</h3>
                <button onClick={() => setSelectedTenagaList([...selectedTenagaList, { id: Date.now().toString(), tenagaId: '', durasiMenit: '0' }])} className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">+ Tambah Pekerja</button>
              </div>
              {selectedTenagaList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 border rounded-lg">
                  <select value={item.tenagaId} onChange={e => { const copy = [...selectedTenagaList]; copy[index].tenagaId = e.target.value; setSelectedTenagaList(copy); }} className="w-full p-1.5 text-xs border rounded bg-white">
                    <option value="">-- Pilih Pekerja --</option>
                    {tenagaMaster.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                  </select>
                  <input type="number" placeholder="Menit" value={item.durasiMenit} onChange={e => { const copy = [...selectedTenagaList]; copy[index].durasiMenit = e.target.value; setSelectedTenagaList(copy); }} className="w-16 p-1.5 text-xs border rounded text-center" />
                  <button onClick={() => setSelectedTenagaList(selectedTenagaList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            {/* Bagian 4: Alat Produksi */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-xs text-slate-800">4. Penyusutan Alat</h3>
                <button onClick={() => setSelectedAlatList([...selectedAlatList, { id: Date.now().toString(), alatId: '' }])} className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">+ Tambah Alat</button>
              </div>
              {selectedAlatList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 border rounded-lg">
                  <select value={item.alatId} onChange={e => { const copy = [...selectedAlatList]; copy[index].alatId = e.target.value; setSelectedAlatList(copy); }} className="w-full p-1.5 text-xs border rounded bg-white">
                    <option value="">-- Pilih Alat --</option>
                    {alatMaster.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                  </select>
                  <button onClick={() => setSelectedAlatList(selectedAlatList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            {/* Bagian 5: Overhead */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-xs text-slate-800">5. Beban Overhead</h3>
                <button onClick={() => setSelectedOverheadList([...selectedOverheadList, { id: Date.now().toString(), overheadId: '' }])} className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-1 rounded">+ Tambah Overhead</button>
              </div>
              {selectedOverheadList.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 border rounded-lg">
                  <select value={item.overheadId} onChange={e => { const copy = [...selectedOverheadList]; copy[index].overheadId = e.target.value; setSelectedOverheadList(copy); }} className="w-full p-1.5 text-xs border rounded bg-white">
                    <option value="">-- Pilih Overhead --</option>
                    {overheadMaster.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
                  </select>
                  <button onClick={() => setSelectedOverheadList(selectedOverheadList.filter(x => x.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            {/* RINGKASAN & SIMPAN */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4 shadow-lg border-t-4 border-emerald-500 mt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300"><span>Biaya Bahan (Total):</span><span>{formatRp(totalBiayaBahan)}</span></div>
                <div className="flex justify-between text-xs text-slate-300"><span>Biaya Tenaga (Total):</span><span>{formatRp(totalBiayaTenaga)}</span></div>
                <div className="flex justify-between text-xs text-slate-300"><span>Penyusutan Alat (Total):</span><span>{formatRp(totalBiayaAlat)}</span></div>
                <div className="flex justify-between text-xs text-slate-300"><span>Biaya Overhead (Total):</span><span>{formatRp(totalBiayaOverhead)}</span></div>
                <hr className="border-slate-700" />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-semibold text-white">HPP per Porsi:</span>
                  <span className="text-lg font-bold text-amber-400">{formatRp(hppPerPorsi)}</span>
                </div>
              </div>

              <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Target Margin: {targetMargin}%</span>
                  <span className="font-bold text-emerald-400">Harga Jual: {formatRp(hargaJualTarget)}</span>
                </div>
                <input type="range" min="5" max="80" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>

              <button onClick={handleSimpanResep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-3 rounded-lg shadow uppercase tracking-wide">
                Simpan Ke Katalog Resep
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB KATALOG RESEP ================= */}
        {activeTab === 'katalog' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20}/> Katalog Resep</h2>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold">{filteredResep.length} Resep</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Cari resep produk..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm shadow-sm" />
            </div>

            {filteredResep.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{r.namaProduk}</h3>
                    <p className="text-xs text-slate-500">{r.targetPorsi} Porsi • Dibuat: {r.tanggalDibuat}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500">Harga Jual Target</span>
                    <span className="text-sm font-bold text-emerald-700">{formatRp(r.hargaJualTarget)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t mt-2">
                  <button onClick={() => window.print()} className="flex-1 text-xs border border-slate-300 py-2 rounded-lg flex justify-center items-center gap-1.5 font-medium hover:bg-slate-50"><Printer size={14}/> Cetak PDF</button>
                  <button onClick={() => exportToCSV(`Resep-${r.namaProduk.replace(/\s+/g, '-')}`, r.bahanList)} className="flex-1 text-xs border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-lg flex justify-center items-center gap-1.5 font-medium"><Download size={14}/> Unduh Excel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= TAB PENGATURAN ================= */}
        {activeTab === 'pengaturan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20}/> Pengaturan Sistem</h2>
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-slate-700"><Cloud size={16}/> Integrasi Google Sheet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Masukkan Web App URL (berakhiran /exec) dari Google Apps Script untuk menyimpan dan menyinkronkan data antar perangkat (Admin & Staff).</p>
              <input type="text" placeholder="https://script.google.com/macros/s/.../exec" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full p-2 border text-xs rounded-lg font-mono bg-slate-50" />
              <div className="flex gap-2 pt-2">
                <button onClick={fetchFromCloud} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-lg font-medium flex justify-center gap-1 items-center"> Tarik Data</button>
                <button onClick={syncToCloud} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs py-2.5 rounded-lg font-medium flex justify-center gap-1 items-center"> Kirim Backup</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= NAVIGASI BAWAH ================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('katalog')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'katalog' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><BookOpen size={20}/> Katalog</button>
        <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'master' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Database size={20}/> Master Data</button>
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('kalkulator')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'kalkulator' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Calculator size={20}/> Kalkulator HPP</button>
            <button onClick={() => setActiveTab('pengaturan')} className={`flex flex-col items-center gap-1 text-[10px] ${activeTab === 'pengaturan' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><Settings size={20}/> Pengaturan</button>
          </>
        )}
      </nav>
    </div>
  );
}
