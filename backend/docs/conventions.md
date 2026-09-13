# pinly — 코드/작업 컨벤션

> 이 문서는 Claude Code와 사람이 **동일한 규칙으로 코드를 쓰기 위한 기준**이다.
> 요약은 루트 `CLAUDE.md`의 「코드/작업 규칙」에 있고, 상세는 여기에 둔다.

---

## 1. 패키지 구조 — 도메인형

기능(도메인) 단위로 먼저 나누고, 그 안에서 계층을 나눈다. 레이어형(`controller/`, `service/`를 최상위에 두는 방식)은 쓰지 않는다.

```
com.kodeongee.pinly
├── PinlyApplication.java
├── global/                     # 도메인에 속하지 않는 횡단 관심사
│   ├── config/                 # SecurityConfig, JpaConfig, WebConfig, S3Config
│   ├── error/                  # BusinessException, ErrorCode, GlobalExceptionHandler
│   ├── security/               # JWT 발급·검증, OAuth2 성공 핸들러, @AuthUser
│   ├── entity/                 # BaseTimeEntity (created_at / updated_at)
│   └── util/
└── domain/
    ├── user/                   # User, SocialAccount
    │   ├── controller/
    │   ├── service/
    │   ├── repository/
    │   ├── entity/
    │   └── dto/
    ├── project/                # Project, ProjectMember, ProjectRole
    ├── canvas/                 # Canvas(JSONB document), Asset
    ├── comment/                # Comment (핀 + 답글 자기참조)
    ├── feedback/               # FeedbackLog, Feedback, FeedbackStatus
    ├── subscription/           # Plan, Subscription, SubscriptionStatus
    └── notification/           # Notification, NotificationSetting, NotificationType
```

각 도메인 패키지는 `controller / service / repository / entity / dto` 5개 하위 패키지를 기본으로 하고, **필요할 때만 만든다**(빈 패키지 미리 만들지 않음).

### 도메인 경계 규칙

- 다른 도메인의 **Repository를 직접 주입하지 않는다.** 도메인 간 호출은 Service → Service 로만.
- 엔티티 연관관계는 **항상 `FetchType.LAZY`**. 양방향 매핑은 정말 필요할 때만(기본은 단방향).
- **엔티티를 Controller 밖(HTTP 응답)으로 노출하지 않는다.** 응답·요청은 `dto`의 `record`로.
- DTO 변환은 DTO 쪽 정적 팩토리(`ProjectResponse.from(project)`)에 둔다. 별도 Mapper 클래스는 만들지 않는다.

### Lombok 사용 범위

- 허용: `@Getter`, `@Builder`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`, `@RequiredArgsConstructor`
- 금지: `@Data`, `@Setter`, `@AllArgsConstructor`(public), 엔티티의 `@ToString`/`@EqualsAndHashCode`(연관관계 순환)
- 엔티티 상태 변경은 **의도가 드러나는 메서드**로 (`comment.resolve()`, `feedback.changeStatus(...)`)

### enum / JSONB

- 상태값은 Java `enum` + `@Enumerated(EnumType.STRING)`, DB는 VARCHAR + CHECK 제약 (`docs/db-schema.md` 기준)
- JSONB는 Hibernate 6 방식: `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"`
- 마이그레이션은 Flyway `src/main/resources/db/migration/V{n}__{설명}.sql`. **작성된 마이그레이션은 수정하지 않고 새 버전을 추가한다.**

---

## 2. 커밋 컨벤션 — Conventional Commits + 한국어 본문

```
<type>(<scope>): <한국어 요약, 50자 이내, 마침표 없음>

<본문 — 한국어. 무엇을 왜 바꿨는지. 한 줄 72자에서 줄바꿈.
 - 항목이 여러 개면 불릿으로>

<푸터 — 이슈 참조, Co-Authored-By 등>
```

### type

| type | 사용 시점 |
|---|---|
| `feat` | 사용자에게 드러나는 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서만 변경 (`docs/`, `CLAUDE.md`, 주석) |
| `build` | Gradle, 의존성, Dockerfile |
| `ci` | CI 설정 |
| `chore` | 그 외 (설정 파일, 스캐폴드, 정리) |

### scope

도메인 패키지 이름을 쓴다: `user` / `project` / `canvas` / `comment` / `feedback` / `subscription` / `notification`.
횡단 관심사는 `global`, DB 마이그레이션은 `db`. 전체에 걸치거나 해당 없으면 **scope 생략**.

### 규칙

- 제목은 한국어, 명령형보다 **"~추가 / ~수정 / ~제거"** 형태를 쓴다 (예: `feat(comment): 핀 좌표 기반 코멘트 생성 API 추가`)
- 제목 끝에 마침표를 붙이지 않는다
- 한 커밋은 한 가지 의도만. 기능 + 리팩터링을 섞지 않는다
- 파괴적 변경은 `feat(project)!:` 또는 푸터에 `BREAKING CHANGE:`
- Claude가 만든 커밋은 푸터에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### 예시

```
feat(feedback): 피드백 상태 전이 API 추가

수정 대기 → 확인 대기 → 확인됨 순서만 허용하고, 역방향 전이는
FeedbackStatus에서 검증해 BusinessException으로 막는다.

- PATCH /api/feedbacks/{id}/status
- 캔버스 코멘트와 연결된 경우 comment.resolved 동기화
```

---

## 3. 테스트 — JUnit 5 + Testcontainers

### 계층별 전략

| 대상 | 방식 | DB |
|---|---|---|
| 도메인 로직, 상태 전이, 순수 계산 | 애노테이션 없는 POJO 테스트 (+ Mockito) | 없음 |
| Service 단위 | `@ExtendWith(MockitoExtension.class)` | 없음 |
| Repository, JSONB 매핑, 마이그레이션 | `@PostgresJpaTest` | 실제 PostgreSQL |
| Controller / 직렬화 / 검증 | `@WebMvcTest` + `MockMvc` | 없음 |
| 인수·통합 시나리오 | `@SpringBootTest` + `@Import(TestcontainersConfiguration.class)` | 실제 PostgreSQL |

- **H2는 쓰지 않는다.** `JSONB`, `GIN` 인덱스, `gen_random_uuid()`를 지원하지 않아 마이그레이션이 프로덕션과 달라진다.
- PostgreSQL 컨테이너는 `src/test/java/com/kodeongee/pinly/support/TestcontainersConfiguration.java` 한 곳에서 정의하고 `@ServiceConnection`으로 주입한다. 테스트마다 컨테이너를 새로 만들지 않는다.
- 컨테이너 이미지는 `postgres:16-alpine` 고정.
- DB가 필요한 슬라이스 테스트는 `support/PostgresJpaTest` 합성 애노테이션을 붙인다. `@DataJpaTest`는 기본적으로 DataSource를 내장 DB로 교체하려 하는데, 이 애노테이션이 그 교체를 끄고(`@AutoConfigureTestDatabase(replace = NONE)`) 컨테이너를 물린다.
- 반복 픽스처는 `support/TestFixtures`에 모은다. 검증 대상이 아닌 필드는 기본값으로 채운다.
- 엔티티와 마이그레이션이 어긋나면 부팅이 실패하도록 `spring.jpa.hibernate.ddl-auto=validate`를 켜 두었다. **Hibernate는 DDL을 만들지 않는다** — 스키마를 바꾸는 유일한 수단은 Flyway 마이그레이션이다.

### 작성 규칙

- 클래스명 `{대상}Test`, 파일 위치는 프로덕션 패키지와 동일하게
- **`@DisplayName`은 한국어로 필수** (클래스·메서드 모두). 메서드 이름 자체는 영어 스네이크/카멜
- 본문은 `// given / // when / // then` 주석으로 구분
- 단정은 **AssertJ** (`assertThat`). JUnit `Assertions`나 Hamcrest는 쓰지 않는다
- 예외는 `assertThatThrownBy(...).isInstanceOf(...)`로 타입까지 검증
- 테스트 간 상태 공유 금지. `@Transactional` 롤백에 의존하는 통합 테스트는 지양하고 필요한 데이터를 직접 만든다

### 스택 주의사항 (Spring Boot 4 / Testcontainers 2)

버전이 앞서 있어 검색으로 나오는 예제 코드 대부분과 좌표·패키지가 다르다.

- Testcontainers 2.x는 모듈 좌표가 `org.testcontainers:testcontainers-*` 로 바뀌었다 (`org.testcontainers:postgresql` → `testcontainers-postgresql`)
- 컨테이너 클래스도 이동했다: `org.testcontainers.containers.PostgreSQLContainer`(deprecated) → **`org.testcontainers.postgresql.PostgreSQLContainer`**, 제네릭 파라미터 없음
- Boot 4는 테스트 애노테이션 패키지를 재배치했다
  - `@DataJpaTest` → `org.springframework.boot.data.jpa.test.autoconfigure`
  - `TestEntityManager` → `org.springframework.boot.jpa.test.autoconfigure`
  - `@AutoConfigureTestDatabase` → `org.springframework.boot.jdbc.test.autoconfigure`
- Boot 4는 `spring-boot-starter-test` 하나가 아니라 모듈별 `spring-boot-starter-*-test` 로 나뉘어 있다

### 실행

```bash
./gradlew test
```

Testcontainers를 쓰는 테스트는 **Docker 데몬이 떠 있어야 한다.** 컨테이너 재사용을 켜면 반복 실행이 빨라진다 (`~/.testcontainers.properties`에 `testcontainers.reuse.enable=true`).

### 완료 기준

기능 작업은 다음을 만족해야 완료로 본다.
- [ ] `./gradlew test` 통과
- [ ] 새 로직에 대응하는 테스트가 위 표의 계층 중 최소 한 곳에 있다
- [ ] 마이그레이션을 추가했다면 Testcontainers 기반 테스트로 적용을 확인했다

---

## 4. 응답 언어

Claude Code의 설명·커밋 메시지·`@DisplayName`·주석은 **한국어**. 코드 식별자(클래스·메서드·변수)는 영어.
