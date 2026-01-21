import admin from 'firebase-admin';

// 초기화 여부 확인을 위한 전역 변수
/* eslint-disable no-var */
declare global {
  var _firebaseAdminApp: admin.app.App | undefined;
}
/* eslint-enable no-var */

if (!admin.apps.length) {
  try {
    // 1. serviceAccountKey.json 파일을 가져옵니다.
    // 주의: 이 방식은 빌드 시점에 파일이 존재해야 하므로, 배포 시 파일이 없으면 에러가 날 수 있습니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("@/serviceAccountKey.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin Initialized with serviceAccountKey.json");
  } catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error);
  }
}

const db = admin.firestore();
export { db };