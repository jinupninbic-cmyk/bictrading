// js/auth.js
// 로그인, 로그아웃 관리

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from "./config.js"; // 우리가 만든 설정 파일에서 가져옴

// 1. 로그인 함수
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: error.message };
    }
}

// 2. 로그아웃 함수
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, message: error.message };
    }
}

// 3. 로그인 상태 감지 (앱 켜질 때 실행)
export function monitorAuthState(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 로그인 됨
            onLogin(user);
        } else {
            // 로그아웃 됨
            onLogout();
        }
    });
}