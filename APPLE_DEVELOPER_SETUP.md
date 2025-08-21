# Apple Developer Program 설정 가이드

이 가이드는 RiSA 앱에 macOS 코드 서명 및 공증을 적용하기 위한 Apple Developer Program 설정 방법을 설명합니다.

## 📋 사전 요구사항

- ✅ Apple Developer Program 가입 ($99/년)
- ✅ macOS 시스템 (인증서 생성용)
- ✅ Xcode 설치 (최신 버전 권장)

## 1️⃣ Apple Developer 인증서 생성

### 1.1 Xcode에서 인증서 생성

1. **Xcode 실행** → `Preferences` → `Accounts`
2. **Apple ID 추가** (Developer Program 가입된 계정)
3. **Team 선택** → `Manage Certificates...`
4. **+** 버튼 클릭 → `Developer ID Application` 선택
5. 인증서가 키체인에 자동 추가됨

### 1.2 또는 developer.apple.com에서 직접 생성

1. [Apple Developer](https://developer.apple.com) 로그인
2. `Certificates, Identifiers & Profiles` → `Certificates`
3. **+** 버튼 → `Developer ID Application`
4. CSR 파일 업로드 후 인증서 다운로드
5. 다운로드한 `.cer` 파일을 더블클릭하여 키체인에 추가

## 2️⃣ 인증서 내보내기

### 2.1 키체인에서 .p12 파일 생성

```bash
# 키체인 접근 앱 실행
open "/Applications/Utilities/Keychain Access.app"
```

1. **키체인 접근** → `로그인` 키체인 선택
2. `Developer ID Application: [Your Name]` 인증서 찾기
3. 인증서와 개인 키를 모두 선택 (▶ 화살표 클릭하여 개인 키 표시)
4. 우클릭 → `2개 항목 내보내기...`
5. 파일 형식: `개인 정보 교환(.p12)` 선택
6. **강력한 비밀번호 설정** (GitHub Secrets에서 사용)

⚠️ **보안 주의**: .p12 파일은 절대 Git에 커밋하지 마세요!

## 3️⃣ 앱 전용 비밀번호 생성

### 3.1 Apple ID 설정

1. [appleid.apple.com](https://appleid.apple.com) 로그인
2. `로그인 및 보안` → `앱별 비밀번호`
3. `비밀번호 생성` → 레이블: "GitHub Actions RiSA"
4. 생성된 비밀번호 복사 (다시 볼 수 없음!)

## 4️⃣ GitHub Secrets 설정

### 4.1 Repository Settings 접근

```
GitHub Repository → Settings → Secrets and variables → Actions
```

### 4.2 필수 Secrets 추가

#### `APPLE_CERTIFICATE`
```bash
# .p12 파일을 Base64로 인코딩
base64 -i /path/to/certificate.p12 | pbcopy
```
- 출력된 Base64 문자열을 GitHub Secret으로 추가

#### `APPLE_CERTIFICATE_PASSWORD`
- .p12 파일 생성 시 설정한 비밀번호

#### `APPLE_ID`
- Apple Developer 계정 이메일 주소

#### `APPLE_ID_PASSWORD`
- 3단계에서 생성한 앱 전용 비밀번호

#### `APPLE_TEAM_ID`
```bash
# 팀 ID 확인 방법 1: Xcode
# Xcode → Preferences → Accounts → Team ID 확인

# 팀 ID 확인 방법 2: 인증서에서
security find-identity -v -p codesigning | grep "Developer ID Application"
```
- 10자리 영숫자 조합 (예: `M4NJ645XSJ`)

#### `APPLE_KEYCHAIN_PASSWORD`
- GitHub Actions에서 사용할 임시 키체인 비밀번호
- 아무 강력한 비밀번호나 설정 (예: 랜덤 문자열)

## 5️⃣ 설정 확인

### 5.1 로컬 테스트

```bash
# 환경변수 설정 (임시)
export APPLE_ID="your-email@example.com"
export APPLE_ID_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# 빌드 테스트
pnpm run package:mac

# 서명 확인
codesign --verify --deep --strict --verbose=2 release/mac/RiSA.app
spctl -a -t exec -vvv release/mac/RiSA.app
```

### 5.2 GitHub Actions 테스트

```bash
# 새 태그 생성하여 자동 배포 테스트
git tag v0.1.6
git push origin v0.1.6
```

## 6️⃣ 문제 해결

### 일반적인 오류와 해결책

#### "unable to build chain to self-signed root"
- 인증서 체인 문제
- Apple Intermediate 인증서 다운로드 필요
- [Apple PKI](https://www.apple.com/certificateauthority/) 페이지에서 다운로드

#### "notarization failed"
- Apple ID 또는 앱 전용 비밀번호 확인
- 팀 ID 정확성 확인
- 2FA 활성화 여부 확인

#### "entitlements not valid"
- `build/entitlements.mac.plist` 파일 권한 확인
- 불필요한 권한 제거

### 공증 상태 확인

```bash
# 공증 히스토리 확인
xcrun notarytool history \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_ID_PASSWORD" \
  --team-id "$APPLE_TEAM_ID"

# 특정 제출 상태 확인
xcrun notarytool info <submission-id> \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_ID_PASSWORD" \
  --team-id "$APPLE_TEAM_ID"
```

## 7️⃣ 보안 모범 사례

### ✅ 권장사항
- 2FA 활성화 필수
- 앱 전용 비밀번호 사용 (실제 Apple ID 비밀번호 금지)
- .p12 파일 안전한 곳에 백업
- 정기적인 인증서 갱신 (1년마다)

### ❌ 금지사항
- GitHub에 인증서 파일 커밋
- 실제 Apple ID 비밀번호 사용
- 인증서 파일 공유
- Secrets 값 로그 출력

## 🎉 완료 후 확인사항

설정이 완료되면:
- ✅ 태그 푸시 시 자동 서명
- ✅ Apple 공증 통과
- ✅ macOS 사용자가 경고 없이 실행 가능
- ✅ GitHub Pages에 다운로드 링크 자동 업데이트

---

💡 **참고**: Apple Developer Program은 연간 갱신이 필요하며, 인증서도 정기적으로 갱신해야 합니다.