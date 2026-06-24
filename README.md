# 평택채집 로컬투어

어린 시절 여름방학처럼 동네에서 소중한 무언가를 찾아오는 평택 로컬투어 홈페이지입니다.

## 구성

- 메인 핵심 카피
- 평택채집 소개
- 프로그램 안내
- 참가 신청 폼
- 참가자 후기 작성 및 노출
- 진행자 소개
- 운영자 CSV 관리 화면

## 배포

GitHub Pages Actions 워크플로로 배포합니다. `main` 브랜치에 푸시하면 정적 사이트가 공개됩니다.

## 데이터

브라우저 로컬 저장과 CSV 다운로드가 기본으로 동작합니다. Google Sheet 연동은 `google-apps-script.gs`를 Apps Script 웹앱으로 배포한 뒤 `config.js`에 웹앱 URL을 넣으면 켜집니다.

연결할 시트: https://docs.google.com/spreadsheets/d/1upsnbzUH8sF3fKMpA_Twa_R4AEkN35DAs3xmG8xW3nQ/edit
