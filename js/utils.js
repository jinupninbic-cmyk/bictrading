// js/utils.js
// 공통 유틸리티 (알림창 클릭 간섭 버그 수정됨)

// 1. 토스트 알림 띄우기
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const msgEl = document.getElementById('toast-message');
    
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    
    // type에 따른 아이콘 색상 변경 (선택사항)
    const toastIcon = toast.querySelector('svg');
    if (toastIcon) {
        if (type === 'error') {
            toastIcon.classList.remove('text-green-400');
            toastIcon.classList.add('text-red-400');
        } else {
            toastIcon.classList.remove('text-red-400');
            toastIcon.classList.add('text-green-400');
        }
    }
    
    // 나타날 때: invisible 제거
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none', 'invisible');
    
    // 3초 뒤 사라짐
    setTimeout(() => {
        // 사라질 때: invisible 추가 (클릭 간섭 원천 차단)
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none', 'invisible');
    }, 3000);
}

// 2. 실행 취소 토스트 띄우기
let undoTimeout = null;
export function showUndoToast(callback) {
    const toast = document.getElementById('undo-toast');
    const undoBtn = document.getElementById('undo-btn');
    
    if (!toast) return;

    if (undoTimeout) clearTimeout(undoTimeout);

    undoBtn.onclick = () => {
        callback(); 
        // 클릭 후 즉시 숨김
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none', 'invisible');
    };

    // 나타날 때: invisible 제거
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none', 'invisible');

    // 3초 뒤 사라짐
    undoTimeout = setTimeout(() => {
        // 사라질 때: invisible 추가
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none', 'invisible');
    }, 3000);
}

// 3. 색상 생성
export function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash % 360)}, 70%, 90%)`;
}

export function stringToDarkColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash % 360)}, 60%, 40%)`;
}

// 4. 날짜 관련
export function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export function getPastDateStr(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}