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

## Android APK/AAB 만들기

```bash
npm run native:android
```

Android Studio가 열리면:

1. `Build > Generate Signed Bundle / APK` 선택
2. APK 또는 Android App Bundle 선택
3. 서명 키 생성/선택
4. release 빌드 생성

## iOS IPA 만들기

```bash
npm run native:ios
```

Xcode가 열리면:

1. Signing & Capabilities에서 Team 선택
2. Bundle Identifier 확인: `kr.flatcoop.pyeongtaekstitch`
3. 실제 기기 또는 Archive 선택
4. `Product > Archive`로 IPA/TestFlight 배포

## 네이티브 앱 동작

- 브라우저 주소창 없이 독립 앱 화면으로 실행됩니다.
- 앱 내부 화면은 `www/`에 번들링됩니다.
- `/api/*` 요청은 `native-bridge.js`가 기존 Render 서버로 연결합니다.
- 홈 화면 안내 패널은 네이티브 앱 안에서 숨겨집니다.

## 앱 이름

- 앱 이름: `평택 한땀 여행`
- 앱 ID: `kr.flatcoop.pyeongtaekstitch`
