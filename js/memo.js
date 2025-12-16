// js/memo.js
// 공유 메모 및 시스템 로그 관리

import { 
    collection, query, orderBy, limit, addDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, COLLECTIONS } from "./config.js";

// 1. 메모 전송 (사람 or 시스템)
export async function sendMemo(text, userEmail, isSystem = false) {
    try {
        await addDoc(collection(db, COLLECTIONS.MEMOS), {
            text: text,
            sender: isSystem ? 'System' : userEmail.split('@')[0], // 이메일 앞자리만 사용
            is_system: isSystem,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error("메모 전송 실패", e);
    }
}

// 2. 실시간 메모 구독 (최근 50개만)
export function subscribeToMemos(callback) {
    const q = query(
        collection(db, COLLECTIONS.MEMOS),
        orderBy("created_at", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const memos = [];
        snapshot.forEach(doc => {
            memos.push({ id: doc.id, ...doc.data() });
        });
        // 최신순으로 오므로, 화면엔 역순(과거->최신)으로 보여주기 위해 뒤집음
        callback(memos.reverse());
    });
}

// 3. 안 읽은 메시지 개수 계산
export function countUnreadMemos(memos) {
    const lastReadTime = localStorage.getItem('lastMemoReadTime');
    if (!lastReadTime) return memos.length; // 한 번도 안 봤으면 전체가 안 읽은 것

    // 마지막 읽은 시간보다 뒤에 온 메시지 개수
    return memos.filter(m => m.created_at > lastReadTime).length;
}

// 4. 읽음 처리 (탭 눌렀을 때)
export function markAsRead() {
    localStorage.setItem('lastMemoReadTime', new Date().toISOString());
}