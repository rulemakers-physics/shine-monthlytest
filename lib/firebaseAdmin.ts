import admin from 'firebase-admin';

// 초기화 여부 확인을 위한 전역 변수 (Next.js 핫 리로딩 대응)
/* eslint-disable no-var */
declare global {
  var _firebaseAdminApp: admin.app.App | undefined;
}
/* eslint-enable no-var */

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        `Firebase Admin 초기화 실패: 환경 변수가 누락되었습니다.\n` +
        `Project ID: ${!!projectId}, Email: ${!!clientEmail}, Key: ${!!privateKey}`
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("🔥 Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error);
    // 에러를 던지지 않고 로그만 남길 경우, 이후 db 호출에서 에러가 발생하여 500이 뜹니다.
    // 하지만 Vercel 로그에서 이 메시지를 확인할 수 있게 됩니다.
  }
}

const db = admin.firestore();
export { db };