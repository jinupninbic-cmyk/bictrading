// js/excel.js
// 엑셀 파일 읽기(Import) 및 쓰기(Export) 로직 (순서 유지 + 총 수량 기억 기능 추가)

export function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                let tempOrders = [];
                // 1. 일단 데이터 파싱
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row[0]) continue; 

                    const date = String(row[0] || '').trim();
                    const time = String(row[1] || '').trim();
                    const client = String(row[2] || '').trim();
                    const jan = String(row[3] || '').trim();
                    const brand = String(row[4] || '').trim();
                    const product = String(row[5] || '').trim();
                    const price = row[6] || 0;
                    
                    // 🔥 [수정] LOT를 숫자가 아닌 무조건 '문자열'로 받음 (12/36 같은 포맷 유지)
                    const lot = (row[7] !== undefined && row[7] !== null) ? String(row[7]).trim() : '1';
                    
                    const qty = row[8] || 0;
                    const priceType = String(row[9] || '').trim();
                    const clientRemark = String(row[10] || '').trim();
                    const remark = String(row[11] || '').trim();

                    const orderId = `${date}${time}-${client}`;

                    tempOrders.push({
                        order_id: orderId,
                        jan_code: jan,
                        product_name: product,
                        brand: brand,
                        price: price,
                        lot_qty: lot,
                        ordered_qty: qty,
                        price_type: priceType,
                        client_remark: clientRemark,
                        remark: remark,
                        status: 'Pending', 
                        created_at: new Date().toISOString(),
                        original_row_index: i 
                    });
                }

                // 2. 그룹별 총 수량(Total Count) 계산해서 심어주기
                const counts = {};
                tempOrders.forEach(o => {
                    counts[o.order_id] = (counts[o.order_id] || 0) + 1;
                });

                // 3. 계산된 총 수량을 각 아이템에 저장
                const finalOrders = tempOrders.map(o => ({
                    ...o,
                    total_group_count: counts[o.order_id] 
                }));

                resolve(finalOrders);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

export function exportOrdersToExcel(orderId, items) {
    if (!items || items.length === 0) return;

    items.sort((a, b) => {
        const idxA = (a.original_row_index !== undefined) ? a.original_row_index : Infinity;
        const idxB = (b.original_row_index !== undefined) ? b.original_row_index : Infinity;
        return idxA - idxB;
    });

    const parts = orderId.split('-');
    const orderNumber = parts[0] || orderId;
    const clientName = parts.slice(1).join('-') || '업체명미지정';
    
    const rows = [
        ['발주번호', '업체명', 'JAN코드', '브랜드', '상품명', '단가', '로트', '희망수량', '실재확보수량']
    ];

    items.forEach(item => {
        const picked = (item.picked_qty !== undefined) ? item.picked_qty : item.ordered_qty;
        rows.push([
            orderNumber,
            clientName,
            item.jan_code || '',
            item.brand || '',
            item.product_name || '',
            item.price || 0,
            item.lot_qty || 1,
            item.ordered_qty || 0,
            picked || 0
        ]);
    });

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(wb, ws, '출고리스트');

    let fileName = `${orderNumber}_${clientName}.xlsx`;
    fileName = fileName.replace(/[\\\/:*?"<>|]/g, '_'); 

    window.XLSX.writeFile(wb, fileName);
}