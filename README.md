# 🔐 RiSA - RSA 암호화 데스크톱 앱

<div align="center">
  <img src="assets/icons/RiSA.png" alt="RiSA Logo" width="120" height="120">
  
  **Postman 스타일의 직관적인 RSA 암호화 데스크톱 애플리케이션**
  
  [![GitHub release](https://img.shields.io/github/v/release/0-ROK/RiSA)](https://github.com/0-ROK/RiSA/releases)
  [![GitHub downloads](https://img.shields.io/github/downloads/0-ROK/RiSA/total)](https://github.com/0-ROK/RiSA/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Build Status](https://img.shields.io/github/actions/workflow/status/0-ROK/RiSA/release.yml?branch=main)](https://github.com/0-ROK/RiSA/actions)
</div>

---

## 📥 다운로드

### 🌐 공식 다운로드 페이지
**[https://0-rok.github.io/RiSA](https://0-rok.github.io/RiSA)**

### 📦 직접 다운로드
최신 릴리즈는 [GitHub Releases](https://github.com/0-ROK/RiSA/releases/latest)에서 다운로드할 수 있습니다.

| 플랫폼 | 다운로드 |
|--------|----------|
| 🪟 **Windows** | [NSIS 설치파일](https://github.com/0-ROK/RiSA/releases/latest) • [포터블 버전](https://github.com/0-ROK/RiSA/releases/latest) |
| 🍎 **macOS** | [DMG 파일](https://github.com/0-ROK/RiSA/releases/latest) • [ZIP 압축파일](https://github.com/0-ROK/RiSA/releases/latest) |
| 🐧 **Linux** | [AppImage](https://github.com/0-ROK/RiSA/releases/latest) • [DEB 패키지](https://github.com/0-ROK/RiSA/releases/latest) |

---

## ✨ 주요 기능

### 🔒 **강력한 RSA 암호화**
- RSA-OAEP (권장) 및 RSA-PKCS1 알고리즘 지원
- 1024, 2048, 4096 비트 키 크기 선택 가능
- 안전한 키 생성 및 관리

### 🎨 **직관적인 사용자 인터페이스**
- Postman 스타일의 깔끔한 디자인
- 사이드바 네비게이션으로 쉬운 접근
- 실시간 오류 검증 및 사용자 피드백

### 🔧 **키 관리 시스템**
- RSA 키 쌍 자동 생성
- 키 가져오기/내보내기 (JSON 형식)
- 저장된 키 목록 관리

### ⚡ **성능 최적화**
- Electron 기반 네이티브 성능
- 빠른 암호화/복호화 처리
- 자동 업데이트 지원

---

## 🚀 빠른 시작

### 1️⃣ 설치
1. [공식 다운로드 페이지](https://0-rok.github.io/RiSA)에서 운영체제에 맞는 버전을 다운로드
2. 설치파일을 실행하여 설치 (Windows/Linux) 또는 DMG 마운트 (macOS)

### 2️⃣ 키 생성
1. 앱 실행 후 **키 관리** 탭으로 이동
2. **새 키 생성** 버튼 클릭
3. 키 크기 선택 (권장: 2048비트 이상)
4. 키 이름 입력 후 생성

### 3️⃣ 암호화/복호화
1. **메인** 탭에서 작업 선택 (암호화/복호화)
2. 텍스트 입력 및 키 선택
3. 알고리즘 선택 (권장: RSA-OAEP)
4. **실행** 버튼 클릭

---

## 🛡️ 보안 정보

### 지원 알고리즘
- **RSA-OAEP** ⭐ (권장): 최신 보안 표준, OAEP 패딩 사용
- **RSA-PKCS1**: 호환성을 위한 기존 표준 (보안 위험 있음)

### 권장 사항
- **키 크기**: 2048비트 이상 사용 (4096비트 권장)
- **알고리즘**: RSA-OAEP 사용
- **키 관리**: 개인키는 안전한 곳에 보관

### 다운로드 안전성
- ✅ **오픈소스**: 모든 코드는 GitHub에서 공개적으로 검증 가능
- ✅ **자동 빌드**: GitHub Actions로 자동 빌드되어 변조 불가능
- ✅ **MIT 라이선스**: 자유롭게 사용, 수정, 배포 가능

### 설치 시 보안 경고 해결법

#### 🪟 Windows
1. **"Windows에서 PC를 보호했습니다"** 알림이 나타나면:
   - "**추가 정보**" 클릭
   - "**실행**" 버튼 클릭
2. **Windows Defender** 경고 시:
   - 일시적으로 실시간 보호 해제 후 설치
   - 설치 완료 후 다시 활성화

#### 🍎 macOS  
1. **"확인되지 않은 개발자"** 경고 시:
   - 앱 파일을 **우클릭** → "**열기**" 선택
   - 다시 "**열기**" 확인 클릭
2. **대안 방법**:
   - 시스템 환경설정 → 보안 및 개인 정보 보호
   - "**확인 없이 열기**" 버튼 클릭

#### 🐧 Linux
- 대부분의 배포판에서 별도 설정 없이 실행 가능
- 실행 권한이 필요한 경우: `chmod +x RiSA-*.AppImage`

> **참고**: 이러한 경고는 코드 사이닝 인증서가 없기 때문입니다. 향후 사용자가 증가하면 인증서를 추가할 예정입니다.

---

## 🔄 자동 업데이트

RiSA는 자동 업데이트를 지원합니다:
- 새 버전 출시 시 앱 내 알림
- 백그라운드 다운로드
- 원클릭 설치 및 재시작

---

## 🛠️ 개발자 정보

### 기술 스택
- **Frontend**: React 19, TypeScript, Ant Design
- **Backend**: Electron, Node.js
- **암호화**: node-rsa, node-forge
- **빌드**: Webpack, electron-builder

### 시스템 요구사항
- **Windows**: Windows 10 이상
- **macOS**: macOS 10.15 이상
- **Linux**: Ubuntu 18.04 이상 또는 동등한 배포판

---

## 🐛 문제 해결

### 일반적인 문제
1. **앱이 실행되지 않음**: 최신 버전 다운로드 확인
2. **암호화 실패**: Base64 형식 및 키 유효성 확인
3. **키 가져오기 실패**: JSON 파일 형식 확인

### 지원 요청
문제가 지속되면 [GitHub Issues](https://github.com/0-ROK/RiSA/issues)에서 도움을 요청하세요.

---

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

---

## 🤝 기여하기

버그 신고, 기능 제안, 코드 기여를 환영합니다!

1. 이 저장소를 포크하세요
2. 기능 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

---

<div align="center">
  <p><strong>RiSA와 함께 안전한 암호화를 경험하세요! 🔐</strong></p>
  
  [다운로드](https://0-rok.github.io/RiSA) • [릴리즈 노트](https://github.com/0-ROK/RiSA/releases) • [문제 신고](https://github.com/0-ROK/RiSA/issues)
</div>