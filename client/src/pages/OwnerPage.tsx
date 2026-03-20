import { useEffect, useState, type FormEvent } from "react";
import { formatMoney } from "../data/constants";
import { api } from "../lib/api";
import type { OwnerDashboard } from "../types";

type PromotionFormState = {
  name: string;
  amount: string;
};

export default function OwnerPage() {
  const now = new Date();
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month] = useState<number>(now.getMonth() + 1);
  const [year] = useState<number>(now.getFullYear());
  const [promoForm, setPromoForm] = useState<PromotionFormState>({ name: "", amount: "" });
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [slipPreviewSrc, setSlipPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!slipPreviewSrc) {
      return;
    }
    function onKeyDown(e: globalThis.KeyboardEvent): void {
      if (e.key === "Escape") {
        setSlipPreviewSrc(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slipPreviewSrc]);

  async function loadPage(): Promise<void> {
    try {
      setError(null);
      const data = await api.ownerDashboard(month, year);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }

  useEffect(() => {
    void loadPage();
  }, [month, year]);

  async function addPromo(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await api.createPromotion({
      name: promoForm.name,
      amount: Number(promoForm.amount),
      active: true
    });
    setPromoForm({ name: "", amount: "" });
    await loadPage();
  }

  async function togglePromo(id: string, active: boolean): Promise<void> {
    await api.togglePromotion(id, active);
    await loadPage();
  }

  async function deletePromo(id: string): Promise<void> {
    await api.deletePromotion(id);
    await loadPage();
  }

  async function confirmSalePaid(id: string): Promise<void> {
    try {
      setUpdatingSaleId(id);
      await api.updateSaleStatus(id, { status: "paid" });
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment status");
    } finally {
      setUpdatingSaleId(null);
    }
  }

  if (!dashboard) {
    return (
      <main className="owrap">
        <div className="empty"><p>{error || "กำลังโหลด..."}</p></div>
      </main>
    );
  }

  const summary = dashboard.summary || { income: 0, cost: 0, profit: 0, margin: 0 };
  const promotions = dashboard.promotions || [];
  const sales = dashboard.sales || [];

  return (
    <main className="owrap">
      {error && (
        <div className="card" style={{ marginBottom: 12, borderLeft: "4px solid var(--red)" }}>
          <strong>เกิดข้อผิดพลาด:</strong> {error}
        </div>
      )}
      <div className="sgrid">
        <div className="scard c1"><label>รายรับรวม</label><div className="val">{formatMoney(summary.income)}</div></div>
        <div className="scard c2"><label>ต้นทุนรวม</label><div className="val">{formatMoney(summary.cost)}</div></div>
        <div className="scard c3"><label>กำไรสุทธิ</label><div className="val">{formatMoney(summary.profit)}</div></div>
        <div className="scard c4"><label>Margin</label><div className="val">{Number(summary.margin || 0).toFixed(1)}%</div></div>
      </div>

      <section className="card">
        <h3>🏷️ จัดการโปรโมชั่น</h3>
        <form onSubmit={addPromo}>
          <div className="frow">
            <div className="fg">
              <label>ชื่อโปรโมชั่น</label>
              <input value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} />
            </div>
            <div className="fg">
              <label>ส่วนลด</label>
              <input type="number" value={promoForm.amount} onChange={(e) => setPromoForm({ ...promoForm, amount: e.target.value })} />
            </div>
          </div>
          <button className="btnok" type="submit">➕ เพิ่มโปรโมชั่น</button>
        </form>
        <div style={{ marginTop: 16 }}>
          {promotions.map((promo) => (
            <div key={promo.id} className="crow">
              <div className="crow-l">
                <div>
                  <div className="ctxt">{promo.name}</div>
                  <div className="csub">{formatMoney(promo.amount)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => togglePromo(promo.id, !promo.active)}>
                  {promo.active ? "ปิด" : "เปิด"}
                </button>
                <button type="button" onClick={() => deletePromo(promo.id)}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>📋 รายการขาย</h3>
        {sales.length === 0 ? (
          <div className="empty"><p>ไม่มีรายการ</p></div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>ออเดอร์</th>
                  <th>สินค้า</th>
                  <th>ชุด</th>
                  <th>ยอดรวม</th>
                  <th>สถานะ</th>
                  <th>สลิป/ยืนยัน</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.orderNumber}</td>
                    <td>{sale.type}</td>
                    <td>{sale.qty}</td>
                    <td>{formatMoney(sale.grandTotal)}</td>
                    <td>{sale.payStatus}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                        {sale.paymentSlipImage ? (
                          <button
                            type="button"
                            className="btnok"
                            style={{ padding: "6px 12px", fontSize: 13 }}
                            onClick={() => {
                              setSlipPreviewSrc(sale.paymentSlipImage!);
                            }}
                          >
                            ดูสลิป
                          </button>
                        ) : (
                          <span style={{ opacity: 0.7 }}>ไม่มีสลิป</span>
                        )}
                        <button
                          type="button"
                          className="btnok"
                          disabled={sale.payStatus === "paid" || !sale.paymentSlipImage || updatingSaleId === sale.id}
                          onClick={() => {
                            void confirmSalePaid(sale.id);
                          }}
                        >
                          {sale.payStatus === "paid" ? "ชำระแล้ว" : updatingSaleId === sale.id ? "กำลังอัปเดต..." : "ยืนยันชำระ"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {slipPreviewSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ดูสลิปโอนเงิน"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: "pointer"
          }}
          onClick={() => {
            setSlipPreviewSrc(null);
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "min(920px, 96vw)",
              maxHeight: "92vh",
              cursor: "default",
              background: "#111",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 12px 48px rgba(0,0,0,0.45)"
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <img
              src={slipPreviewSrc}
              alt="สลิปโอนเงิน"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "calc(92vh - 56px)",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: 8
              }}
            />
            <button
              type="button"
              className="btnok"
              style={{ marginTop: 10, width: "100%" }}
              onClick={() => {
                setSlipPreviewSrc(null);
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
