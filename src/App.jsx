import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator,
  Database,
  BookOpen,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  Printer,
  Upload,
  Download,
  Lock,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCcw,
  AlertTriangle
} from 'lucide-react';

// ---- UTILS ----
const safeNum = (v) => Number(v) || 0;

const generateId = () => Math.random().toString(36).substring(2, 9);

// ---- CSV Helpers ----
function masterToCSV(items) {
  const header = 'type,name,packagePrice,packageSize,unit';
  const rows = items.map(
    (i) => `${i.type},${i.name},${i.packagePrice},${i.packageSize},${i.unit}`
  );
  return [header, ...rows].join('\n');
}

function parseCSVMaster(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 5) {
      result.push({
        id: generateId(),
        type: parts[0],
        name: parts[1],
        packagePrice: safeNum(parts[2]),
        packageSize: safeNum(parts[3]),
        unit: parts[4]
      });
    }
  }
  return result;
}

// ---- MAIN APP ----
export default function App() {
  // Core data
  const [masterData, setMasterData] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [settings, setSettings] = useState({
    pinEnabled: false,
    pin: '',
    webhookUrl: ''
  });
  const [staffMode, setStaffMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('kalkulator');
  const [message, setMessage] = useState('');

  // Load from localStorage and check URL
  useEffect(() => {
    const storedMaster = localStorage.getItem('marginKu_master');
    const storedRecipes = localStorage.getItem('marginKu_recipes');
    const storedSettings = localStorage.getItem('marginKu_settings');

    if (storedMaster) setMasterData(JSON.parse(storedMaster));
    if (storedRecipes) setRecipes(JSON.parse(storedRecipes));
    if (storedSettings) setSettings(JSON.parse(storedSettings));

    // Staff mode detection
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isStaff = params.get('mode') === 'staff' || hash === '#/staff';
    if (isStaff) {
      setStaffMode(true);
      setLocked(false);
    }
  }, []);

  // Lock on refresh if PIN enabled and not staff
  useEffect(() => {
    const storedSettings = localStorage.getItem('marginKu_settings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      if (parsed.pinEnabled && !staffMode) {
        setLocked(true);
      }
    }
  }, [staffMode]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('marginKu_master', JSON.stringify(masterData));
  }, [masterData]);

  useEffect(() => {
    localStorage.setItem('marginKu_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('marginKu_settings', JSON.stringify(settings));
  }, [settings]);

  // Auto-pull from cloud on startup if webhook URL exists
  useEffect(() => {
    const storedSettings = localStorage.getItem('marginKu_settings');
    if (storedSettings && !staffMode) {
      const s = JSON.parse(storedSettings);
      if (s.webhookUrl) {
        pullFromCloud(s.webhookUrl, false); // silent pull
      }
    }
  }, []); // only on mount

  // Cloud sync functions
  const pullFromCloud = async (url, showMsg = true) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data');
      const data = await res.json();
      if (data.masterData) setMasterData(data.masterData);
      if (data.recipes) setRecipes(data.recipes);
      if (data.settings) {
        // keep webhook URL from local settings
        setSettings((prev) => ({ ...data.settings, webhookUrl: prev.webhookUrl }));
      }
      if (showMsg) setMessage('Data berhasil ditarik dari cloud.');
    } catch (err) {
      if (showMsg) setMessage('Error: ' + err.message);
    }
  };

  const pushToCloud = async () => {
    if (!settings.webhookUrl) {
      setMessage('Webhook URL belum diatur.');
      return;
    }
    try {
      const payload = {
        masterData,
        recipes,
        settings: { ...settings, pin: '' } // never send PIN
      };
      const res = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Gagal push data');
      setMessage('Data berhasil dikirim ke cloud.');
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  // Handlers
  const addMasterItem = (item) => {
    setMasterData((prev) => [...prev, { ...item, id: generateId() }]);
  };

  const updateMasterItem = (id, updated) => {
    setMasterData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const deleteMasterItem = (id) => {
    setMasterData((prev) => prev.filter((item) => item.id !== id));
  };

  const addRecipe = (recipe) => {
    setRecipes((prev) => [...prev, { ...recipe, id: generateId(), createdDate: new Date().toISOString() }]);
  };

  const updateRecipe = (id, updated) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  };

  const deleteRecipe = (id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const clearMessage = () => setMessage('');

  if (locked) {
    return (
      <LockScreen
        pin={settings.pin}
        onUnlock={() => setLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {message && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded flex items-center gap-2 shadow">
          <span>{message}</span>
          <button onClick={clearMessage}>
            <XCircle size={16} />
          </button>
        </div>
      )}

      <header className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-lg font-bold">MarginKu</h1>
        <div className="flex gap-2">
          <button
            onClick={pushToCloud}
            className="p-1 hover:bg-slate-700 rounded"
            title="Push ke Cloud"
            disabled={staffMode}
          >
            <Upload size={18} />
          </button>
          <button
            onClick={() => pullFromCloud(settings.webhookUrl, true)}
            className="p-1 hover:bg-slate-700 rounded"
            title="Pull dari Cloud"
            disabled={staffMode}
          >
            <Download size={18} />
          </button>
        </div>
        {staffMode && (
          <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded font-semibold">
            MODE STAF
          </span>
        )}
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {activeTab === 'kalkulator' && (
          <Kalkulator
            masterData={masterData}
            recipes={recipes}
            addMasterItem={addMasterItem}
            addRecipe={addRecipe}
            staffMode={staffMode}
          />
        )}
        {activeTab === 'masterdata' && (
          <MasterData
            data={masterData}
            addMasterItem={addMasterItem}
            updateMasterItem={updateMasterItem}
            deleteMasterItem={deleteMasterItem}
            staffMode={staffMode}
          />
        )}
        {activeTab === 'katalog' && (
          <KatalogResep
            recipes={recipes}
            updateRecipe={updateRecipe}
            deleteRecipe={deleteRecipe}
            staffMode={staffMode}
            onLoadToCalc={(recipe) => {
              // Switch to kalkulator and pass recipe via a session var? We'll use a callback.
              // For simplicity, we store selected recipe in localStorage and let Kalkulator pick it up.
              localStorage.setItem('marginKu_loadRecipe', JSON.stringify(recipe));
              setActiveTab('kalkulator');
            }}
          />
        )}
        {activeTab === 'pengaturan' && !staffMode && (
          <Pengaturan
            settings={settings}
            setSettings={setSettings}
            masterData={masterData}
            setMasterData={setMasterData}
            recipes={recipes}
            setRecipes={setRecipes}
            pullFromCloud={pullFromCloud}
            pushToCloud={pushToCloud}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} staffMode={staffMode} />
    </div>
  );
}

// ---- LOCK SCREEN ----
function LockScreen({ pin, onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === pin) {
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl text-center w-80">
        <Lock size={48} className="mx-auto text-slate-700 mb-4" />
        <h2 className="text-xl font-bold mb-4">Akses Terkunci</h2>
        <input
          type="password"
          placeholder="Masukkan PIN"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          className="border p-2 w-full rounded mb-2 text-center"
          maxLength={6}
        />
        {error && <p className="text-red-500 text-sm">PIN salah</p>}
        <button type="submit" className="mt-4 bg-slate-800 text-white py-2 px-6 rounded hover:bg-slate-700">
          Buka
        </button>
      </form>
    </div>
  );
}

// ---- BOTTOM NAVIGATION ----
function BottomNav({ activeTab, setActiveTab, staffMode }) {
  const tabs = [
    { id: 'kalkulator', icon: Calculator, label: 'Kalkulator' },
    { id: 'masterdata', icon: Database, label: 'Master Data' },
    { id: 'katalog', icon: BookOpen, label: 'Katalog Resep' },
  ];
  if (!staffMode) {
    tabs.push({ id: 'pengaturan', icon: Settings, label: 'Pengaturan' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center text-xs ${
            activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <tab.icon size={20} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ---- KALKULATOR ----
function Kalkulator({ masterData, recipes, addMasterItem, addRecipe, staffMode }) {
  const [items, setItems] = useState([]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [recipeName, setRecipeName] = useState('');

  // Load recipe passed from Katalog
  useEffect(() => {
    const saved = localStorage.getItem('marginKu_loadRecipe');
    if (saved) {
      const recipe = JSON.parse(saved);
      setItems(recipe.items || []);
      setSellingPrice(recipe.sellingPrice || '');
      setRecipeName(recipe.name || '');
      localStorage.removeItem('marginKu_loadRecipe');
    }
  }, []);

  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        packagePrice: '',
        packageSize: '',
        usageQty: '',
        unit: '',
        fromMaster: false,
        saveToMaster: false
      }
    ]);
  };

  const addFromMaster = () => {
    if (masterData.length === 0) {
      alert('Master Data kosong. Silakan tambah data terlebih dahulu.');
      return;
    }
    const choice = prompt(
      'Pilih item (ketik nama atau ID):\n' +
        masterData.map((i) => `${i.id.slice(0,4)} - ${i.name}`).join('\n')
    );
    if (!choice) return;
    const found = masterData.find(
      (i) => i.name.toLowerCase() === choice.toLowerCase() || i.id.startsWith(choice)
    );
    if (!found) {
      alert('Item tidak ditemukan.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: found.name,
        packagePrice: found.packagePrice,
        packageSize: found.packageSize,
        usageQty: '',
        unit: found.unit,
        fromMaster: true,
        masterId: found.id,
        saveToMaster: false
      }
    ]);
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalHPP = items.reduce((sum, item) => {
    const pp = safeNum(item.packagePrice);
    const ps = safeNum(item.packageSize);
    const qty = safeNum(item.usageQty);
    if (ps === 0) return sum;
    return sum + (pp / ps) * qty;
  }, 0);

  const margin =
    sellingPrice && safeNum(sellingPrice) > 0
      ? ((safeNum(sellingPrice) - totalHPP) / safeNum(sellingPrice)) * 100
      : 0;

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      alert('Nama resep harus diisi.');
      return;
    }
    // Save manual items to master if checked
    items.forEach((item) => {
      if (!item.fromMaster && item.saveToMaster) {
        addMasterItem({
          type: 'bahan',
          name: item.name,
          packagePrice: safeNum(item.packagePrice),
          packageSize: safeNum(item.packageSize),
          unit: item.unit
        });
      }
    });
    addRecipe({
      name: recipeName,
      items: items,
      sellingPrice: sellingPrice
    });
    setItems([]);
    setSellingPrice('');
    setRecipeName('');
    alert('Resep tersimpan!');
  };

  const printRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Kalkulator HPP</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={addManualItem}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={18} /> Tambah Manual
        </button>
        <button
          onClick={addFromMaster}
          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
        >
          <Database size={18} /> Dari Master
        </button>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto bg-white rounded shadow mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2">Nama</th>
                <th className="p-2">Hrg Paket</th>
                <th className="p-2">Isi Paket</th>
                <th className="p-2">Qty Pakai</th>
                <th className="p-2">Satuan</th>
                <th className="p-2">HPP/Item</th>
                <th className="p-2">Simpan?</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const hppItem =
                  safeNum(item.packageSize) > 0
                    ? (safeNum(item.packagePrice) / safeNum(item.packageSize)) *
                      safeNum(item.usageQty)
                    : 0;
                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full border rounded p-1"
                        disabled={staffMode}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.packagePrice}
                        onChange={(e) => updateItem(item.id, 'packagePrice', e.target.value)}
                        className="w-20 border rounded p-1"
                        disabled={staffMode}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.packageSize}
                        onChange={(e) => updateItem(item.id, 'packageSize', e.target.value)}
                        className="w-20 border rounded p-1"
                        disabled={staffMode}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.usageQty}
                        onChange={(e) => updateItem(item.id, 'usageQty', e.target.value)}
                        className="w-20 border rounded p-1"
                        disabled={staffMode}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-16 border rounded p-1"
                        disabled={staffMode}
                      />
                    </td>
                    <td className="p-2 font-mono">Rp {hppItem.toLocaleString('id')}</td>
                    <td className="p-2">
                      {!item.fromMaster && (
                        <input
                          type="checkbox"
                          checked={item.saveToMaster || false}
                          onChange={(e) => updateItem(item.id, 'saveToMaster', e.target.checked)}
                          disabled={staffMode}
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-500"
                        disabled={staffMode}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Total HPP:</span>
          <span>Rp {totalHPP.toLocaleString('id')}</span>
        </div>
        <div className="mt-2">
          <label className="block text-sm">Harga Jual</label>
          <input
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="border p-2 w-full rounded mt-1"
            placeholder="Masukkan harga jual"
            disabled={staffMode}
          />
        </div>
        <div className="flex justify-between mt-2 font-bold">
          <span>Margin:</span>
          <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
            {margin.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Nama Resep"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          className="border p-2 rounded flex-1"
          disabled={staffMode}
        />
        <button
          onClick={handleSaveRecipe}
          className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          disabled={staffMode}
        >
          <Save size={18} /> Simpan Resep
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          <Printer size={18} /> Cetak
        </button>
      </div>

      {/* Print area (hidden until print) */}
      <div id="print-area" className="hidden print:block p-4">
        <h2 className="text-center font-bold text-xl mb-2">Resep: {recipeName || 'Tanpa Nama'}</h2>
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Satuan</th>
              <th>HPP/Item</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const hpp = safeNum(item.packageSize) > 0
                ? (safeNum(item.packagePrice) / safeNum(item.packageSize)) * safeNum(item.usageQty)
                : 0;
              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.usageQty}</td>
                  <td>{item.unit}</td>
                  <td>{hpp.toLocaleString('id')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4">
          <p><strong>Total HPP:</strong> Rp {totalHPP.toLocaleString('id')}</p>
          <p><strong>Harga Jual:</strong> Rp {safeNum(sellingPrice).toLocaleString('id')}</p>
          <p><strong>Margin:</strong> {margin.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ---- MASTER DATA ----
function MasterData({ data, addMasterItem, updateMasterItem, deleteMasterItem, staffMode }) {
  const [category, setCategory] = useState('bahan'); // 'bahan', 'tenaga', 'alat'
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', packagePrice: '', packageSize: '', unit: '' });

  const filtered = data.filter((i) => i.type === category);

  const handleSave = () => {
    if (!form.name) return;
    if (editId) {
      updateMasterItem(editId, form);
    } else {
      addMasterItem({ ...form, type: category });
    }
    setForm({ name: '', packagePrice: '', packageSize: '', unit: '' });
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      packagePrice: item.packagePrice,
      packageSize: item.packageSize,
      unit: item.unit
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Master Data</h2>
      <div className="flex gap-2 mb-4">
        {['bahan', 'tenaga', 'alat'].map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setShowForm(false); }}
            className={`px-4 py-1 rounded-full ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {cat === 'bahan' ? 'Bahan Baku' : cat === 'tenaga' ? 'Tenaga Kerja' : 'Alat/Beban'}
          </button>
        ))}
      </div>

      {!staffMode && (
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); }}
          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded mb-4"
        >
          <Plus size={18} /> Tambah Item
        </button>
      )}

      {showForm && !staffMode && (
        <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-2 gap-3">
          <input
            placeholder="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Harga Paket"
            value={form.packagePrice}
            onChange={(e) => setForm({ ...form, packagePrice: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Isi Paket"
            value={form.packageSize}
            onChange={(e) => setForm({ ...form, packageSize: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            placeholder="Satuan (pcs, kg, ...)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border p-2 rounded"
          />
          <button onClick={handleSave} className="col-span-2 bg-blue-600 text-white py-2 rounded">
            {editId ? 'Update' : 'Simpan'}
          </button>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Nama</th>
              <th className="p-2">Harga Paket</th>
              <th className="p-2">Isi Paket</th>
              <th className="p-2">Satuan</th>
              {!staffMode && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.packagePrice}</td>
                <td className="p-2">{item.packageSize}</td>
                <td className="p-2">{item.unit}</td>
                {!staffMode && (
                  <td className="p-2 flex gap-2">
                    <button onClick={() => startEdit(item)} className="text-blue-600">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => deleteMasterItem(item.id)} className="text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- KATALOG RESEP ----
function KatalogResep({ recipes, updateRecipe, deleteRecipe, staffMode, onLoadToCalc }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Katalog Resep</h2>
      {recipes.length === 0 && <p className="text-gray-500">Belum ada resep tersimpan.</p>}
      <div className="space-y-3">
        {recipes.map((recipe) => {
          const totalHPP = recipe.items.reduce((sum, item) => {
            const pp = safeNum(item.packagePrice);
            const ps = safeNum(item.packageSize);
            const qty = safeNum(item.usageQty);
            return ps ? sum + (pp / ps) * qty : sum;
          }, 0);
          const margin = recipe.sellingPrice
            ? ((safeNum(recipe.sellingPrice) - totalHPP) / safeNum(recipe.sellingPrice)) * 100
            : 0;

          return (
            <div key={recipe.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{recipe.name}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(recipe.createdDate).toLocaleDateString('id')}
                </p>
                <p>HPP: Rp {totalHPP.toLocaleString('id')} | Jual: Rp {safeNum(recipe.sellingPrice).toLocaleString('id')} | Margin: {margin.toFixed(1)}%</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onLoadToCalc(recipe)}
                  className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200"
                  title="Muat ke Kalkulator"
                >
                  <Download size={18} />
                </button>
                {!staffMode && (
                  <>
                    <button
                      onClick={() => {
                        const newName = prompt('Nama baru', recipe.name);
                        if (newName) updateRecipe(recipe.id, { name: newName });
                      }}
                      className="bg-gray-100 p-2 rounded hover:bg-gray-200"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Hapus resep?')) deleteRecipe(recipe.id);
                      }}
                      className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- PENGATURAN ----
function Pengaturan({
  settings,
  setSettings,
  masterData,
  setMasterData,
  recipes,
  setRecipes,
  pullFromCloud,
  pushToCloud
}) {
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [webhookInput, setWebhookInput] = useState(settings.webhookUrl);
  const [pinError, setPinError] = useState('');

  const handleTogglePin = () => {
    if (!settings.pinEnabled) {
      // Enable: ask for new pin
      const pin = prompt('Masukkan PIN baru (4-6 digit):');
      if (pin && pin.length >= 4) {
        setSettings({ ...settings, pinEnabled: true, pin });
      }
    } else {
      // Disable: need current pin
      const current = prompt('Masukkan PIN saat ini:');
      if (current === settings.pin) {
        setSettings({ ...settings, pinEnabled: false, pin: '' });
      } else {
        alert('PIN salah');
      }
    }
  };

  const handleChangePin = () => {
    if (!settings.pinEnabled) return;
    const old = prompt('PIN lama:');
    if (old !== settings.pin) {
      alert('PIN lama salah');
      return;
    }
    const nu = prompt('PIN baru (4-6 digit):');
    if (nu && nu.length >= 4) {
      setSettings({ ...settings, pin: nu });
    }
  };

  const saveWebhook = () => {
    setSettings({ ...settings, webhookUrl: webhookInput });
    alert('Webhook URL disimpan.');
  };

  const copyStaffLink = () => {
    navigator.clipboard.writeText(window.location.origin + '?mode=staff');
    alert('Link staf disalin ke clipboard.');
  };

  const exportJSON = () => {
    const data = { masterData, recipes, settings: { ...settings, pin: '' } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marginku_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.masterData) setMasterData(parsed.masterData);
        if (parsed.recipes) setRecipes(parsed.recipes);
        if (parsed.settings) {
          setSettings((prev) => ({ ...parsed.settings, webhookUrl: prev.webhookUrl, pin: prev.pin }));
        }
        alert('Data berhasil diimpor.');
      } catch {
        alert('File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const csv = masterToCSV(masterData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const items = parseCSVMaster(ev.target.result);
        if (items.length > 0) {
          setMasterData((prev) => [...prev, ...items]);
          alert(`${items.length} item diimpor.`);
        }
      } catch {
        alert('File CSV tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Hapus SEMUA data (Master, Resep, Pengaturan)? Tindakan ini tidak bisa dibatalkan.')) {
      localStorage.clear();
      setMasterData([]);
      setRecipes([]);
      setSettings({ pinEnabled: false, pin: '', webhookUrl: '' });
      window.location.reload();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Pengaturan</h2>

      <div className="bg-white p-4 rounded shadow mb-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Proteksi PIN</h3>
          <div className="flex gap-3 items-center">
            <button
              onClick={handleTogglePin}
              className={`px-4 py-2 rounded ${settings.pinEnabled ? 'bg-red-600' : 'bg-green-600'} text-white`}
            >
              {settings.pinEnabled ? 'Nonaktifkan PIN' : 'Aktifkan PIN'}
            </button>
            {settings.pinEnabled && (
              <button onClick={handleChangePin} className="bg-gray-500 text-white px-4 py-2 rounded">
                Ubah PIN
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Link Staf (Read-Only)</h3>
          <button
            onClick={copyStaffLink}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            <Copy size={18} /> Salin Link Staf
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Sinkronisasi Cloud</h3>
          <label className="block text-sm">Webhook URL (Google Apps Script)</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="border p-2 flex-1 rounded"
              placeholder="https://script.google.com/macros/s/..."
            />
            <button onClick={saveWebhook} className="bg-gray-700 text-white px-4 py-2 rounded">
              Simpan
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={pushToCloud}
              className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Upload size={18} /> Push Data
            </button>
            <button
              onClick={() => pullFromCloud(settings.webhookUrl, true)}
              className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Download size={18} /> Pull Data
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Ekspor / Impor Data</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportJSON} className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-1">
              <Download size={16} /> JSON
            </button>
            <label className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
              <Upload size={16} /> Impor JSON
              <input type="file" accept=".json" onChange={importJSON} className="hidden" />
            </label>
            <button onClick={exportCSV} className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-1">
              <Download size={16} /> CSV Master
            </button>
            <label className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-1 cursor-pointer">
              <Upload size={16} /> Impor CSV
              <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <button
            onClick={clearAllData}
            className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-1"
          >
            <AlertTriangle size={18} /> Hapus Semua Data
          </button>
        </div>
      </div>
    </div>
  );
}