// js/ui.js
// 화면 렌더링 및 UI 조작 (버튼 찌그러짐 방지 + 텍스트 줄바꿈 적용)

import { stringToColor, stringToDarkColor, showToast } from "./utils.js";

// ============================================================
// 1. 화면 전환 및 로딩 관리
// ============================================================

export function toggleLoading(isLoading) {
    const el = document.getElementById('loading-state');
    if (el) el.style.display = isLoading ? 'flex' : 'none';
}

export function showLoginScreen() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

export function showAppScreen(userEmail) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-info').textContent = userEmail;
}

export function updateTabStyle(currentTab) {
    const tabs = ['orders', 'picking', 'completed', 'memo'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (!el) return;

        if (t === currentTab) {
            let color = (t === 'completed') ? 'green' : 'blue';
            if (t === 'memo') color = 'gray';
            el.className = `flex-1 py-3 text-center text-sm font-bold cursor-pointer transition-colors text-${color}-700 border-b-4 border-${color}-700 bg-${color}-50 relative`;
        } else {
            el.className = `flex-1 py-3 text-center text-sm font-bold cursor-pointer transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-50 relative`;
        }
    });

    const filterPanel = document.getElementById('static-filter-panel');
    if (filterPanel) {
        currentTab === 'completed' ? filterPanel.classList.remove('hidden') : filterPanel.classList.add('hidden');
    }
}

// ============================================================
// 2. 메인 리스트 렌더링
// ============================================================

export function renderList(containerId, tabMode, orders) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!orders || orders.length === 0) {
        container.innerHTML = emptyStateHTML('데이터가 없습니다.');
        return;
    }

    if (tabMode === 'orders') {
        renderByOrderGroup(container, orders);
    } else if (tabMode === 'picking') {
        renderAllPicking(container, orders);
    } else if (tabMode === 'completed') {
        renderCompletedList(container, orders);
    }
}

// [Mode 1] 발주서별 보기
function renderByOrderGroup(container, orders) {
    const groups = {};
    orders.forEach(o => { if (!groups[o.order_id]) groups[o.order_id] = []; groups[o.order_id].push(o); });

    Object.keys(groups).sort().forEach((orderId) => {
        const items = groups[orderId];
        const isExpanded = window.expandedGroups && window.expandedGroups.has(orderId);

        const totalCount = items.length;
        const doneCount = items.filter(i => i.status === 'Completed').length;
        const isAllDone = (totalCount > 0 && totalCount === doneCount);

        let badgeHTML = '';
        let bgClass = '';
        if (isAllDone) {
            badgeHTML = `<span class="shrink-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span>`;
            bgClass = 'bg-green-50';
        } else if (doneCount > 0) {
            badgeHTML = `<span class="shrink-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">작업중</span>`;
            bgClass = 'bg-white';
        } else {
            badgeHTML = `<span class="shrink-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ORDER</span>`;
            bgClass = 'bg-white';
        }

        const div = document.createElement('div');
        div.className = 'mb-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden ' + bgClass;

        const header = `
            <div onclick="window.ui_toggleAccordion('${orderId}')" class="px-4 py-4 border-b border-gray-200 flex flex-col cursor-pointer hover:bg-gray-100 transition select-none">
                <div class="flex justify-between items-center w-full">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        ${badgeHTML}
                        <div class="flex flex-col flex-1 min-w-0">
                            <h3 class="font-bold text-gray-800 text-sm truncate">${orderId}</h3>
                            <span class="text-[10px] text-gray-500 font-bold">
                                ${doneCount} / ${totalCount} 완료 (${Math.round((doneCount / totalCount) * 100)}%)
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-3 shrink-0 ml-2">
                        <button onclick="event.stopPropagation(); window.app_deleteOrderGroup('${orderId}')" class="p-1.5 rounded-md bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition shadow-sm group" title="이 발주서 삭제">
                            <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        
                        <svg id="icon-${orderId}" class="w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                ${items[0].client_remark ? `<div class="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">🚨 ${items[0].client_remark}</div>` : ''}
            </div>
            <div id="content-${orderId}" class="divide-y divide-gray-100 ${isExpanded ? '' : 'hidden'} bg-white">
                ${items.sort((a, b) => a.product_name.localeCompare(b.product_name)).map(item => createRowHTML(item)).join('')}
            </div>
        `;
        div.innerHTML = header;
        container.appendChild(div);
    });
}

// [Mode 2] 전체 피킹
function renderAllPicking(container, orders) {
    const brandGroups = {};
    orders.forEach(item => {
        const brand = item.brand || '기타';
        if (!brandGroups[brand]) brandGroups[brand] = [];
        brandGroups[brand].push(item);
    });

    Object.keys(brandGroups).sort().forEach(brand => {
        const items = brandGroups[brand];
        const brandColor = stringToDarkColor(brand);
        const bgColor = stringToColor(brand);
        const brandId = `brand-${brand.replace(/\s/g, '')}`;
        const isCollapsed = window.collapsedBrands && window.collapsedBrands.has(brandId);

        const div = document.createElement('div');
        div.className = 'mb-6 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 relative z-0';

        const productGroups = {};
        items.forEach(item => {
            if (!productGroups[item.jan_code]) productGroups[item.jan_code] = { ...item, totalReq: 0, list: [] };
            productGroups[item.jan_code].list.push(item);
            productGroups[item.jan_code].totalReq += (item.ordered_qty || 0);
        });

        let productsHTML = Object.values(productGroups)
            .sort((a, b) => a.product_name.localeCompare(b.product_name))
            .map(group => `
                <div class="mb-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 bg-indigo-50 border-b border-gray-200 flex justify-between items-start"
                         onmousedown="window.ui_startPress('${group.jan_code}')" 
                         onmouseup="window.ui_cancelPress()" 
                         ontouchstart="window.ui_startPress('${group.jan_code}')" 
                         ontouchend="window.ui_cancelPress()">
                        <div class="overflow-hidden mr-2 flex-1">
                            <h4 class="font-bold text-gray-800 text-sm leading-snug whitespace-normal break-words">${group.product_name}</h4>
                            <div class="flex items-center space-x-2 mt-1">
                                <span class="text-[10px] font-bold bg-white text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">${group.jan_code}</span>
                                <span class="text-[10px] text-gray-500">LOT: ${group.lot_qty || 1}</span>
                            </div>
                        </div>
                        <div class="text-right shrink-0 ml-2">
                            <span class="block text-[10px] text-gray-500 font-bold uppercase">Total</span>
                            <span class="block text-xl font-black text-indigo-700 leading-none">${group.totalReq}</span>
                        </div>
                    </div>
                    <div class="divide-y divide-gray-50">
                        ${group.list.map(item => {
                const clientName = item.order_id.split('-').pop(); // 업체명 추출
                return createPickingRowHTML(item, clientName);
            }).join('')}
                    </div>
                </div>
            `).join('');

        const header = `
            <div onclick="window.ui_toggleBrand('${brandId}')" class="px-5 py-4 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none transition hover:opacity-90 sticky top-0 z-10" style="background-color: ${bgColor};">
                <div class="flex items-center space-x-2">
                    <span class="text-lg font-extrabold" style="color: ${brandColor};">${brand}</span>
                    <span class="bg-white/50 px-2 py-0.5 rounded text-xs font-bold" style="color: ${brandColor};">${items.length}종</span>
                </div>
                <svg id="icon-${brandId}" class="w-6 h-6 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}" style="color: ${brandColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            <div id="content-${brandId}" class="p-2 ${isCollapsed ? 'hidden' : ''} bg-gray-50">
                ${productsHTML}
            </div>
        `;
        div.innerHTML = header;
        container.appendChild(div);
    });
}

// [Mode 3] 완료 내역 (🔥 수정: 버튼 찌그러짐 방지 & 텍스트 줄바꿈 & 뱃지 위치 개선)
function renderCompletedList(container, orders) {
    const groups = {};
    orders.forEach(o => { if (!groups[o.order_id]) groups[o.order_id] = []; groups[o.order_id].push(o); });

    // 🔥 Load downloaded state
    const downloadedIds = getDownloadedList();

    Object.keys(groups).sort().reverse().forEach(orderId => {
        const items = groups[orderId];
        const totalCount = items[0].total_group_count || items.length;
        const doneCount = items.length;
        const isAllDone = (totalCount > 0 && totalCount === doneCount);
        const isExpanded = window.expandedGroups && window.expandedGroups.has(orderId);

        // Check if downloaded
        const isDownloaded = downloadedIds.includes(orderId);

        let badgeHTML = '';
        let bgClass = '';
        let borderClass = '';

        if (isAllDone) {
            badgeHTML = `<span class="shrink-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span>`;
            bgClass = 'bg-green-50';
            borderClass = 'border-green-100';
        } else {
            badgeHTML = `<span class="shrink-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">작업중</span>`;
            bgClass = 'bg-orange-50';
            borderClass = 'border-orange-100';
        }

        // Apply downloaded style override
        let divBgClass = 'bg-white';
        let divOpacity = '';
        let badgeVisibility = 'hidden';

        if (isDownloaded) {
            divBgClass = 'bg-gray-100'; // Override container bg
            divOpacity = 'opacity: 0.75;';
            badgeVisibility = ''; // Remove hidden

            // Note: We might want to keep the header color, but usually 'saved' implies sort of archived/grayed out.
            // keeping original header colors (green/orange) but graying out the card body is what the original ui_markDownloaded did (added bg-gray-100 to the whole group).
            // Let's mimic that:
            // The original code added 'bg-gray-100' to the *container div*.
        }

        const div = document.createElement('div');
        div.id = `group-${orderId}`;
        // If downloaded, add bg-gray-100 and border-gray-300 override
        const finalBorderClass = isDownloaded ? 'border-gray-300' : borderClass;
        const finalBgClass = isDownloaded ? 'bg-gray-100' : 'bg-white';

        div.className = `mb-4 ${finalBgClass} rounded-xl shadow-sm border ${finalBorderClass} overflow-hidden transition duration-500`;
        if (isDownloaded) div.style.cssText = divOpacity;

        // 🔥 헤더 부분 UI 수정
        div.innerHTML = `
            <div onclick="window.ui_toggleAccordion('${orderId}')" class="${bgClass} px-4 py-4 border-b ${borderClass} flex flex-col cursor-pointer transition select-none">
                <div class="flex justify-between items-center w-full">
                    
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        ${badgeHTML}
                        <div class="flex flex-col flex-1 min-w-0">
                            <h3 class="font-bold text-gray-800 text-sm flex flex-wrap items-center gap-1.5 break-words whitespace-normal leading-snug">
                                <span class="mr-1">${orderId}</span>
                                <span id="download-badge-${orderId}" class="${badgeVisibility} shrink-0 text-[10px] font-bold bg-gray-500 text-white px-2 py-0.5 rounded border border-gray-400 shadow-sm">
                                    ✅ 저장됨
                                </span>
                            </h3>
                            <p class="text-[10px] font-bold mt-1 ${isAllDone ? 'text-green-600' : 'text-orange-600'}">
                                진행률: ${doneCount} / ${totalCount} 완료
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center space-x-3 shrink-0 ml-3">
                        <button onclick="event.stopPropagation(); window.app_downloadSingleOrder('${orderId}')" class="bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 hover:text-blue-600 transition font-bold whitespace-nowrap">📥 엑셀</button>
                        <svg id="icon-${orderId}" class="w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>

                </div>
            </div>
            <div id="content-${orderId}" class="divide-y divide-gray-100 ${isExpanded ? '' : 'hidden'} bg-white">
                ${items.map(item => createCompletedRowHTML(item)).join('')}
            </div>
        `;
        container.appendChild(div);
    });
}

// [Helper] 공통 행 HTML (기본)
function createRowHTML(item, clientName = null) {
    const rawLot = item.lot_qty || 1;
    let calcLot = 1;
    if (String(rawLot).includes('/')) {
        calcLot = parseInt(String(rawLot).split('/')[0], 10);
    } else {
        calcLot = parseInt(rawLot, 10);
    }
    if (isNaN(calcLot) || calcLot < 1) calcLot = 1;

    const isLotError = (item.ordered_qty % calcLot !== 0);
    const qtyColor = isLotError ? 'text-red-600' : 'text-blue-800';
    const lotBadge = isLotError
        ? `<span class="text-[10px] text-red-600 font-bold ml-1 bg-red-50 px-1 rounded border border-red-100 flex items-center">⚠ LOT:${rawLot}</span>`
        : `<span class="text-[10px] text-gray-500">| LOT: ${rawLot}</span>`;

    const clientTag = clientName ? `<div class="mb-1"><span class="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded font-bold">${clientName}</span></div>` : '';

    return `
        <div class="p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors bg-white">
            ${clientTag}
            <div class="flex justify-between items-center">
                <div class="flex-1 min-w-0 pr-3">
                    <div class="flex items-center space-x-2 mb-0.5 flex-wrap">
                        <span class="text-[10px] text-blue-600 font-bold">${item.brand || ''}</span>
                        ${lotBadge}
                    </div>
                    <p class="text-sm font-bold text-gray-800 whitespace-normal break-words leading-tight">${item.product_name}</p>
                    <p class="text-xs text-gray-400 font-mono mt-0.5 cursor-pointer" 
                       onmousedown="window.ui_startPress('${item.jan_code}')" 
                       onmouseup="window.ui_cancelPress()" 
                       ontouchstart="window.ui_startPress('${item.jan_code}')" 
                       ontouchend="window.ui_cancelPress()">${item.jan_code}</p>
                    ${item.remark ? `<div class="mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">📢 ${item.remark}</div>` : ''}
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                    <div class="flex flex-col items-end mr-1">
                        <span class="text-[10px] text-gray-400">요청</span>
                        <span class="text-xl font-extrabold ${qtyColor}">${item.ordered_qty}</span>
                    </div>
                    <input type="number" value="${item.picked_qty || item.ordered_qty}" 
                        class="w-14 h-10 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 text-lg shadow-sm"
                        onchange="window.app_updateQty('${item.id}', this.value)" onclick="event.stopPropagation()">
                    <button onclick="event.stopPropagation(); window.app_completeOrder('${item.id}', this)" 
                        class="h-10 w-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Picking 탭 전용 행 HTML
function createPickingRowHTML(item, clientName) {
    const rawLot = item.lot_qty || 1;
    let calcLot = 1;
    if (String(rawLot).includes('/')) {
        calcLot = parseInt(String(rawLot).split('/')[0], 10);
    } else {
        calcLot = parseInt(rawLot, 10);
    }
    const isLotError = (item.ordered_qty % calcLot !== 0);
    const qtyColor = isLotError ? 'text-red-600' : 'text-blue-800';

    return `
        <div class="p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors bg-white">
            <div class="flex justify-between items-center">
                <div class="flex-1 min-w-0 pr-3">
                    <div class="text-lg font-extrabold text-indigo-900 leading-tight mb-1">${clientName}</div>
                    ${item.remark ? `<div class="mt-1 text-sm font-bold text-red-600 bg-red-100 p-2 rounded border border-red-200">📢 ${item.remark}</div>` : ''}
                </div>
                
                <div class="flex items-center space-x-2 shrink-0">
                    <div class="flex flex-col items-end mr-1">
                        <span class="text-[10px] text-gray-400">요청</span>
                        <span class="text-xl font-extrabold ${qtyColor}">${item.ordered_qty}</span>
                    </div>
                    <input type="number" value="${item.picked_qty || item.ordered_qty}" 
                        class="w-14 h-10 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 text-lg shadow-sm"
                        onchange="window.app_updateQty('${item.id}', this.value)" onclick="event.stopPropagation()">
                    <button onclick="event.stopPropagation(); window.app_completeOrder('${item.id}', this)" 
                        class="h-10 w-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// [Helper] 완료/수정용 행 HTML
function createCompletedRowHTML(item) {
    const finalQty = (item.picked_qty !== undefined) ? item.picked_qty : item.ordered_qty;
    return `
        <div class="p-3 border-b border-gray-100 hover:bg-green-50 transition-colors bg-white">
            <div class="flex justify-between items-center">
                <div class="flex-1 min-w-0 pr-3">
                    <p class="text-sm font-bold text-gray-800">${item.product_name}</p>
                    <p class="text-xs text-gray-400 font-mono">${item.jan_code}</p>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                    <div class="text-right mr-2">
                        <span class="text-[10px] text-gray-500 block">확정수량</span>
                        <input type="number" id="qty-done-${item.id}" value="${finalQty}" 
                            class="w-14 h-8 text-center border border-gray-300 rounded font-bold text-gray-800"
                            onclick="event.stopPropagation()">
                    </div>
                    <div class="flex flex-col space-y-1">
                        <button onclick="event.stopPropagation(); window.app_updateQtyManual('${item.id}')" 
                            class="h-8 w-8 bg-blue-50 text-blue-600 border border-blue-200 rounded flex items-center justify-center" title="수정 저장">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onclick="event.stopPropagation(); window.app_revertOrder('${item.id}')" 
                            class="h-8 w-8 bg-white border border-red-300 text-red-500 hover:bg-red-50 rounded flex items-center justify-center" title="되돌리기">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function emptyStateHTML(msg) {
    return `<div class="text-center text-gray-400 py-20 font-medium">${msg}</div>`;
}

window.expandedGroups = new Set();
window.ui_toggleAccordion = (id) => {
    const c = document.getElementById(`content-${id}`);
    const i = document.getElementById(`icon-${id}`);
    if (!c) return;
    if (c.classList.contains('hidden')) {
        c.classList.remove('hidden');
        if (i) i.classList.add('rotate-180');
        window.expandedGroups.add(id);
    } else {
        c.classList.add('hidden');
        if (i) i.classList.remove('rotate-180');
        window.expandedGroups.delete(id);
    }
};

window.collapsedBrands = new Set();
window.ui_toggleBrand = (id) => {
    const c = document.getElementById(`content-${id}`);
    const i = document.getElementById(`icon-${id}`);
    if (!c) return;
    if (c.classList.contains('hidden')) {
        c.classList.remove('hidden');
        if (i) i.classList.add('rotate-180');
        window.collapsedBrands.delete(id);
    } else {
        c.classList.add('hidden');
        if (i) i.classList.remove('rotate-180');
        window.collapsedBrands.add(id);
    }
};

// 다운로드 완료 시각적 표시
window.ui_markDownloaded = (orderId) => {
    // 1. Storage 저장
    saveDownloadedList(orderId);

    // 2. DOM 업데이트
    const group = document.getElementById(`group-${orderId}`);
    const badge = document.getElementById(`download-badge-${orderId}`);
    if (group) {
        group.classList.remove('bg-white');
        group.classList.add('bg-gray-100', 'border-gray-300'); // 회색으로 변경
        group.style.opacity = '0.75';
    }
    if (badge) {
        badge.classList.remove('hidden');
    }
};

// ===================================
// Helper functions for LocalStorage
// ===================================
function getDownloadedList() {
    try {
        const stored = localStorage.getItem('bic_downloaded_orders');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Storage Error:", e);
        return [];
    }
}

function saveDownloadedList(orderId) {
    try {
        const list = getDownloadedList();
        if (!list.includes(orderId)) {
            list.push(orderId);
            localStorage.setItem('bic_downloaded_orders', JSON.stringify(list));
        }
    } catch (e) {
        console.error("Storage Write Error:", e);
    }
}

let pressTimer;
window.ui_startPress = (text) => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`복사됨: ${text}`);
            if (navigator.vibrate) navigator.vibrate(50);
        }).catch(() => { });
    }, 800);
};

window.ui_cancelPress = () => {
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
};