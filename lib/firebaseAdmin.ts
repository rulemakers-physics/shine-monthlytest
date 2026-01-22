import admin from 'firebase-admin';

// 전역 초기화 체크 (Next.js Hot Reload 대응)
/* eslint-disable no-var */
declare global {
  var _firebaseAdminApp: admin.app.App | undefined;
}
/* eslint-enable no-var */

if (!admin.apps.length) {
  try {
    // [1] 로컬 개발 환경: serviceAccountKey.json 파일을 찾아 사용합니다.
    // 주의: 이 파일은 .gitignore에 포함되어 배포되지 않으므로, 로컬에서만 작동합니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("@/serviceAccountKey.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin Initialized with serviceAccountKey.json (Local)");
    
  } catch (error) {
    // [2] 배포 환경 (Firebase Hosting/Cloud Functions):
    // 파일이 없으면 자동으로 서버의 기본 자격 증명(ADC)을 사용해 초기화합니다.
    // 별도의 설정 없이도 Firestore 등 리소스 접근 권한을 가집니다.
    if (!admin.apps.length) {
      admin.initializeApp();
      console.log("🔥 Firebase Admin Initialized with Default Credentials (Production)");
    }
  }
}

const db = admin.firestore();
export { db };