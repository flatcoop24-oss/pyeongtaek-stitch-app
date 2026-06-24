# 평택채집 Google Sheets 연결

신청과 후기를 Google Sheet로 모으려면 아래 순서대로 한 번만 연결하세요.

1. Google Sheet 열기: https://docs.google.com/spreadsheets/d/1upsnbzUH8sF3fKMpA_Twa_R4AEkN35DAs3xmG8xW3nQ/edit
2. Apps Script에서 `google-apps-script.gs` 내용을 붙여 넣습니다.
3. `setupSheets()`를 한 번 실행해 `신청`, `후기` 탭을 준비합니다.
4. 배포 > 새 배포 > 웹 앱을 선택합니다.
5. 실행 권한은 본인, 액세스 권한은 모든 사용자로 설정합니다.
6. 발급된 `/exec` URL을 `config.js`의 `googleSheetWebAppUrl` 값에 넣어 커밋합니다.

운영자 암호는 `chaezip`입니다. 운영자 화면에서 로컬 CSV를 내려받을 수 있고, URL 연결 후에는 Google Sheet CSV도 바로 열 수 있습니다.
