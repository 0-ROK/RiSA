# 🚀 RiSA 앱 배포 가이드

## 📋 배포 전 체크리스트

### 1. 필수 준비사항
- [ ] **아이콘 파일** 준비 (`assets/icons/` 참조)
- [ ] **GitHub 리포지토리** 생성 (package.json의 repository URL 업데이트)
- [ ] **라이선스** 확인 (현재: MIT)
- [ ] **버전 번호** 설정 (package.json의 version)

### 2. 빌드 환경 확인
- [ ] Node.js 18+ 설치 확인
- [ ] pnpm 패키지 매니저 설치
- [ ] electron-builder 의존성 확인

## 🛠️ 로컬 빌드 테스트

### 기본 빌드 (현재 OS용)
```bash
# 의존성 설치
pnpm install

# 개발 빌드 테스트
pnpm run build

# 전자 앱 실행 테스트
pnpm run electron

# 배포 패키지 빌드
pnpm run package
```

### 플랫폼별 빌드
```bash
# macOS용 (DMG, ZIP)
pnpm run package:mac

# Windows용 (NSIS 설치파일, Portable)  
pnpm run package:win

# Linux용 (AppImage, DEB)
pnpm run package:linux

# 모든 플랫폼 (CI/CD 환경에서)
pnpm run package:all
```

### 빌드 결과물
빌드 완료 후 `release/` 폴더에 다음 파일들이 생성됩니다:

**macOS:**
- `RiSA-1.0.0-mac-x64.dmg` (Intel Mac용)
- `RiSA-1.0.0-mac-arm64.dmg` (Apple Silicon용)
- `RiSA-1.0.0-mac-x64.zip` (압축파일)

**Windows:**
- `RiSA-1.0.0-win-x64.exe` (64비트 설치파일)
- `RiSA-1.0.0-win-ia32.exe` (32비트 설치파일)
- `RiSA-1.0.0-win-x64.exe` (포터블 버전)

**Linux:**
- `RiSA-1.0.0-linux-x64.AppImage` (실행파일)
- `RiSA-1.0.0-linux-x64.deb` (데비안 패키지)

## 🌐 배포 채널별 가이드

### 🆓 무료 배포 (권장)

#### 1. GitHub Releases
```bash
# 1. GitHub에 코드 푸시
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags

# 2. 빌드 실행
pnpm run package:all

# 3. GitHub Releases 페이지에서 수동 업로드
# - release/ 폴더의 파일들을 업로드
# - 릴리즈 노트 작성
```

**장점:** 무료, 버전 관리, 자동 업데이트 지원 가능  
**단점:** 기술적 지식 필요, 브랜딩 제한

#### 2. 개인 웹사이트 배포
- 웹서버에 빌드 파일 업로드
- 다운로드 페이지 제작
- 버전 관리 수동 처리

#### 3. Vercel 웹 데모 배포 (병행 운영)
RiSA의 주요 기능을 브라우저에서 체험할 수 있도록 정적 웹 데모를 함께 제공할 수 있습니다.

1. **웹 번들 생성**
   ```bash
   WEB_TARGET=web pnpm build:renderer
   ```
   빌드 결과는 `dist/web` 폴더에 생성됩니다.

2. **Vercel 설정**
   - 빌드 명령은 `WEB_TARGET=web pnpm build:renderer`를 사용합니다.
   - 출력 디렉터리는 `dist/web`입니다.
   - 히스토리 라우팅을 위해 `vercel.json`에 아래 설정을 추가합니다.

   ```json
   {
     "builds": [
       { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist/web" } }
     ],
     "scripts": { "build": "WEB_TARGET=web pnpm build:renderer" },
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

3. **배포 시 주의사항**
   - RSA 암·복호화, 키 생성 등 일부 기능은 웹 데모에서 비활성화되어 안내 메시지가 노출됩니다.
   - 체인/HTTP 도구 등 클라이언트에서 실행 가능한 기능으로 데모를 구성합니다.
   - 정적 자산(이미지, 아이콘 등)이 `dist/web`에 포함되어 있는지 확인합니다.

### 💰 유료 앱스토어 배포

#### 1. Mac App Store
- **비용:** $99/년 (Apple Developer Program)
- **요구사항:** 
  - 코드 사이닝 인증서
  - App Store 가이드라인 준수
  - 샌드박싱 적용 필요
- **심사기간:** 1-7일

#### 2. Microsoft Store  
- **비용:** 무료 (개인), $19 (회사)
- **요구사항:**
  - Microsoft Store 정책 준수
  - MSIX 패키징
- **심사기간:** 1-3일

#### 3. Snap Store (Linux)
- **비용:** 무료
- **패키징:** Snap 패키지 생성 필요
- **자동 업데이트:** 지원

## 🔄 자동 업데이트 설정 (추후 고도화)

### GitHub Releases 연동
```javascript
// main.ts에 추가 (electron-updater 사용)
import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-username',
  repo: 'risa'
});
```

## 📈 배포 전략 제안

### Phase 1: MVP 출시 (현재)
1. **GitHub Releases** - 무료 배포
2. **개발자 커뮤니티** 타겟팅  
3. **피드백 수집** 및 개선

### Phase 2: 브랜딩 강화
1. **공식 웹사이트** 제작
2. **소셜미디어** 마케팅
3. **기술 블로그** 포스팅

### Phase 3: 수익화 (유료 플랜)
1. **키 보안 강화** 기능 추가
2. **기업용 기능** (팀 관리, 감사 로그)
3. **앱스토어** 진출

## ⚠️ 배포 시 주의사항

### 보안
- 빌드 환경 보안 유지
- 코드 사이닝으로 악성코드 오해 방지
- 업데이트 채널 HTTPS 사용

### 법적 고려사항
- 암호화 소프트웨어 수출 규제 확인
- 각국 암호화 규정 준수
- 개인정보보호 정책 수립

### 사용자 경험
- 상세한 설치 가이드 제공
- 문제해결 FAQ 작성
- 사용자 피드백 채널 운영

## 🚀 첫 배포 실행하기

1. **아이콘 준비** (`assets/icons/` 가이드 참조)
2. **테스트 빌드** 실행
   ```bash
   pnpm run package
   ```
3. **실행파일 테스트** (release/ 폴더)
4. **GitHub 리포지토리** 생성 및 코드 업로드
5. **GitHub Releases** 페이지에서 첫 릴리즈 생성

배포 완료 후 사용자들이 다운로드할 수 있는 링크가 생성됩니다!

---
**💡 Tip:** 초기에는 베타 버전으로 출시하여 사용자 피드백을 받은 후 정식 버전을 릴리즈하는 것을 권장합니다.
