import admin from 'firebase-admin';

// [핵심] rmleveltest처럼 별도의 앱 이름을 지정해 충돌 방지
const ADMIN_APP_NAME = 'shine-monthlytest-admin';

let app: admin.app.App;

// 이미 해당 이름으로 초기화된 앱이 있다면 그것을 사용 (Hot Reload 대응)
if (admin.apps.some(a => a && a.name === ADMIN_APP_NAME)) {
  app = admin.app(ADMIN_APP_NAME);
} else {
  // [1] 배포 환경 (Production): Cloud Run의 자동 인증(ADC) 사용
  if (process.env.NODE_ENV === 'production') {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'shine-monthlytest' // 프로젝트 ID 명시
    }, ADMIN_APP_NAME); // <-- 여기에 이름을 넣어주는 것이 핵심!
    console.log("🔥 [Production] Named Firebase Admin App Initialized");
  } 
  // [2] 로컬 개발 환경: serviceAccountKey.json 사용
  else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("@/serviceAccountKey.json");
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'shine-monthlytest'
      }, ADMIN_APP_NAME);
      console.log("🔥 [Local] Named Firebase Admin App Initialized");
    } catch (error) {
      console.warn("⚠️ 로컬 키 파일 없음. ADC 모드로 시도합니다.");
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'shine-monthlytest'
      }, ADMIN_APP_NAME);
    }
  }
}

// 초기화된 앱 인스턴스에서 Firestore 가져오기
export const db = app.firestore();
export { admin };