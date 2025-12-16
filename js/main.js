// js/main.js
// 애플리케이션의 진입점 (Entry Point) & 상태 관리

import { monitorAuthState, loginUser, logoutUser } from "./auth.js";
import { subscribeToPendingOrders, subscribeToCompletedOrders, updateOrderQty, completeOrder, revertOrder, uploadBatchOrders, clearAllOrders, deleteOrderByID } from "./db.js";
import { showLoginScreen, showAppScreen, toggleLoading, updateTabStyle, renderList } from "./ui.js";
import { parseExcelFile, exportOrdersToExcel } from "./excel.js";
import { showToast, showUndoToast, getTodayStr, getPastDateStr } from "./utils.js";
import { sendMemo, subscribeToMemos, countUnreadMemos, markAsRead } from "./memo.js";

// ============================================================
// 1. 상태 관리
// ============================================================
let currentUser = null;
let currentTab = 'orders';
let cachedOrders = [];
let cachedMemos = []; 
let unsubscribeOrders = null;
let unsubscribeMemos = null;
let searchKeyword = '';
let filterStartDate = getPastDateStr(2);
let filterEndDate = getTodayStr();

// ============================================================
// 2. 초기화 및 이벤트 리스너
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const startEl = document.getElementById('start-date');
    const endEl = document.getElementById('end-date');
    if(startEl) startEl.value = filterStartDate;
    if(endEl) endEl.value = filterEndDate;

    monitorAuthState(
        (user) => {
            currentUser = user;
            showAppScreen(user.email);
            setupRealtimeListener(); 
            setupMemoListener();
        },
        () => {
            currentUser = null;
            if (unsubscribeOrders) unsubscribeOrders();
            if (unsubscribeMemos) unsubscribeMemos();
            showLoginScreen();
            toggleLoading(false);
        }
    );

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        toggleLoading(true);
        const result = await loginUser(email, password);
        toggleLoading(false);
        if (!result.success) document.getElementById('login-error').textContent = "로그인 실패";
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        if(confirm("로그아웃?")) await logoutUser();
    });

    document.getElementById('excel-upload').addEventListener('change', handleFileUpload);

    ['orders', 'picking', 'completed', 'memo'].forEach(tab => {
        const el = document.getElementById(`tab-${tab}`);
        if(el) el.addEventListener('click', () => switchTab(tab));
    });
    
    document.getElementById('search-keyword').addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderApp();
    });
    
    const handleDateChange = () => {
        filterStartDate = document.getElementById('start-date').value;
        filterEndDate = document.getElementById('end-date').value;
        renderApp();
    };
    if(startEl) startEl.addEventListener('change', handleDateChange);
    if(endEl) endEl.addEventListener('change', handleDateChange);
});

// ============================================================
// 3. 로직 (탭, 데이터, 렌더링)
// ============================================================

function switchTab(newTab) {
    if (currentTab === newTab) return;
    currentTab = newTab;
    updateTabStyle(currentTab);

    if (newTab === 'memo') {
        markAsRead();
        updateBadge();
    }
    
    if (newTab !== 'memo') {
        setupRealtimeListener();
    }
    
    renderApp();
    renderButtons();
}

function setupRealtimeListener() {
    if (unsubscribeOrders) unsubscribeOrders();
    if (currentTab === 'memo') return;

    toggleLoading(true);
    const isCompletedTab = (currentTab === 'completed');
    
    const onDataReceived = (orders) => {
        cachedOrders = orders;
        renderApp();
        toggleLoading(false);
    };

    if (isCompletedTab) {
        unsubscribeOrders = subscribeToCompletedOrders(onDataReceived);
    } else {
        unsubscribeOrders = subscribeToPendingOrders(onDataReceived);
    }
}

function setupMemoListener() {
    if (unsubscribeMemos) unsubscribeMemos();
    
    unsubscribeMemos = subscribeToMemos((memos) => {
        cachedMemos = memos;
        updateBadge(); 
        if (currentTab === 'memo') {
            renderMemoList(); 
            markAsRead();     
        }
    });
}

function updateBadge() {
    if (currentTab === 'memo') {
        document.getElementById('badge-memo').classList.add('hidden');
        return;
    }
    const count = countUnreadMemos(cachedMemos);
    const badge = document.getElementById('badge-memo');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderApp() {
    if (currentTab === 'memo') {
        renderMemoList();
        return;
    }

    let filtered = cachedOrders;
    if (searchKeyword) {
        filtered = filtered.filter(o => 
            o.order_id.toLowerCase().includes(searchKeyword) || 
            o.product_name.toLowerCase().includes(searchKeyword) ||
            o.jan_code.includes(searchKeyword)
        );
    }
    if (currentTab === 'completed') {
        filtered = filtered.filter(o => {
            const dateStr = (o.completed_at || o.created_at).split('T')[0];
            return dateStr >= filterStartDate && dateStr <= filterEndDate;
        });
    }
    renderList('list-container', currentTab, filtered);
}

function renderMemoList() {
    const container = document.getElementById('list-container');
    container.innerHTML = `<div class="flex flex-col space-y-3 pb-4"></div>`;
    const listDiv = container.firstElementChild;

    if (cachedMemos.length === 0) {
        listDiv.innerHTML = `<div class="text-center text-gray-400 py-10 text-sm">메시지가 없습니다.<br>첫 메시지를 남겨보세요!</div>`;
        return;
    }

    cachedMemos.forEach(memo => {
        const isSystem = memo.is_system;
        const isMe = (memo.sender === currentUser.email.split('@')[0]);
        const timeStr = memo.created_at.substring(11, 16); 
        
        if (isSystem) {
            listDiv.innerHTML += `
                <div class="flex justify-center my-3">
                    <div class="bg-gray-400/30 text-gray-600 text-[11px] font-bold px-4 py-1.5 rounded-full shadow-sm flex items-center space-x-2">
                        <span>${memo.text}</span>
                        <span class="text-[9px] text-gray-500 opacity-70 border-l border-gray-400 pl-2 ml-1">${timeStr}</span>
                    </div>
                </div>`;
        } else {
            const align = isMe ? 'justify-end' : 'justify-start';
            const bg = isMe ? 'bg-blue-100 text-blue-900' : 'bg-white border border-gray-200 text-gray-800';
            const senderName = isMe ? '' : `<span class="text-[10px] text-gray-400 block mb-0.5 ml-1">${memo.sender}</span>`;
            
            listDiv.innerHTML += `
                <div class="flex ${align}">
                    <div class="max-w-[80%]">
                        ${senderName}
                        <div class="${bg} px-3 py-2 rounded-xl shadow-sm text-sm break-words relative">
                            ${memo.text}
                            <span class="text-[9px] text-gray-400 absolute bottom-0.5 right-2 opacity-70">${timeStr}</span>
                        </div>
                    </div>
                </div>`;
        }
    });
    
    // 🔥 스크롤 버그 수정 (확실하게 내림)
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
        if (listDiv && listDiv.lastElementChild) {
            listDiv.lastElementChild.scrollIntoView({ behavior: "auto", block: "end" });
        }
    }, 100);
}


function renderButtons() {
    const bottomBar = document.getElementById('bottom-bar');
    if (!bottomBar) return; // 안전장치
    bottomBar.innerHTML = '';

    if (currentTab === 'memo') {
        bottomBar.innerHTML = `
            <div class="flex w-full space-x-2">
                <input type="text" id="memo-input" placeholder="메시지 입력..." class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" onkeypress="if(event.key==='Enter') window.app_sendMemo()">
                <button onclick="window.app_sendMemo()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition">전송</button>
            </div>
        `;
        setTimeout(() => document.getElementById('memo-input')?.focus(), 100);
    } else if (currentTab === 'completed') {
        bottomBar.innerHTML = `
            <button onclick="window.app_downloadFilteredTSV()" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-md flex justify-center items-center transition active:scale-95">
                <span>📤 조회 항목 일괄 내보내기</span>
            </button>
        `;
    } else {
        bottomBar.innerHTML = `
            <button onclick="window.app_clearAllData()" class="flex-none bg-red-100 text-red-600 py-3 px-4 rounded-xl font-bold text-sm hover:bg-red-200 transition border border-red-200 shrink-0 shadow-sm active:scale-95" title="모든 데이터 삭제">🗑️</button>
            <button onclick="document.getElementById('excel-upload').click()" class="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition flex justify-center items-center shadow-md active:scale-95"><span class="mr-2">📂</span> 발주서 업로드</button>
            <button onclick="window.app_switchTab('completed')" class="flex-none bg-blue-50 text-blue-700 px-4 py-3 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition shrink-0 shadow-sm active:scale-95">완료 내역 &rarr;</button>
        `;
    }
}

// ============================================================
// 4. 전역 함수
// ============================================================
window.app_sendMemo = async () => {
    const input = document.getElementById('memo-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await sendMemo(text, currentUser.email);
};

window.app_switchTab = (tab) => switchTab(tab);
window.app_updateQty = async (id, val) => { try { await updateOrderQty(id, val); } catch(e) { console.error(e); } };
window.app_updateQtyManual = async (id) => { 
    const val = document.getElementById(`qty-done-${id}`).value;
    try { await updateOrderQty(id, val); showToast("수량 수정 완료"); } catch(e) { alert("오류"); }
};

window.app_completeOrder = async (id, btn) => {
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>`;
    
    try {
        const targetItem = cachedOrders.find(o => o.id === id);
        if (!targetItem) throw new Error("Item not found");

        await completeOrder(id, currentUser.uid);
        
        const siblings = cachedOrders.filter(o => o.order_id === targetItem.order_id);
        const pendingSiblings = siblings.filter(o => o.id !== id && o.status !== 'Completed');

        if (pendingSiblings.length === 0) {
            const clientName = targetItem.order_id.split('-').pop(); 
            const orderNum = targetItem.order_id.split('-')[0];      
            const msg = `📦 [피킹완료] ${orderNum} ${clientName} - 전체 피킹 완료`;
            sendMemo(msg, 'System', true);
        }

        showUndoToast(() => revertOrder(id));

    } catch (error) {
        console.error(error);
        alert("처리 실패");
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
};

window.app_downloadSingleOrder = (orderId) => {
    const items = cachedOrders.filter(o => o.order_id === orderId);
    exportOrdersToExcel(orderId, items);
    
    // 🔥 [핵심] 여기서 UI 변경을 트리거함 (ui.js가 최신 버전이어야 작동)
    if (window.ui_markDownloaded) {
        window.ui_markDownloaded(orderId);
    }

    const clientName = orderId.split('-').pop();
    const userName = currentUser.email.split('@')[0];
    const msg = `✅ [확인] ${userName}님이 [${orderId}] 완료 리스트를 확인했습니다.`;
    sendMemo(msg, 'System', true);
};

window.app_downloadFilteredTSV = () => {
    let filtered = cachedOrders.filter(o => { const d=(o.completed_at||o.created_at).split('T')[0]; return d>=filterStartDate && d<=filterEndDate; });
    if(searchKeyword) filtered = filtered.filter(o => o.order_id.toLowerCase().includes(searchKeyword));
    if(filtered.length==0) return alert("데이터 없음");
    const ids = [...new Set(filtered.map(o=>o.order_id))];
    if(confirm(`${ids.length}건 다운로드?`)) {
        ids.forEach(id => exportOrdersToExcel(id, filtered.filter(o=>o.order_id===id)));
        const userName = currentUser.email.split('@')[0];
        const msg = `📂 [일괄확인] ${userName}님이 총 ${ids.length}건의 완료 리스트를 다운로드했습니다.`;
        sendMemo(msg, 'System', true);
    }
};

window.app_revertOrder = async (id) => { if(!confirm("복구하시겠습니까?")) return; try { await revertOrder(id); showToast("복구됨"); } catch(e) {} };
window.app_clearAllData = async () => { if(prompt("초기화하려면 '초기화' 입력")!=="초기화") return; toggleLoading(true); try { await clearAllOrders(); alert("삭제 완료"); window.location.reload(); } catch(e) { alert("실패"); } finally { toggleLoading(false); } };
async function handleFileUpload(e) { 
    const file = e.target.files[0]; if (!file) return; toggleLoading(true);
    try { const list = await parseExcelFile(file); await uploadBatchOrders(list); alert("업로드 완료"); e.target.value=''; switchTab('orders'); } catch(e) { alert(e.message); } finally { toggleLoading(false); }
}
window.app_deleteOrderGroup = async (id) => {
    if(!confirm(`[ ${id} ] 삭제하시겠습니까?`)) return; toggleLoading(true);
    try { const c = await deleteOrderByID(id); alert(`삭제됨 (${c}건)`); } catch(e) { alert(e.message); } finally { toggleLoading(false); }
};

renderButtons();