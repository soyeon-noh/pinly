# pinly — 프로젝트 컨텍스트

> 이 파일은 Claude Code가 프로젝트를 이해하도록 돕는 컨텍스트 문서다.
> 저장소 루트(`pinly/`)에 있어 백엔드·프론트엔드 어느 쪽 작업에서도 자동으로 읽힌다.

## 한 줄 소개

pinly는 **웹툰 작가 팀을 위한 이미지 기반 피드백 협업 툴**이다. 작가·어시스턴트·편집자가 원고 이미지를 캔버스에 올리고, 특정 지점에 핀(댓글)을 찍어 피드백을 남기며, 각 피드백의 처리 상태(수정 대기 / 확인 대기 / 확인됨)를 추적한다.

## 해결하려는 문제

- 웹툰 원고 피드백이 카톡·메일·구두로 흩어져 "어느 컷의 무슨 얘기였는지" 추적이 어렵다.
- 수정 요청 → 반영 → 확인의 상태 관리가 되지 않는다.
- pinly는 **이미지 위 위치 기반 코멘트 + 피드백 상태 관리 + 피드백 로그**로 이 문제를 해결한다.

핵심 사용자: 웹툰 작가(팀), 어시스턴트, 편집자/PD. 프로젝트 링크 공유로 외부 협업자도 참여할 수 있다.

## 저장소 구조 (모노레포)

```
pinly/
├── CLAUDE.md                  # 이 파일
├── backend/                   # Spring Boot 4 (Java 21) — API, DB 마이그레이션
│   └── docs/                  # 백엔드 설계·컨벤션 (conventions, db-schema, canvas-schema)
├── frontend/                  # React 19 + TypeScript + Vite — 본 프론트엔드
│   └── frontend-demo/         # 캔버스 스파이크 프로토타입 (React 18, JS). 측정용이며 제품 코드 아님
└── docs/                      # 백엔드·프론트엔드에 걸친 공용 문서 (캔버스 스파이크 결과, 프론트 구현 계획)
```

자주 쓰는 명령 (저장소 루트에서):

```bash
cd backend && ./gradlew test          # 백엔드 테스트 (Docker 데몬 필요)
npm --prefix frontend run dev         # 프론트엔드 개발 서버
npm --prefix frontend run build       # 타입 체크 + 빌드
npm --prefix frontend run lint        # oxlint
```

## 화면 구조 (사이트맵)

- **로그인 / 회원가입**
- **프로젝트 목록**: 전체 프로젝트 알림 오버레이, 설정 모달(계정·알림 설정), 구독 계획 모달(정식 출시 시), 계획 구독·업그레이드·다운그레이드·취소
- **프로젝트 페이지**: 해당 프로젝트 알림, 프로젝트 링크 공유
- **캔버스 작업 공간** (핵심): 이미지 업로드, 핀 댓글 추가·답글·삭제, 해결됨 표시, 댓글을 할 일 목록으로 열기, 피드백 완료 상태 버튼
    - 툴바: 선택 / 손(이동) / 댓글 추가 / 텍스트 추가 / 그리기 / 이미지 첨부 / 지우개(벡터 선 기반이라 지우개 없이 삭제)
- **피드백 로그**: 새 피드백 추가, 로그 이름 수정, 피드백 삭제, 상태(수정 대기 / 확인 대기 / 확인됨) 관리

## 핵심 사용자 플로우

로그인 → 프로젝트 목록 → 프로젝트 생성/선택 → 프로젝트 페이지 → **캔버스 작업 공간**(이미지 업로드 후 핀으로 피드백) 및 **피드백 로그**(상태로 진행 추적). 캔버스의 코멘트와 피드백 로그 항목은 서로 연결되어, 코멘트를 할 일처럼 열고 상태를 바꿀 수 있다.

## 도메인 핵심 개념

- **Project**: 하나의 작업 단위. 이미지, 코멘트, 피드백 로그를 포함. 링크로 공유 가능.
- **Canvas**: 프로젝트의 작업 공간. 업로드된 이미지 위에 핀/텍스트/드로잉이 얹힌다.
    - 캔버스에는 **웹툰 전체가 아니라 피드백할 컷·페이지 단위**를 올린다.
    - **아트보드 크기 = 원고 크기.** 빈 캔버스는 1920×1080(백엔드 기본값). **첫 이미지(원고)를 올릴 때 한 번만** `stage.width/height`를 원고 원본 크기로 맞추고 원고를 (0, 0)·배율 1에 둔다. 핀 좌표가 곧 원고 픽셀 좌표가 되어, 같은 크기의 수정본으로 바꿔 끼워도 핀이 같은 지점을 가리킨다.
    - 두 번째 이후 이미지(참고 자료)나 다른 요소가 판 밖으로 나가도 판을 늘리지 않는다.
    - **사용자가 직접 크기를 바꾸는 UI는 이후 과제.** 크기는 문서 JSONB 값이라 DB 마이그레이션은 필요 없다.
- **Comment(Pin)**: 캔버스 특정 좌표에 붙는 피드백. 답글 트리, 해결됨 상태를 가짐.
- **Feedback(Log item)**: 처리 흐름 관점의 피드백. 상태 = `수정 대기 | 확인 대기 | 확인됨`.
- **Plan / Subscription**: Free / 유료 플랜. 예: 무료 플랜은 프로젝트 3개 제한(정식 출시 시).

## 기술 스택

- **백엔드** (`backend/`): Spring Boot 4 (Java 21), Gradle, Flyway, Spring Data JPA
- **DB**: PostgreSQL — 관계형 테이블(User, Project, Comment, Feedback, Plan) + **JSONB로 캔버스 상태 저장**(드로잉 벡터 경로·텍스트·이미지 요소). 핀은 JSONB가 아닌 `comment` 테이블. 하이브리드 구조.
- **프론트엔드** (`frontend/`): React 19 + TypeScript + Vite, oxlint
- **캔버스 렌더링**: react-konva 19 / Konva 10 — 객체 모델 기반. 도형/텍스트/이미지/자유선(Line)을 객체로 다뤄 "지우개 = Line 객체 삭제"를 구현. 직렬화 결과를 JSONB 저장에 재사용.
    - **핀(코멘트 마커)은 캔버스 위 DOM 오버레이**(절대위치)로 구현하고 캔버스 transform에 좌표만 동기화 (Figma 코멘트 방식). 말풍선 UI/입력은 일반 React 컴포넌트.
- **실시간 동기화**: **MVP 범위에서 제외.** 단일 편집 기준으로 구현하고, 저장 충돌은 가볍게 처리(마지막 저장 우선 또는 프로젝트당 편집자 1인 가정). 다중 협업 실시간은 이후 과제.
- **인증**: JWT + 소셜 로그인(OAuth2) 병행. Spring Security로 발급·검증, 소셜 콜백 후 자체 JWT 발급 패턴.
- **이미지 스토리지**: AWS S3 — 원고는 고해상도 대용량이라 DB가 아닌 오브젝트 스토리지에 저장. **Presigned URL로 브라우저 ↔ S3 직접 업로드/다운로드**(Spring 서버가 바이트를 거치지 않음), CloudFront(CDN) 연동으로 캔버스 로딩 가속. (비용 민감 시 S3 호환·egress 무료인 Cloudflare R2 대안 검토 가능.)

> 참고: 드로잉 캔버스가 최고 리스크 컴포넌트. 실시간 협업은 MVP에서 제외하여 복잡도를 낮추고, 가벼운 일관성·진행 관리 도구로 방향을 잡는다.

## 브랜딩

- 제품명: **pinly** (소문자 표기)
- 로고 컨셉: 코멘트 말풍선 + 지도의 핀(도넛 형태) + 펜촉(웹툰/드로잉)의 결합
- 기본 컬러: `#292C28` (딥 차콜)
- 포인트 컬러(후보 A, 유력): 민트그린 그라디언트 `#1AE46E → #00E4DC`
- 포인트 컬러(후보 B): `#50FF99 → #FF993F`
- 톤: 크리에이터 친화적, 깔끔·모던

## 코드/작업 규칙

### 공통

**커밋 컨벤션 — Conventional Commits + 한국어 본문** (상세: `backend/docs/conventions.md` 2장)

```
<type>(<scope>): <한국어 요약, 50자 이내, 마침표 없음>

<한국어 본문 — 무엇을 왜 바꿨는지>
```

- type: `feat` `fix` `refactor` `perf` `test` `docs` `build` `ci` `chore`
- scope: 백엔드 도메인 패키지명 / `global` / `db` / `frontend`, 여러 영역에 걸치면 생략
- 제목은 "~추가 / ~수정 / ~제거" 형태, 한 커밋에 한 의도
- Claude 작성 커밋은 푸터에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

**응답 언어**: 한국어 (설명·커밋·주석·테스트 이름). 코드 식별자는 영어.

### 백엔드 (`backend/`)

상세는 `backend/docs/conventions.md`. 아래는 항상 지켜야 하는 요약.

**패키지 구조 — 도메인형**

```
com.kodeongee.pinly
├── global/{config,error,security,entity,util}          # 횡단 관심사
└── domain/{user,project,canvas,comment,feedback,subscription,notification}
        └── 각 도메인: {controller,service,repository,entity,dto}
```

- 다른 도메인의 Repository를 직접 주입하지 않는다 (Service → Service 로만)
- 엔티티를 HTTP 응답으로 노출하지 않는다. 요청·응답은 `dto`의 `record`
- 연관관계는 항상 `FetchType.LAZY`, 기본은 단방향
- Lombok: `@Getter` / `@Builder` / `@NoArgsConstructor(PROTECTED)` / `@RequiredArgsConstructor` 만. `@Data`·`@Setter` 금지
- 빈 패키지를 미리 만들지 않는다
- 스키마 변경은 Flyway 마이그레이션으로만. **작성된 마이그레이션은 고치지 않고 새 버전을 추가**한다

**테스트 — JUnit 5 + AssertJ + Testcontainers**

- DB가 필요한 테스트는 **실제 PostgreSQL 컨테이너**를 쓴다. **H2 금지** (JSONB·GIN·`gen_random_uuid()` 미지원)
- JPA 슬라이스 테스트는 `support/PostgresJpaTest`, 통합 테스트는 `@SpringBootTest` + `@Import(TestcontainersConfiguration.class)`
- 도메인·Service 단위는 Mockito, 웹은 `@WebMvcTest`
- `@DisplayName`은 한국어 필수, 단정은 AssertJ, 본문은 `// given / // when / // then`
- 완료 기준: `./gradlew test` 통과 + 새 로직에 대응하는 테스트 존재
- Spring Boot 4 / Testcontainers 2는 예제 코드와 패키지·좌표가 다르다 → `backend/docs/conventions.md` 「스택 주의사항」 먼저 확인

### 프론트엔드 (`frontend/`)

- 캔버스 구현 방향은 `docs/canvas-frontend-plan.md`, 성능 근거는 `docs/canvas-spike/README.md`를 따른다
- **프론트 타입은 백엔드 엔티티를 따른다** (예: 피드백 상태는 `Comment`가 아니라 `Feedback`에 있고 값은 `PENDING_REVISION` / `PENDING_CONFIRM` / `CONFIRMED`)
- `frontend/frontend-demo/`는 측정용 프로토타입이다. 제품 코드를 여기서 가져다 붙이지 말고 결론만 반영한다

## 관련 문서

| 문서 | 위치 |
|---|---|
| 코드/작업 컨벤션 | `backend/docs/conventions.md` |
| DB 스키마 | `backend/docs/db-schema.md` |
| 캔버스 JSONB 스키마 | `backend/docs/canvas-schema.md` |
| 캔버스 스파이크 결과 | `docs/canvas-spike/README.md` |
| 캔버스 프로파일링 절차 | `docs/canvas-spike/profiling.md` |
| 캔버스 프론트 구현 계획 | `docs/canvas-frontend-plan.md` |
