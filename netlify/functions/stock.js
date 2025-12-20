// netlify/functions/stock.js
// 박스히어로 재고 조회 (검색 미지원 -> Pagination 전수조사 방식)
// 보안: 환경변수(Environment Variables) 적용 완료

exports.handler = async (event) => {
    // 1. 요청 바코드 확인
    const requestedBarcode = event.queryStringParameters.barcode;
    if (!requestedBarcode) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Barcode is required" })
        };
    }

    // 2. 환경 변수 가져오기
    const TOKEN = process.env.BOXHERO_TOKEN;
    const TEAM_ID = process.env.BOXHERO_TEAM_ID;

    // ▼▼▼▼▼ [스파이 코드] 로그 심기 (여기서 범인을 잡는다) ▼▼▼▼▼
    console.log("========================================");
    console.log("🕵️‍♂️ [DEBUG] Netlify 서버 환경변수 실토 시간");
    console.log(`1. Team ID: [${TEAM_ID}]`); // 대괄호 [] 안에 공백이 있는지 확인 필수!
    console.log(`2. Token (앞 5자리): [${TOKEN ? TOKEN.substring(0, 5) : '없음'}]...`);
    console.log(`3. 요청 바코드: ${requestedBarcode}`);
    console.log("========================================");
    // ▲▲▲▲▲ [스파이 코드 끝] ▲▲▲▲▲

    // [안전장치] 만약 넷리파이 설정이 덜 됐다면 바로 에러 뿜고 종료
    if (!TOKEN || !TEAM_ID) {
        console.error("[Config Error] 환경변수(TOKEN 또는 TEAM_ID)가 설정되지 않았습니다.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server Configuration Error: Missing Environment Variables" })
        };
    }

    // 3. 변수 설정
    let foundItem = null;
    let nextCursor = null;
    let hasMore = true;
    let pageCount = 0;
    const cleanBarcode = requestedBarcode.trim();

    console.log(`[Stock API] 바코드 ${cleanBarcode} 조회 시작...`);

    try {
        // 4. 전수 조사 루프 (찾을 때까지 페이지 넘김)
        while (!foundItem && hasMore) {
            // [추가] 너무 빠르면 차단당함(429). 0.3초 대기 (API 매너)
            await new Promise(resolve => setTimeout(resolve, 300));
            pageCount++;
            
            // URL 생성 (커서 기반 페이지네이션)
            let url = `https://rest.boxhero-app.com/v1/items?limit=100`; 
            if (nextCursor) {
                url += `&cursor=${nextCursor}`;
            }

            // API 호출
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'X-BoxHero-Team-ID': TEAM_ID
                }
            });

            if (!response.ok) {
                console.error(`[BoxHero API Fail] Status: ${response.status}`);
                // 인증 에러면 즉시 중단
                if (response.status === 401 || response.status === 403) {
                    return { statusCode: 500, body: JSON.stringify({ error: "Authentication Failed (Check Env Vars)" }) };
                }
                break; 
            }

            const data = await response.json();
            const items = data.items || [];

            // 현재 페이지에서 정밀 검색
            foundItem = items.find(item => {
                const mainBarcode = String(item.barcode || "").trim();
                const subBarcodes = Array.isArray(item.barcodes) ? item.barcodes.map(b => String(b).trim()) : [];
                return mainBarcode === cleanBarcode || subBarcodes.includes(cleanBarcode);
            });

            if (foundItem) {
                console.log(`[Success] ${pageCount}번째 페이지에서 물건 발견! (${foundItem.name})`);
                break;
            }

            // 다음 페이지 준비
            nextCursor = data.cursor;
            hasMore = data.has_more;

            // [안전장치] 무한 루프 방지 (최대 50페이지 = 5,000개 까지만 조회)
            if (pageCount > 50) {
                console.warn("[Warning] 50페이지 초과. 검색 중단.");
                break;
            }
        }

        // 5. 결과 반환
        if (foundItem) {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(foundItem)
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ 
                    error: "Product not found in BoxHero", 
                    scanned_pages: pageCount 
                })
            };
        }

    } catch (error) {
        console.error("[Server Internal Error]", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};