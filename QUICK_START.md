# ⚡ RiSA 빠른 시작 가이드

## 🎯 즉시 배포하기 (5분 완성)

### 1단계: 아이콘 준비 (선택사항)
아이콘이 없어도 빌드는 가능하지만, 전문적인 앱을 위해 준비하는 것을 권장합니다.

**빠른 해결책:**
- Google에서 "RSA encryption icon free" 검색
- 1024x1024 PNG 다운로드
- [favicon.io](https://favicon.io/favicon-converter/) 에서 변환:
  - 업로드 → icns, ico 다운로드
  - `assets/icons/` 폴더에 저장

### 2단계: GitHub 설정
```bash
# 1. GitHub에서 새 리포지토리 생성 (예: risa-app)
# 2. package.json 수정 (필수!)
```

**package.json에서 다음 라인 수정:**
```json
"homepage": "https://github.com/YOUR_USERNAME/YOUR_REPO",
"repository": {
  "url": "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
},
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME", 
    "repo": "YOUR_REPO"
  }
]
```

### 3단계: 첫 빌드
```bash
# 테스트 빌드
pnpm run build
pnpm run electron  # 실행 확인

# 배포용 패키징 (현재 OS용)
pnpm run package
```

### 4단계: GitHub 업로드
```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 태그 생성
git tag v1.0.0
git push origin v1.0.0
```

### 5단계: 수동 릴리즈
1. GitHub 리포지토리 → **Releases** 탭
2. **Create a new release** 클릭
3. Tag: `v1.0.0` 선택
4. Title: `RiSA v1.0.0 - First Release`
5. Description: 앱 소개 및 기능 설명
6. **Assets** 섹션에 `release/` 폴더의 파일들 업로드
7. **Publish release** 클릭

## 🎉 완료!

이제 다음 링크에서 다운로드 가능합니다:
`https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest`

---

## 📱 배포 결과물

### macOS 사용자용
- **RiSA-1.0.0-mac-x64.dmg** (Intel Mac)
- **RiSA-1.0.0-mac-arm64.dmg** (M1/M2 Mac)

### Windows 사용자용  
- **RiSA-1.0.0-win-x64.exe** (64비트)
- **RiSA-1.0.0-win-ia32.exe** (32비트)

### Linux 사용자용
- **RiSA-1.0.0-linux-x64.AppImage** (모든 배포판)

## 🚨 문제해결

### 빌드 오류 시
```bash
# 의존성 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

### 아이콘 오류 시
`package.json`의 build 설정에서 icon 경로를 주석 처리:
```json
"mac": {
  // "icon": "assets/icons/icon.icns",
}
```

### 권한 오류 시 (macOS)
```bash
sudo xattr -rd com.apple.quarantine /Applications/RiSA.app
```

## 📞 지원

문제가 발생하면 GitHub Issues에 보고해주세요:
`https://github.com/YOUR_USERNAME/YOUR_REPO/issues`