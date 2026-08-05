export interface BahanBaku {
  id: string;
  nama: string;
  hargaBeli: number;
  isiKemasan: number;
  satuan: 'gram' | 'ml' | 'pcs';
}

export interface TenagaKerja {
  id: string;
  nama: string;
  tipe: 'gaji_harian' | 'borongan';
  nominal: number;
  jamKerjaHarian?: number;
}

export interface AlatProduksi {
  id: string;
  nama: string;
  hargaBeli: number;
  umurBulan: number;
  targetPorsiHarian: number;
}

export interface ItemBahanResep {
  bahanId: string;
  nama: string;
  jumlahPemakaian: number;
  biayaSubtotal: number;
}

export interface ItemOperasionalResep {
  id: string;
  nama: string;
  nominal: number;
}

export interface ResepHPP {
  id: string;
  namaProduk: string;
  targetPorsi: number;
  bahanList: ItemBahanResep[];
  operasionalList: ItemOperasionalResep[];
  totalHppPerPorsi: number;
  targetMarginPersen: number;
  hargaJualBEP: number;
  hargaJualTarget: number;
  tanggalDibuat: string;
}
