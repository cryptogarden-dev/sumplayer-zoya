import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSession } from "@/tests/session-mock";
import { BusinessUserRole } from "@generated/prisma/browser";

const { getCurrentSessionMock, createOfferMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  createOfferMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: getCurrentSessionMock }));
vi.mock("@/lib/server/repositories/supplier-product-repository", () => ({
  createOffer: createOfferMock,
  listOffers: vi.fn(),
}));

const { POST } = await import("@/app/api/supplier-products/route");

afterEach(() => {
  vi.clearAllMocks();
});

const validBody = {
  supplierId: "11111111-1111-4111-8111-111111111111",
  productId: "22222222-2222-4222-8222-222222222222",
  packageType: "KARUNG",
  itemsPerPackage: 1,
  contentPerItem: 25,
  contentUnit: "KILOGRAM",
  price: { pricePerPackage: 375000, taxStatus: "NONE" },
  stock: { availabilityStatus: "TERSEDIA" },
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/supplier-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("hak akses: POST /api/supplier-products (Staf DAN Pemilik/Admin boleh membuat penawaran)", () => {
  it("mengizinkan Staf membuat penawaran (201)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.staff));
    createOfferMock.mockResolvedValueOnce({ id: "offer-1" });

    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(201);
  });

  it("mengizinkan Pemilik/Admin membuat penawaran (201)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.owner_admin));
    createOfferMock.mockResolvedValueOnce({ id: "offer-2" });

    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(201);
  });

  it("menolak tanpa sesi (401)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null);
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("menolak body tidak valid (400) sebelum memanggil repository", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.owner_admin));
    const response = await POST(postRequest({ ...validBody, itemsPerPackage: -1 }));
    expect(response.status).toBe(400);
    expect(createOfferMock).not.toHaveBeenCalled();
  });
});
