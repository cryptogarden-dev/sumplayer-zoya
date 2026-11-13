# Toko Bumbu Zoya: Design Spec untuk AI Agent

Aplikasi internal "Supplier & Harga" untuk Toko Bumbu Zoya. Gaya: elegan, minimalis, adem (biru keabu-abuan + putih).
Target: desktop 1440x900. Halaman: Supplier, Produk, Bandingkan, Pesanan.

## 1. Brand
- Nama: **Zoya**, sub-label: **TOKO BUMBU** (huruf kapital, letter-spacing lebar)
- Logo: monogram huruf "Z" slate dengan daun kecil warna kunyit di sudut kanan atas.
  File: `assets/logo-zoya.png` (export dari canvas Moda, halaman "Logo").
- Di sidebar: logo 44x44 (radius 12) + teks "Zoya" (serif) dan "TOKO BUMBU" (9px, spacing 3px).

## 2. Warna (lihat tokens.json)
| Token | Hex | Pemakaian |
|---|---|---|
| slate | #2E4558 | teks utama, tombol utama, kartu gelap, avatar |
| mist | #5E7C93 | ikon & teks menu tidak aktif |
| cloud | #DCE5EC | border, input outline |
| nav-active | #E6EDF2 | latar menu aktif, chip netral |
| kunyit | #C9774F | aksen: harga, badge "Termurah", tombol CTA khusus |
| kunyit-soft | #F6E7DF | latar badge kunyit |
| bg | #F4F6F8 | latar halaman |
| surface | #FFFFFF | sidebar, kartu, tabel |
| muted | #7D8F9E | teks sekunder, header tabel |
| divider | #EDF1F4 | garis antar baris |
| success | #3F8A62 / bg #E3F1EA | status "Aktif" |

## 3. Tipografi (Google Fonts)
- Judul halaman: **Cormorant Garamond** 600, 34-38px, warna slate
- Semua UI lain: **Plus Jakarta Sans**
  - Body 14px (500), nama/judul baris 15px (700)
  - Caption/sub-judul 13px (400, muted)
  - Header tabel 13px UPPERCASE, muted
  - Angka KPI 28px 700; harga besar 44px 700

## 4. Layout
- Sidebar kiri lebar 260px, putih, padding 28px 20px. Item menu tinggi 44px, radius 12, ikon 18px + label, gap 12.
  Menu aktif: bg #E6EDF2, teks slate bold. Tidak aktif: mist.
  Urutan: Supplier (ikon truk), Produk (ikon box), Bandingkan (ikon timbangan), Pesanan (ikon struk). Pakai Phosphor / Lucide outline.
- Konten: mulai x=300, lebar 1100, padding atas 32, gap vertikal 28.
- Topbar: search (360x44, putih, radius 12, ikon kaca pembesar) kiri; tombol notifikasi 44x44 + avatar bulat 40px slate kanan.
- Header halaman: judul serif + subjudul muted di kiri, tombol aksi kanan (tinggi 46, radius 12, bg slate, teks putih 14/600).
- Kartu: putih, radius 16-20, tanpa shadow (atau shadow sangat halus), padding 20-24.

## 5. Halaman
**Supplier**: 4 kartu KPI (Total Supplier, Supplier Aktif, Produk Ditawarkan, Area Terlayani: kartu ke-4 bg slate teks putih). Lalu tabel: Nama Supplier (avatar inisial 40px bg #E6EDF2), Lokasi, Kontak, Produk, Status (pill "Aktif" hijau).
**Produk**: dropdown "Semua Supplier" + tombol "Tambah Produk". Grid kartu 4 kolom (260x400): foto 230px radius 14, nama, "Modal Rp ..." warna kunyit, stok, "n penawaran supplier" + tombol edit kecil. Kartu kosong putus-putus "Tambah produk baru".
**Bandingkan**: dropdown pilih produk. Kiri (2/3): tabel Supplier / Harga / Ongkir / Total, badge "Termurah" kunyit. Kanan (1/3): panel slate "PENAWARAN TERBAIK" dengan nama supplier, lokasi, total besar 44px putih, tombol bawah "Buat Pesanan" bg kunyit.
**Pesanan**: tab pill (Semua aktif = slate; Diproses, Dikirim, Selesai = putih). Tabel: No. Pesanan (#ZY-0001), Supplier, Produk, Total, Status (pill #E6EDF2).

## 6. Aturan gaya
- Banyak ruang kosong, sudut membulat, tidak ada gradient mencolok.
- Kunyit hanya sebagai aksen (maks 1-2 elemen per layar).
- Format rupiah: "Rp 58.000" (titik ribuan).
- Bahasa UI: Indonesia.
