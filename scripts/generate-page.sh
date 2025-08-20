#!/bin/bash

# GitHub Pages 생성 스크립트
set -e

TAG_NAME="${1:-v0.1.0}"
REPOSITORY="${2:-0-ROK/RiSA}"

echo "Generating GitHub Pages for tag: $TAG_NAME"

# 출력 디렉토리 생성
mkdir -p _site

# GitHub API에서 릴리즈 정보 가져오기
echo "Fetching release assets from GitHub API..."
RELEASE_DATA=$(curl -s "https://api.github.com/repos/$REPOSITORY/releases/tags/$TAG_NAME")

# 릴리즈가 존재하는지 확인
if echo "$RELEASE_DATA" | jq -e '.assets' > /dev/null 2>&1; then
  ASSETS=$(echo "$RELEASE_DATA" | jq '.assets | map({name: .name, download_url: .browser_download_url, size: .size, download_count: .download_count})')
  echo "Found $(echo "$ASSETS" | jq length) assets"
else
  echo "No release found for tag $TAG_NAME, using empty assets"
  ASSETS="[]"
fi

# 템플릿 복사 및 변수 치환
cp templates/index.html _site/index.html

# 버전 정보 치환
sed -i '' "s/__VERSION__/$TAG_NAME/g" _site/index.html

# Assets 정보 치환 (JSON 이스케이프 처리)
ESCAPED_ASSETS=$(echo "$ASSETS" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr -d '\n')
sed -i '' "s/__ASSETS__/$ESCAPED_ASSETS/g" _site/index.html

echo "Generated _site/index.html successfully"
echo "File size: $(wc -c < _site/index.html) bytes"