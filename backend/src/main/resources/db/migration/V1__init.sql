-- pinly 초기 스키마
-- 기준 문서: docs/db-schema.md, docs/canvas-schema.md
--
-- 설계 규칙
--   * PK는 UUID (gen_random_uuid() — PostgreSQL 13+ 내장)
--   * 타임스탬프는 TIMESTAMPTZ
--   * 상태·역할은 VARCHAR + CHECK 제약 (Postgres ENUM 타입 미사용 — 마이그레이션 유연성)
--   * FK는 ON DELETE CASCADE 기본, 예외는 해당 위치에 주석으로 명시
--   * 테이블은 부모 → 자식 순서로 생성

-- ---------------------------------------------------------------- 사용자

CREATE TABLE app_user
(
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),                       -- 소셜 전용 계정은 NULL
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE social_account
(
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    provider         VARCHAR(20) NOT NULL,            -- GOOGLE / KAKAO / NAVER ...
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_social_account_provider UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_social_account_user ON social_account (user_id);

-- ---------------------------------------------------------------- 프로젝트

CREATE TABLE project
(
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    share_token   UUID         UNIQUE,                -- 링크 공유용 토큰
    share_enabled BOOLEAN      NOT NULL DEFAULT false,
    share_role    VARCHAR(20)  NOT NULL DEFAULT 'VIEWER',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_project_share_role CHECK (share_role IN ('OWNER', 'EDITOR', 'VIEWER'))
);

CREATE INDEX idx_project_owner ON project (owner_id);

CREATE TABLE project_member
(
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID        NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id),
    CONSTRAINT ck_project_member_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))
);

CREATE INDEX idx_project_member_user ON project_member (user_id);

-- ---------------------------------------------------------------- 캔버스

CREATE TABLE canvas
(
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID        NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    name       VARCHAR(255),
    document   JSONB       NOT NULL DEFAULT
        '{"schemaVersion":1,"stage":{"width":1920,"height":1080,"background":"#FFFFFF"},"elements":[]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_canvas_project ON canvas (project_id);
-- 요소 내부 조회(예: 이미지 s3Key 수집)용. 포함 연산자 전용이라 jsonb_path_ops로 크기를 줄인다.
CREATE INDEX idx_canvas_document ON canvas USING GIN (document jsonb_path_ops);

CREATE TABLE asset
(
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID         NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    uploader_id  UUID         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    s3_key       VARCHAR(512) NOT NULL UNIQUE,
    content_type VARCHAR(100) NOT NULL,
    byte_size    BIGINT       NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_project ON asset (project_id);

-- ---------------------------------------------------------------- 코멘트(핀)

CREATE TABLE comment
(
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id  UUID        NOT NULL REFERENCES canvas (id) ON DELETE CASCADE,
    parent_id  UUID        REFERENCES comment (id) ON DELETE CASCADE,  -- 답글이면 부모 코멘트
    author_id  UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    body       TEXT        NOT NULL,
    pos_x      DOUBLE PRECISION,                      -- 캔버스 좌표 (답글은 NULL)
    pos_y      DOUBLE PRECISION,
    resolved   BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comment_canvas ON comment (canvas_id);
CREATE INDEX idx_comment_parent ON comment (parent_id);

-- ---------------------------------------------------------------- 피드백 로그

CREATE TABLE feedback_log
(
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID         NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_log_project ON feedback_log (project_id);

CREATE TABLE feedback
(
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id     UUID        NOT NULL REFERENCES feedback_log (id) ON DELETE CASCADE,
    -- 연결된 코멘트가 지워져도 피드백 이력은 남긴다 → CASCADE 아님
    comment_id UUID        REFERENCES comment (id) ON DELETE SET NULL,
    content    TEXT        NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVISION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- PENDING_REVISION 수정 대기 / PENDING_CONFIRM 확인 대기 / CONFIRMED 확인됨
    CONSTRAINT ck_feedback_status CHECK (status IN ('PENDING_REVISION', 'PENDING_CONFIRM', 'CONFIRMED'))
);

CREATE INDEX idx_feedback_log ON feedback (log_id);
CREATE INDEX idx_feedback_status ON feedback (status);

-- ---------------------------------------------------------------- 구독

CREATE TABLE plan
(
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(30)   NOT NULL UNIQUE,      -- FREE / PRO ...
    name          VARCHAR(100)  NOT NULL,
    price         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    project_limit INT,                                -- NULL = 무제한
    features      JSONB         NOT NULL DEFAULT '{}'::jsonb,
    is_active     BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE subscription
(
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    -- 구독 이력이 걸린 요금제는 실수로 지울 수 없게 막는다(비활성화는 plan.is_active로) → CASCADE 아님
    plan_id            UUID        NOT NULL REFERENCES plan (id) ON DELETE RESTRICT,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    canceled_at        TIMESTAMPTZ,
    CONSTRAINT ck_subscription_status CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE'))
);

CREATE INDEX idx_subscription_user ON subscription (user_id);

-- ---------------------------------------------------------------- 알림

CREATE TABLE notification
(
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    project_id UUID        REFERENCES project (id) ON DELETE CASCADE,
    type       VARCHAR(40) NOT NULL,                  -- COMMENT_ADDED / FEEDBACK_STATUS ...
    payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    is_read    BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_user_unread ON notification (user_id, is_read);

CREATE TABLE notification_setting
(
    user_id       UUID    PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    preferences   JSONB   NOT NULL DEFAULT '{}'::jsonb
);
