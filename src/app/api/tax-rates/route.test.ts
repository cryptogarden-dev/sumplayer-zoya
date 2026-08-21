import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSession } from "@/tests/session-mock";
import { BusinessUserRole } from "@generated/prisma/browser";

const { getCurrentSessionMock, createTaxRateMock, listTaxRatesMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  createTaxRateMock: vi.fn(),
  listTaxRatesMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: getCurrentSessionMock }));
vi.mock("@/lib/server/repositories/tax-rate-repository", () => ({
  createTaxRate: createTaxRateMock,
  listTaxRates: listTaxRatesMock,
}));

const { GET, POST } = await import("@/app/api/tax-rates/route");

afterEach(() => {
  vi.clearAllMocks();
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/tax-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("hak akses: POST /api/tax-rates (kelola tarif pajak khusus Pemilik/Admin)", () => {
  it("menolak permintaan tanpa sesi login (401)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null);
    const response = await POST(jsonRequest({ name: "PPN 11%", ratePercent: 11 }));
    expect(response.status).toBe(401);
  });

  it("menolak Staf membuat tarif pajak (403)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.staff));
    const response = await POST(jsonRequest({ name: "PPN 11%", ratePercent: 11 }));
    expect(response.status).toBe(403);
    expect(createTaxRateMock).not.toHaveBeenCalled();
  });

  it("mengizinkan Pemilik/Admin membuat tarif pajak (201)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.owner_admin));
    createTaxRateMock.mockResolvedValueOnce({ id: "tax-1", name: "PPN 11%", ratePercent: "11" });

    const response = await POST(jsonRequest({ name: "PPN 11%", ratePercent: 11 }));
    expect(response.status).toBe(201);
    expect(createTaxRateMock).toHaveBeenCalledWith("business-1", "user-1", {
      name: "PPN 11%",
      ratePercent: 11,
      isDefault: false,
    });
  });

  it("Staf tetap boleh MEMBACA daftar tarif pajak (200)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.staff));
    listTaxRatesMock.mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/tax-rates"));
    expect(response.status).toBe(200);
  });
});
