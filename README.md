# 평택 한땀 여행

평택 8경을 선택하고, 각 도안 칸마다 사진을 하나씩 업로드해 십자수 작업지를 채우는 정적 웹앱입니다.

## 공개 배포

이 앱은 이제 프론트엔드와 백엔드 API를 함께 제공합니다. `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 있으면 사진과 작업 상태를 Supabase Storage에 저장하고, 없으면 서버 SQLite DB를 사용합니다.

## 로컬 실행

```bash
npm start
```

기본 주소는 `http://localhost:4173`입니다.

## 서버 배포

Render, Railway, Fly.io 같은 Node 서버 호스팅에 이 폴더를 배포하세요.

### Render로 고정 링크 만들기

1. 이 폴더 전체를 GitHub 저장소에 올립니다.
2. Render에서 `New > Blueprint`를 선택합니다.
3. GitHub 저장소를 연결합니다.
4. `render.yaml`이 자동으로 무료 웹 서비스와 실행 명령을 설정합니다.
5. 배포가 끝나면 `https://...onrender.com` 형태의 고정 링크가 생깁니다.

권장 설정:

- Start Command: `npm start`
- Port: 환경변수 `PORT` 자동 사용

SQLite 파일은 `data/pyeongtaek-stitch.sqlite`에 생성됩니다. 영구 디스크가 없으면 서버 재시작/재배포 때 사진 DB가 사라질 수 있습니다.

### 무료 Supabase Storage 연결

1. Supabase에서 무료 프로젝트를 만듭니다.
2. Project Settings > API에서 `Project URL`과 `service_role` 키를 복사합니다.
3. Render 서비스의 Environment에 아래 값을 넣습니다.

```text
SUPABASE_URL=Project URL
SUPABASE_SERVICE_ROLE_KEY=service_role key
SUPABASE_BUCKET=pyeongtaek-stitch
```

서버가 처음 저장할 때 `pyeongtaek-stitch` 버킷을 자동으로 만들고, 사진은 `photos/`, 칸별 작업 정보는 `cells/` 아래에 저장합니다. 별도 SQL 테이블은 필요하지 않습니다.

## GitHub에 올리기

GitHub 저장소에 이 폴더 전체를 커밋한 뒤 서버 호스팅에 연결하면 됩니다.

## 정적 호스팅만 쓰는 경우

Vercel/Netlify/GitHub Pages에 정적 파일로만 올리면 서버 DB 없이 각 사용자 브라우저 저장소에만 저장됩니다. 여러 사람이 같은 DB를 공유하려면 `server.js`가 실행되는 Node 서버 배포가 필요합니다.

## 데이터 저장 방식

백엔드 API가 켜져 있으면 사진은 서버 저장소에 저장됩니다. Supabase 환경변수가 있으면 Supabase Storage, 없으면 SQLite를 사용합니다. API가 없는 정적 환경에서는 기존처럼 각 사용자 브라우저의 IndexedDB에 저장됩니다.
