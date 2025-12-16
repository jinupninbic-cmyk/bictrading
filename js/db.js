// js/db.js
// 데이터베이스(Firestore) 관련 핵심 로직 (비용 절감 적용됨)

import { 
    collection, query, where, onSnapshot, 
    doc, updateDoc, writeBatch, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, COLLECTIONS } from "./config.js";

// 1. 대기 중(Pending)인 발주서만 실시간 감시 (비용 절감 핵심!)
// 화면에 '대기' 탭을 띄워놓아도 완료된 10,000개 데이터는 읽지 않음.
export function subscribeToPendingOrders(callback) {
    const q = query(
        collection(db, COLLECTIONS.ORDERS),
        where("status", "==", "Pending") 
    );

    return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
    });
}


// 2. 완료 탭용 구독 (다시 비용 절감 모드로 복귀!)
export function subscribeToCompletedOrders(callback) {
    // 🔥 [복구] "완료된 것만 가져와!" (돈 아끼기)
    const q = query(
        collection(db, COLLECTIONS.ORDERS),
        where("status", "==", "Completed") 
        // 필요한 경우 정렬 추가: orderBy("created_at", "desc")
        // 단, where와 orderBy를 같이 쓰려면 파이어베이스 콘솔에서 색인(Index) 설정이 필요할 수 있음
    );

    return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
    });
}

// 3. 수량 수정
export async function updateOrderQty(docId, newQty) {
    const ref = doc(db, COLLECTIONS.ORDERS, docId);
    await updateDoc(ref, { picked_qty: parseInt(newQty) });
}

// 4. 발주 완료 처리 (Pending -> Completed)
export async function completeOrder(docId, userId) {
    const ref = doc(db, COLLECTIONS.ORDERS, docId);
    await updateDoc(ref, {
        status: 'Completed',
        completed_at: new Date().toISOString(),
        completed_by: userId
    });
}

// 5. 되돌리기 (Completed -> Pending)
export async function revertOrder(docId) {
    const ref = doc(db, COLLECTIONS.ORDERS, docId);
    await updateDoc(ref, { 
        status: 'Pending',
        completed_at: null 
    });
}

// 6. 데이터 일괄 업로드 (엑셀 -> DB)
export async function uploadBatchOrders(orderList) {
    const batch = writeBatch(db);
    const colRef = collection(db, COLLECTIONS.ORDERS);

    orderList.forEach(order => {
        const newRef = doc(colRef); // 새 ID 자동 생성
        batch.set(newRef, order);
    });

    await batch.commit(); // 한 번에 전송
}

// 7. 전체 데이터 삭제 (관리자용, 주의!)
export async function clearAllOrders() {
    const colRef = collection(db, COLLECTIONS.ORDERS);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    return snapshot.size;
}
// [추가] 특정 발주서(order_id) 통째로 삭제하기
export async function deleteOrderByID(orderId) {
    const q = query(
        collection(db, COLLECTIONS.ORDERS),
        where("order_id", "==", orderId)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0; // 지울 게 없으면 0 리턴

    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit(); // 한 번에 삭제 실행
    return snapshot.size; // 몇 개 지웠는지 개수 반환
}