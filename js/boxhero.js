// js/boxhero.js
export async function getStockByBarcode(barcode) {
  const cleanBarcode = String(barcode || "").trim();
  if (!cleanBarcode) return null;

  const url = `/.netlify/functions/stock?barcode=${encodeURIComponent(cleanBarcode)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // 서버/업스트림 에러 처리
    if (!response.ok) {
      console.error("Stock API error:", response.status, data);
      return null;
    }

  const items = Array.isArray(data?.items) ? data.items : [];
    
    // [디버깅용 로그 추가] - 백엔드에서 뭘 받아왔는지 눈으로 확인해
    console.log(`[BoxHero] 검색된 아이템 수: ${items.length}`, items); 

    if (items.length === 0) return null;

    const targetItem = items.find((item) => {
      const b1 = item?.barcode != null ? String(item.barcode).trim() : null;
      const bArr = Array.isArray(item?.barcodes) ? item.barcodes.map((b) => String(b).trim()) : [];
      return b1 === cleanBarcode || bArr.includes(cleanBarcode);
    });

    if (!targetItem) return null;

    // 재고 필드도 케이스별로 흡수
    const qty =
      Number(targetItem.quantity ?? targetItem.stock ?? targetItem.total_quantity ?? 0) || 0;

    const safeQty =
      Number(targetItem.safe_stock ?? targetItem.safeStock ?? targetItem.safe_quantity ?? 0) || 0;

    return {
      name: targetItem.name ?? targetItem.product_name ?? "",
      qty,
      safe_qty: safeQty,
    };
  } catch (error) {
    console.error("재고 데이터 해석 오류:", error);
    throw error;
  }
}
