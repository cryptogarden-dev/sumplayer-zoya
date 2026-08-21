# CALCULATION_ENGINE.md — Dokumentasi Mesin Perhitungan (Tahap 2)

Dokumen ini merinci setiap rumus yang diimplementasikan di
`src/lib/domain/**`, termasuk input/output, aturan validasi, dan hasil
kasus uji wajib. Kode sumber adalah kebenaran utama; dokumen ini adalah
ringkasan yang harus diperbarui bila rumus berubah.

Prinsip desain (berlaku untuk seluruh modul di bawah):

- **Fungsi murni**: tidak ada `fetch`, tidak ada Prisma, tidak ada React —
  `src/lib/domain/**` tidak mengimpor apa pun dari `src/app`,
  `src/components`, atau `src/lib/db`.
- **Presisi uang**: seluruh aritmetika uang memakai `Decimal` dari
  `decimal.js` (lihat `src/lib/domain/money/money.ts`), tidak pernah
  `number` biasa untuk kali/bagi/jumlah nilai uang (R27, poin 12).
- **Tidak ada nilai hardcode untuk kebijakan bisnis**: tarif pajak, syarat
  minimum gratis ongkir, dan nilai ongkir SELALU diberikan sebagai
  parameter oleh pemanggil (data dari `tax_rates`/`shipping_rules` pada
  tahap berikutnya), bukan konstanta di kode (R07).
- **Konstanta fisik boleh tetap**: faktor konversi satuan (1 kg = 1000 g,
  dst.) adalah hukum fisika, bukan kebijakan bisnis, sehingga boleh
  menjadi konstanta di `src/lib/domain/units/constants.ts`.

---

## 1. Satuan & Dimensi (`src/lib/domain/units/`)

### 1.1 Family/dimensi satuan

| Family | Satuan dasar | Satuan anggota    |
| ------ | ------------ | ----------------- |
| WEIGHT | KILOGRAM     | GRAM, KILOGRAM    |
| VOLUME | LITER        | MILLILITER, LITER |
| COUNT  | PCS          | PCS, LUSIN        |

Jenis kemasan (`DUS`, `PAK`, `KARUNG`, `BOTOL`, `KALENG`, `SAK`, `BAL`,
`TRAY`, `BOX`) **bukan** bagian dari tabel ini — nilainya deskriptif saja
(lihat §1.3).

### 1.2 Faktor konversi (`constants.ts`)

```
GRAM       -> KILOGRAM  x 0.001
KILOGRAM   -> KILOGRAM  x 1        (basis)
MILLILITER -> LITER     x 0.001
LITER      -> LITER     x 1        (basis)
PCS        -> PCS       x 1        (basis)
LUSIN      -> PCS       x 12
```

Fungsi: `toBaseUnit(quantity, unit) -> { family, baseUnit, quantity }`
(`convert.ts`). Menolak kuantitas ≤ 0 (poin 5) lewat
`assertPositiveQuantity`.

### 1.3 Penolakan konversi tidak kompatibel (R05, poin 5)

`assertSameFamily(a, b)` dan `assertCompatibleUnits(unitA, unitB)`
melempar `IncompatibleUnitError` jika family berbeda:

- WEIGHT ↔ VOLUME ditolak (kg ↔ liter).
- VOLUME ↔ COUNT ditolak (liter ↔ pcs).
- COUNT ↔ WEIGHT ditolak (pcs ↔ kg).

### 1.4 Struktur kemasan (`packaging.ts`, poin 4)

```
resolvePackage({
  packagingType,       // deskriptif: DUS/PAK/KARUNG/...
  itemsPerPackage,      // jumlah barang dalam kemasan
  contentPerItem,       // isi setiap barang
  contentUnit,          // satuan isi (GRAM/KILOGRAM/.../PCS/LUSIN)
}) -> {
  ...,
  family,
  baseUnit,
  totalContentInBaseUnit,  // = itemsPerPackage × toBaseUnit(contentPerItem, contentUnit)
}
```

Menolak `itemsPerPackage` atau `contentPerItem` ≤ 0.

Contoh (R06):

| Kemasan               | itemsPerPackage | contentPerItem | contentUnit | totalContentInBaseUnit |
| --------------------- | --------------- | -------------- | ----------- | ---------------------- |
| 1 karung beras        | 1               | 25             | KILOGRAM    | 25 kg                  |
| 1 dus minyak (12×1L)  | 12              | 1              | LITER       | 12 liter               |
| 1 dus barang (24 pcs) | 24              | 1              | PCS         | 24 pcs                 |

---

## 2. Uang (`src/lib/domain/money/money.ts`)

- `Money = Decimal` (alias semantik dari `decimal.js`).
- `money(value)`: memvalidasi nilai uang — harus angka valid & tidak
  boleh negatif (nol tetap diperbolehkan, mis. promo).
- `roundMoney(value, decimalPlaces = 0)`: aturan pembulatan yang
  terdokumentasi (kasus uji #23) — **round half up** (0,5 selalu ke atas),
  BUKAN round half to even. Hanya dipakai di lapisan presentasi/output
  akhir; nilai antara yang masih dipakai untuk perhitungan lanjutan TIDAK
  dibulatkan (docs/ARCHITECTURE.md §6.1).

Contoh: `roundMoney(2.5) = 3`, `roundMoney(15000.4) = 15000`,
`roundMoney(15000.5) = 15001`.

---

## 3. Pajak (`src/lib/domain/pricing/tax.ts`, R07, poin 6-7)

Input: `{ taxStatus, pricePerPackage, taxRatePercent }`.
`taxRatePercent` **wajib diberikan oleh pemanggil** (tidak hardcode).

| taxStatus  | Interpretasi `pricePerPackage` | priceBeforeTax                   | taxAmount                        | priceAfterTax              |
| ---------- | ------------------------------ | -------------------------------- | -------------------------------- | -------------------------- |
| `NONE`     | Tidak ada pajak                | = pricePerPackage                | 0                                | = pricePerPackage          |
| `EXCLUDED` | Belum termasuk pajak           | = pricePerPackage                | pricePerPackage × rate/100       | priceBeforeTax + taxAmount |
| `INCLUDED` | Sudah termasuk pajak           | pricePerPackage ÷ (1 + rate/100) | pricePerPackage − priceBeforeTax | = pricePerPackage          |

Validasi: harga < 0 ditolak (`InvalidMoneyError`), tarif pajak < 0 ditolak.

---

## 4. Harga per Satuan Dasar (`unit-price.ts`, R10, poin 7)

```
pricePerBaseUnit = price ÷ totalContentInBaseUnit
```

Menolak `totalContentInBaseUnit` ≤ 0. Menerima `price` = 0 (hasil nol).

Golden cases (R06):

| Harga per kemasan | Total isi | Harga per satuan dasar |
| ----------------- | --------- | ---------------------- |
| Rp375.000         | 25 kg     | Rp15.000/kg            |
| Rp204.000         | 12 liter  | Rp17.000/liter         |
| Rp240.000         | 24 pcs    | Rp10.000/pcs           |

---

## 5. Jumlah Pembelian (`packages.ts`, R11, poin 8)

```
packagesRequiredRaw = ceil(kebutuhan ÷ isiSatuKemasan)
packagesToBuy        = max(packagesRequiredRaw, minimumPurchasePackages)
packagesToBuy         = ceil(packagesToBuy ÷ purchaseMultiple) × purchaseMultiple
actualQuantityInBaseUnit = packagesToBuy × isiSatuKemasan
excessQuantityInBaseUnit = actualQuantityInBaseUnit − kebutuhan   (selalu ≥ 0)
```

`minimumPurchasePackages` dan `purchaseMultiple` opsional (default 1).
`purchaseMultiple` wajib bilangan bulat.

Contoh:

| Kebutuhan       | Isi/Kemasan | Minimum | Kelipatan | packagesToBuy             | Aktual    |
| --------------- | ----------- | ------- | --------- | ------------------------- | --------- |
| 20 kg           | 25 kg       | -       | -         | 1                         | 25 kg     |
| 26 kg           | 25 kg       | -       | -         | 2                         | 50 kg     |
| 5 (unit)        | 10 (unit)   | 3       | -         | 3                         | 30 (unit) |
| 1-6 kemasan raw | -           | -       | 2         | dibulatkan ke 2,2,4,4,6,6 | -         |

Stok **tidak** mengubah angka ini secara diam-diam — lihat §6.

---

## 6. Stok (`stock.ts`, R09, poin 9)

`evaluateStock({ availabilityStatus, availablePackages?, packagesNeeded })`
mengembalikan `{ meetsNeed, isCertain, reason }`.

| Status             | meetsNeed                                                                                            | isCertain                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `KOSONG`           | selalu `false`                                                                                       | `true`                                     |
| `TERSEDIA`         | `true` jika `availablePackages` tak diketahui; jika diketahui: `availablePackages >= packagesNeeded` | `true`                                     |
| `STOK_TERBATAS`    | `false` jika jumlah tak diketahui; jika diketahui: `availablePackages >= packagesNeeded`             | `true` jika jumlah diketahui, else `false` |
| `PRE_ORDER`        | selalu `false`                                                                                       | `false`                                    |
| `PERLU_KONFIRMASI` | **selalu `false`** (poin 9: jangan anggap pasti tersedia)                                            | `false`                                    |

---

## 7. Ongkir (`shipping.ts`, R08, poin 10)

`calculateShipping({ mode, subtotal, freeShippingMinAmount?, flatFee?, areaFee? })`

| Mode                   | fee                                                                                                       | Catatan                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GRATIS_TANPA_SYARAT`  | `0`                                                                                                       | Selalu nol, apa pun subtotalnya |
| `GRATIS_MIN_PEMBELIAN` | `0` jika `subtotal >= freeShippingMinAmount` (pakai `>=`, tepat di batas = gratis); jika tidak, `flatFee` |                                 |
| `TETAP`                | `flatFee`                                                                                                 |                                 |
| `BERDASARKAN_AREA`     | `areaFee` (sudah di-resolve pemanggil sesuai area tujuan)                                                 |                                 |
| `PICKUP`               | `0`, `isPickup: true`                                                                                     |                                 |
| `PERLU_KONFIRMASI`     | **`null`** (BUKAN nol)                                                                                    | `requiresConfirmation: true`    |

`fee: null` adalah nilai yang disengaja untuk membedakan "belum diketahui"
dari "nol" — konsumen (mis. `order-total.ts`) wajib menanganinya secara
eksplisit, bukan memperlakukan `null` seolah `0`.

---

## 8. Subtotal & Total Pesanan (`subtotal.ts`, `order-total.ts`, R10, poin 11)

```
# subtotal.ts
tax = calculateTax({ taxStatus, pricePerPackage, taxRatePercent })
subtotalAfterTax = tax.priceAfterTax × packagesToBuy

# order-total.ts
totalCost               = subtotalAfterTax + shippingFee        (null jika shippingFee null)
finalPricePerBaseUnit    = totalCost ÷ actualQuantityInBaseUnit   (null jika totalCost null)
```

Urutan wajib: hitung `subtotalAfterTax` terlebih dahulu (dibutuhkan mode
ongkir `GRATIS_MIN_PEMBELIAN` untuk mengecek syarat), baru hitung
`calculateShipping`, baru `calculateOrderTotal`.

Jika ongkir `PERLU_KONFIRMASI`, maka `totalCost` dan
`finalPricePerBaseUnit` juga `null` — total pesanan tidak boleh
ditampilkan seolah pasti sebelum ongkir dikonfirmasi (kasus uji #18).

---

## 9. Ringkasan Kasus Uji Wajib

Seluruh 23 kasus uji pada instruksi Tahap 2 diimplementasikan dan LULUS.
Lihat file test yang bersangkutan:

| #   | Kasus                                    | File test                                                                   |
| --- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Rp375.000/25kg = Rp15.000/kg             | `unit-price.test.ts`, `golden-cases.test.ts`                                |
| 2   | Rp204.000/12L = Rp17.000/L               | `unit-price.test.ts`, `golden-cases.test.ts`                                |
| 3   | Rp240.000/24pcs = Rp10.000/pcs           | `unit-price.test.ts`, `golden-cases.test.ts`                                |
| 4   | 1.000 gram = 1 kg                        | `convert.test.ts`                                                           |
| 5   | 1.000 ml = 1 liter                       | `convert.test.ts`                                                           |
| 6   | 1 lusin = 12 pcs                         | `convert.test.ts`                                                           |
| 7   | 20kg/kemasan25kg -> 1 kemasan, 25kg      | `packages.test.ts`                                                          |
| 8   | 26kg/kemasan25kg -> 2 kemasan, 50kg      | `packages.test.ts`                                                          |
| 9   | Minimum 3 dus tidak boleh < 3            | `packages.test.ts`                                                          |
| 10  | Kelipatan 2 -> 2,4,6,...                 | `packages.test.ts`                                                          |
| 11  | INCLUDED tidak ditambah pajak lagi       | `tax.test.ts`                                                               |
| 12  | EXCLUDED ditambahkan sesuai tarif        | `tax.test.ts`                                                               |
| 13  | NONE tidak terkena pajak                 | `tax.test.ts`                                                               |
| 14  | Subtotal tepat batas -> ongkir nol       | `shipping.test.ts`                                                          |
| 15  | Subtotal di bawah batas -> ongkir normal | `shipping.test.ts`                                                          |
| 16  | Gratis tanpa syarat selalu nol           | `shipping.test.ts`                                                          |
| 17  | Pickup -> nol + label pickup             | `shipping.test.ts`                                                          |
| 18  | Perlu konfirmasi bukan nol               | `shipping.test.ts`, `order-total.test.ts`                                   |
| 19  | Stok kosong tidak memenuhi               | `stock.test.ts`                                                             |
| 20  | Stok kurang ditandai tidak cukup         | `stock.test.ts`                                                             |
| 21  | Konversi kg ke liter ditolak             | `convert.test.ts`                                                           |
| 22  | Nilai negatif & isi nol ditolak          | `convert.test.ts`, `packaging.test.ts`, `packages.test.ts`, `stock.test.ts` |
| 23  | Aturan pembulatan uang terdokumentasi    | `money.test.ts`                                                             |

Total: 19 file test, 111 test lulus (30 dari Tahap 1 + 81 dari Tahap 2).

---

## 10. Yang Belum Termasuk di Tahap 2

Sesuai arahan eksplisit awal Tahap 2, modul berikut **dipindahkan ke
Tahap 4 (Perbandingan dan Rekomendasi)** dan belum diimplementasikan di
sini:

- `lib/domain/performance` — estimasi ketepatan waktu (R15).
- `lib/domain/recommendation` — logika rekomendasi & label transparan
  (R13, R14).

Alasan: kedua modul ini secara alami menjadi bagian dari halaman
Bandingkan (R12-R14) dan baru bermakna setelah ada data supplier/produk
nyata dari Tahap 3, sehingga digabungkan ke Tahap 4 alih-alih Tahap 2.
