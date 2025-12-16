// js/config.js
// 파이어베이스 설정 (Bic-Ops 프로젝트 연결됨)

// 1. 브라우저가 이해할 수 있는 주소(CDN)로 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// 2. 네가 가져온 '황금 열쇠' (여기에 네 정보를 넣었음)
const firebaseConfig = {
    apiKey: "AIzaSyBOheQT5MKRJ99-oGNIDtBrVQFewqzdFfU",
    authDomain: "bic-ops-134d3.firebaseapp.com",
    projectId: "bic-ops-134d3",
    storageBucket: "bic-ops-134d3.firebasestorage.app",
    messagingSenderId: "199683891244",
    appId: "1:199683891244:web:79adb09886e2173a8c3189",
    measurementId: "G-MDT7DZ8266"
};

// 3. 앱 초기화 (시동 걸기)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 4. 컬렉션 이름 설정
const COLLECTIONS = {
    ORDERS: `orders`,
    MEMOS: `memos`  // 
};

// 5. 내보내기
export { app, db, auth, COLLECTIONS };