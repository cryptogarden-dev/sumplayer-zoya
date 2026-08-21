import "dotenv/config";
import { PrismaClient, BusinessUserRole } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * Seed data contoh untuk pengembangan lokal (poin 22 permintaan Tahap 1;
 * data supplier/produk/penawaran ditambahkan saat Tahap 4 agar halaman
 * Bandingkan punya data nyata untuk dicoba, karena UI CRUD Supplier/Produk
 * [Tahap 3] belum dibangun).
 *
 * Kredensial di bawah ini HANYA untuk data contoh di database pengembangan
 * lokal Anda sendiri, bukan kredensial produksi/asli. Jangan pernah memakai
 * kata sandi contoh ini di lingkungan produksi.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Lihat README.md untuk menjalankan seed.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const demoPasswordHash = await bcrypt.hash("ContohSandi123", 12);

  const business = await prisma.business.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Toko Contoh Sejahtera",
      ownerName: "Budi Santoso",
      defaultAddress: "Jl. Contoh Makmur No. 1, Jakarta",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "pemilik@contoh.test" },
    update: {},
    create: {
      name: "Budi Santoso",
      email: "pemilik@contoh.test",
      passwordHash: demoPasswordHash,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staf@contoh.test" },
    update: {},
    create: {
      name: "Siti Aminah",
      email: "staf@contoh.test",
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    update: {},
    create: {
      businessId: business.id,
      userId: owner.id,
      role: BusinessUserRole.owner_admin,
    },
  });

  await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: business.id, userId: staff.id } },
    update: {},
    create: {
      businessId: business.id,
      userId: staff.id,
      role: BusinessUserRole.staff,
    },
  });

  // ---------------------------------------------------------------------
  // Tahap 4: contoh produk, supplier, dan penawaran agar halaman
  // Bandingkan (/bandingkan) punya data nyata untuk dicoba.
  // ---------------------------------------------------------------------

  const taxRate = await prisma.taxRate.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000a1" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000a1",
      businessId: business.id,
      name: "PPN 11%",
      ratePercent: 11,
      isDefault: true,
      createdById: owner.id,
    },
  });

  const beras = await prisma.product.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000b1" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000b1",
      businessId: business.id,
      sku: "BERAS-PREMIUM",
      productName: "Beras Premium",
      unitFamily: "WEIGHT",
      baseUnit: "KILOGRAM",
      createdById: owner.id,
    },
  });

  const minyak = await prisma.product.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000b2" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000b2",
      businessId: business.id,
      sku: "MINYAK-GORENG",
      productName: "Minyak Goreng",
      unitFamily: "VOLUME",
      baseUnit: "LITER",
      createdById: owner.id,
    },
  });

  const supplierA = await prisma.supplier.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000c1" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000c1",
      businessId: business.id,
      supplierName: "CV Sumber Pangan Jaya",
      phoneNumber: "081234567890",
      whatsappNumber: "081234567890",
      address: "Jl. Pasar Induk No. 10",
      province: "DKI Jakarta",
      city: "Jakarta Timur",
      leadTimeDaysMin: 1,
      leadTimeDaysMax: 2,
      createdById: owner.id,
    },
  });

  const supplierB = await prisma.supplier.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000c2" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000c2",
      businessId: business.id,
      supplierName: "Toko Sembako Makmur",
      phoneNumber: "081298765432",
      whatsappNumber: "081298765432",
      address: "Jl. Raya Bekasi No. 5",
      province: "DKI Jakarta",
      city: "Jakarta Timur",
      leadTimeDaysMin: 0,
      leadTimeDaysMax: 1,
      createdById: owner.id,
    },
  });

  const supplierC = await prisma.supplier.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000c3" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000c3",
      businessId: business.id,
      supplierName: "UD Barokah Distribusi",
      phoneNumber: "081211112222",
      address: "Jl. Industri No. 3",
      province: "Jawa Barat",
      city: "Bekasi",
      leadTimeDaysMin: 2,
      leadTimeDaysMax: 4,
      createdById: owner.id,
    },
  });

  await prisma.supplierDeliveryArea.deleteMany({
    where: { supplierId: { in: [supplierA.id, supplierB.id, supplierC.id] } },
  });
  await prisma.supplierDeliveryArea.createMany({
    data: [
      {
        businessId: business.id,
        supplierId: supplierA.id,
        province: "DKI Jakarta",
        city: "Jakarta Timur",
      },
      { businessId: business.id, supplierId: supplierB.id, province: "DKI Jakarta" },
      { businessId: business.id, supplierId: supplierC.id, province: "Jawa Barat" },
    ],
  });

  await prisma.shippingRule.upsert({
    where: { supplierId: supplierA.id },
    update: {},
    create: {
      businessId: business.id,
      supplierId: supplierA.id,
      ruleType: "GRATIS_MIN_PEMBELIAN",
      freeShippingMinAmount: 500000,
      flatFee: 25000,
      createdById: owner.id,
    },
  });
  await prisma.shippingRule.upsert({
    where: { supplierId: supplierB.id },
    update: {},
    create: {
      businessId: business.id,
      supplierId: supplierB.id,
      ruleType: "TETAP",
      flatFee: 15000,
      createdById: owner.id,
    },
  });
  // supplierC SENGAJA tidak diberi shipping rule -> menampilkan status
  // "Perlu Konfirmasi" ongkir di halaman Bandingkan (bukan dianggap nol).

  const offerA1 = await prisma.supplierProduct.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000d1" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000d1",
      businessId: business.id,
      supplierId: supplierA.id,
      productId: beras.id,
      packageType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 25,
      contentUnit: "KILOGRAM",
      totalPackageContent: 25,
      baseUnit: "KILOGRAM",
      minPurchasePackages: 1,
      purchaseMultiplePackages: 1,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 2,
      createdById: owner.id,
    },
  });
  await prisma.supplierPrice.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000e1" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000e1",
      businessId: business.id,
      supplierProductId: offerA1.id,
      pricePerPackage: 375000,
      taxStatus: "EXCLUDED",
      taxRateId: taxRate.id,
      taxRateValueSnapshot: taxRate.ratePercent,
      createdById: owner.id,
    },
  });
  await prisma.supplierStock.upsert({
    where: { supplierProductId: offerA1.id },
    update: {},
    create: {
      businessId: business.id,
      supplierProductId: offerA1.id,
      availabilityStatus: "TERSEDIA",
      stockQty: 50,
      updatedById: owner.id,
    },
  });

  const offerA2 = await prisma.supplierProduct.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000d2" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000d2",
      businessId: business.id,
      supplierId: supplierA.id,
      productId: minyak.id,
      packageType: "DUS",
      itemsPerPackage: 12,
      contentPerItem: 1,
      contentUnit: "LITER",
      totalPackageContent: 12,
      baseUnit: "LITER",
      minPurchasePackages: 1,
      purchaseMultiplePackages: 1,
      estimatedDeliveryDaysMin: 1,
      estimatedDeliveryDaysMax: 2,
      createdById: owner.id,
    },
  });
  await prisma.supplierPrice.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000e2" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000e2",
      businessId: business.id,
      supplierProductId: offerA2.id,
      pricePerPackage: 204000,
      taxStatus: "NONE",
      createdById: owner.id,
    },
  });
  await prisma.supplierStock.upsert({
    where: { supplierProductId: offerA2.id },
    update: {},
    create: {
      businessId: business.id,
      supplierProductId: offerA2.id,
      availabilityStatus: "STOK_TERBATAS",
      stockQty: 5,
      updatedById: owner.id,
    },
  });

  const offerB1 = await prisma.supplierProduct.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000d3" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000d3",
      businessId: business.id,
      supplierId: supplierB.id,
      productId: beras.id,
      packageType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 10,
      contentUnit: "KILOGRAM",
      totalPackageContent: 10,
      baseUnit: "KILOGRAM",
      minPurchasePackages: 1,
      purchaseMultiplePackages: 1,
      estimatedDeliveryDaysMin: 0,
      estimatedDeliveryDaysMax: 1,
      createdById: owner.id,
    },
  });
  await prisma.supplierPrice.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000e3" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000e3",
      businessId: business.id,
      supplierProductId: offerB1.id,
      pricePerPackage: 155000,
      taxStatus: "NONE",
      createdById: owner.id,
    },
  });
  await prisma.supplierStock.upsert({
    where: { supplierProductId: offerB1.id },
    update: {},
    create: {
      businessId: business.id,
      supplierProductId: offerB1.id,
      availabilityStatus: "TERSEDIA",
      stockQty: 100,
      updatedById: owner.id,
    },
  });

  const offerC1 = await prisma.supplierProduct.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000d4" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000d4",
      businessId: business.id,
      supplierId: supplierC.id,
      productId: beras.id,
      packageType: "KARUNG",
      itemsPerPackage: 1,
      contentPerItem: 25,
      contentUnit: "KILOGRAM",
      totalPackageContent: 25,
      baseUnit: "KILOGRAM",
      minPurchasePackages: 1,
      purchaseMultiplePackages: 1,
      estimatedDeliveryDaysMin: 2,
      estimatedDeliveryDaysMax: 4,
      createdById: owner.id,
    },
  });
  await prisma.supplierPrice.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000e4" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-0000000000e4",
      businessId: business.id,
      supplierProductId: offerC1.id,
      pricePerPackage: 350000,
      taxStatus: "NONE",
      createdById: owner.id,
    },
  });
  await prisma.supplierStock.upsert({
    where: { supplierProductId: offerC1.id },
    update: {},
    create: {
      businessId: business.id,
      supplierProductId: offerC1.id,
      availabilityStatus: "KOSONG",
      updatedById: owner.id,
    },
  });

  console.log("Seed selesai. Akun contoh untuk pengembangan lokal:");
  console.log("  Pemilik/Admin -> pemilik@contoh.test / ContohSandi123");
  console.log("  Staf          -> staf@contoh.test    / ContohSandi123");
  console.log("");
  console.log("Data contoh untuk dicoba di halaman Bandingkan:");
  console.log("  Produk : Beras Premium (BERAS-PREMIUM), Minyak Goreng (MINYAK-GORENG)");
  console.log("  Coba   : 20 kg, tujuan provinsi 'DKI Jakarta', kota 'Jakarta Timur'");

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
