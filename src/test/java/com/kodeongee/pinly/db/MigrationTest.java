package com.kodeongee.pinly.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kodeongee.pinly.support.PostgresJpaTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@PostgresJpaTest
@DisplayName("Flyway 마이그레이션")
class MigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("docs/db-schema.md의 13개 테이블이 모두 생성된다")
    void createsAllTables() {
        // given
        List<String> expected = List.of(
                "app_user", "asset", "canvas", "comment", "feedback", "feedback_log",
                "notification", "notification_setting", "plan", "project", "project_member",
                "social_account", "subscription");

        // when
        List<String> actual = jdbcTemplate.queryForList(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                  AND table_name <> 'flyway_schema_history'
                ORDER BY table_name
                """,
                String.class);

        // then
        assertThat(actual).containsExactlyElementsOf(expected);
    }

    @Test
    @DisplayName("캔버스 문서에 GIN 인덱스가 걸린다")
    void createsGinIndexOnCanvasDocument() {
        // when
        String indexDefinition = jdbcTemplate.queryForObject(
                "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_canvas_document'", String.class);

        // then
        assertThat(indexDefinition)
                .contains("USING gin")
                .contains("jsonb_path_ops");
    }

    @Test
    @DisplayName("V2에서 무료 요금제가 프로젝트 3개 제한으로 시드된다")
    void seedsFreePlan() {
        // when
        Integer projectLimit = jdbcTemplate.queryForObject(
                "SELECT project_limit FROM plan WHERE code = 'FREE'", Integer.class);

        // then
        assertThat(projectLimit).isEqualTo(3);
    }

    @Test
    @DisplayName("피드백 상태 CHECK 제약이 정의되지 않은 값을 거부한다")
    void rejectsUnknownFeedbackStatus() {
        // given — FK를 타지 않도록 존재하지 않는 log_id를 넣어도 CHECK가 먼저 걸리는지가 아니라,
        // 실제 행 삽입 경로에서 거부되는지를 본다. 그래서 유효한 부모 행을 먼저 만든다.
        String userId = jdbcTemplate.queryForObject(
                "INSERT INTO app_user (email, name) VALUES ('check@pinly.test', '테스터') RETURNING id::text",
                String.class);
        String projectId = jdbcTemplate.queryForObject(
                "INSERT INTO project (owner_id, name) VALUES (?::uuid, '검증용') RETURNING id::text",
                String.class, userId);
        String logId = jdbcTemplate.queryForObject(
                "INSERT INTO feedback_log (project_id, name) VALUES (?::uuid, '로그') RETURNING id::text",
                String.class, projectId);

        // when & then
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO feedback (log_id, content, status) VALUES (?::uuid, '내용', 'DONE')", logId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_feedback_status");
    }
}
