-- 기본 요금제 시드
-- 무료 플랜은 프로젝트 3개 제한(정식 출시 시). 재실행 안전하도록 code 기준 멱등 처리.

INSERT INTO plan (code, name, price, project_limit, features, is_active)
VALUES ('FREE', '무료', 0, 3, '{}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;
