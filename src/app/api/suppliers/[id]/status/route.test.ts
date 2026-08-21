import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSession } from "@/tests/session-mock";
import { BusinessUserRole } from "@generated/prisma/browser";

const { getCurrentSessionMock, setSupplierActiveMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  setSupplierActiveMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: getCurrentSessionMock }));
vi.mock("@/lib/server/repositories/supplier-repository", () => ({
  setSupplierActive: setSupplierActiveMock,
}));

const { PATCH } = await import("@/app/api/suppliers/[id]/status/route");

afterEach(() => {
  vi.clearAllMocks();
});

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/suppliers/supplier-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "supplier-1" });

describe("hak akses: PATCH /api/suppliers/[id]/status (nonaktifkan setara 'hapus', khusus Pemilik/Admin)", () => {
  it("menolak Staf menonaktifkan supplier (403)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.staff));
    const response = await PATCH(patchRequest({ isActive: false }), { params });
    expect(response.status).toBe(403);
    expect(setSupplierActiveMock).not.toHaveBeenCalled();
  });

  it("mengizinkan Pemilik/Admin menonaktifkan supplier (200)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.owner_admin));
    setSupplierActiveMock.mockResolvedValueOnce(true);

    const response = await PATCH(patchRequest({ isActive: false }), { params });
    expect(response.status).toBe(200);
    expect(setSupplierActiveMock).toHaveBeenCalledWith("business-1", "supplier-1", false);
  });

  it("mengembalikan 404 bila supplier tidak ditemukan di bisnis ini", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(buildSession(BusinessUserRole.owner_admin));
    setSupplierActiveMock.mockResolvedValueOnce(false);

    const response = await PATCH(patchRequest({ isActive: false }), { params });
    expect(response.status).toBe(404);
  });

  it("menolak tanpa sesi (401)", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null);
    const response = await PATCH(patchRequest({ isActive: false }), { params });
    expect(response.status).toBe(401);
  });
});
