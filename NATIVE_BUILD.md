# 네이티브 앱 빌드 안내

이 저장소는 Capacitor 기반 네이티브 앱 빌드 구성을 포함합니다. 화면은 앱 안에 번들링되고, 사진/작업 데이터 API는 기존 서버(`https://pyeongtaek-stitch-app.onrender.com`)로 연결됩니다.

## 준비물

- Node.js 20 이상
- Android 빌드: Android Studio, Android SDK
- iOS 빌드: macOS, Xcode, Apple Developer 계정

## 최초 1회

```bash
npm install
npm run native:add:android
npm run native:add:ios
```

`android/`, `ios/` 폴더가 생성됩니다.

## 앱 화면 업데이트 후 동기화

```bash
npm run native:sync
```

## Android debug APK

GitHub Actions의 `Android APK` 워크플로가 debug APK를 생성합니다.

## Android 정식 release APK/AAB

GitHub Actions의 `Android Release` 워크플로가 release APK/AAB를 생성합니다.

서명키가 없으면 `pyeongtaek-stitch-unsigned-release` 아티팩트가 생성됩니다. 이 파일은 검수/테스트용이며, Play Store나 지속 업데이트용 정식 배포에는 서명키가 필요합니다.

정식 signed release를 만들려면 GitHub 저장소의 `Settings > Secrets and variables > Actions`에 아래 Secrets를 추가하세요.

```text
ANDROID_KEYSTORE_BASE64=release.keystore 파일을 base64로 인코딩한 값
ANDROID_KEYSTORE_PASSWORD=키스토어 비밀번호
ANDROID_KEY_ALIAS=키 alias
ANDROID_KEY_PASSWORD=키 비밀번호
```

## iOS 시뮬레이터 빌드

GitHub Actions의 `iOS Build` 워크플로가 iOS Simulator용 `.app` 번들을 생성합니다. 이 파일은 맥/Xcode 시뮬레이터 검수용입니다.

## iPhone 설치/TestFlight/IPA

실제 아이폰 설치, TestFlight, App Store 배포는 Apple 서명이 필요합니다.

필요한 것:

- Apple Developer 계정
- Bundle Identifier: `kr.flatcoop.pyeongtaekstitch`
- Apple Distribution 인증서
- App Store 또는 Ad Hoc Provisioning Profile

로컬에서 진행하는 가장 안정적인 방법:

```bash
npm install
npm run native:add:ios
npm run native:ios
```

Xcode가 열리면:

1. `Signing & Capabilities`에서 Team 선택
2. Bundle Identifier 확인: `kr.flatcoop.pyeongtaekstitch`
3. 실제 기기 연결 또는 Any iOS Device 선택
4. `Product > Archive`
5. Organizer에서 `Distribute App` 선택
6. TestFlight 또는 Ad Hoc/IPA 배포 선택

GitHub Actions에서 IPA까지 자동 생성하려면 아래 Secrets를 추가한 뒤 `ios-build.yml`의 `build-ios-archive` job을 활성화하세요.

```text
APPLE_CERTIFICATE_P12_BASE64=Distribution 인증서 p12를 base64 인코딩한 값
APPLE_CERTIFICATE_PASSWORD=p12 비밀번호
APPLE_PROVISIONING_PROFILE_BASE64=mobileprovision 파일을 base64 인코딩한 값
APPLE_TEAM_ID=Apple Team ID
APPLE_BUNDLE_ID=kr.flatcoop.pyeongtaekstitch
```

## Android Studio에서 직접 만들기

```bash
npm run native:android
```

Android Studio가 열리면:

1. `Build > Generate Signed Bundle / APK` 선택
2. APK 또는 Android App Bundle 선택
3. 서명 키 생성/선택
4. release 빌드 생성

## 네이티브 앱 동작

- 브라우저 주소창 없이 독립 앱 화면으로 실행됩니다.
- 앱 내부 화면은 `www/`에 번들링됩니다.
- `/api/*` 요청은 `native-bridge.js`가 기존 Render 서버로 연결합니다.
- 홈 화면 안내 패널은 네이티브 앱 안에서 숨겨집니다.

## 앱 이름

- 앱 이름: `평택 한땀 여행`
- 앱 ID: `kr.flatcoop.pyeongtaekstitch`
