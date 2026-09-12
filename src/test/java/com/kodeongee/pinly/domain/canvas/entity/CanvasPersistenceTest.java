package com.kodeongee.pinly.domain.canvas.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import com.kodeongee.pinly.support.PostgresJpaTest;
import com.kodeongee.pinly.support.TestFixtures;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;

@PostgresJpaTest
@DisplayName("캔버스 JSONB 문서 매핑")
class CanvasPersistenceTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Project project;

    @BeforeEach
    void setUp() {
        User owner = entityManager.persist(TestFixtures.user());
        this.project = entityManager.persist(TestFixtures.project(owner));
    }

    /** JSONB는 {@code Map<String, Object>}로 읽히지만 중첩 값은 {@code Object}라 캐스팅이 필요하다. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        return (Map<String, Object>) value;
    }

    @Test
    @DisplayName("새 캔버스는 빈 문서(schemaVersion 1, 요소 0개)로 저장된다")
    void savesEmptyDocumentByDefault() {
        // given
        Canvas canvas = entityManager.persist(TestFixtures.canvas(project));

        // when
        entityManager.flush();
        entityManager.clear();
        Canvas found = entityManager.find(Canvas.class, canvas.getId());

        // then
        assertThat(found.getDocument())
                .containsEntry("schemaVersion", Canvas.CURRENT_SCHEMA_VERSION)
                .containsEntry("elements", List.of());
        assertThat(asMap(found.getDocument().get("stage")))
                .containsEntry("width", 1920)
                .containsEntry("background", "#FFFFFF");
    }

    @Test
    @DisplayName("이미지·텍스트·드로잉 요소가 중첩 구조 그대로 왕복한다")
    void roundTripsNestedElements() {
        // given
        Map<String, Object> document = Canvas.emptyDocument();
        document.put("elements", List.of(
                Map.of("id", "el_img_a1", "type", "image", "x", 0, "y", 0,
                        "s3Key", "projects/p1/canvas/a.png", "width", 400, "height", 600),
                Map.of("id", "el_txt_b2", "type", "text", "x", 200, "y", 150,
                        "text", "여기 명암 수정 필요", "fontSize", 18, "fill", "#292C28"),
                Map.of("id", "el_draw_c3", "type", "drawing", "x", 0, "y", 0,
                        "points", List.of(10, 20, 15, 40, 30, 55), "stroke", "#1AE46E", "tension", 0.4)));
        Canvas canvas = Canvas.builder().project(project).name("1page").document(document).build();
        entityManager.persist(canvas);

        // when
        entityManager.flush();
        entityManager.clear();
        Canvas found = entityManager.find(Canvas.class, canvas.getId());

        // then
        List<?> elements = (List<?>) found.getDocument().get("elements");
        assertThat(elements).hasSize(3);
        assertThat(asMap(elements.get(0))).containsEntry("s3Key", "projects/p1/canvas/a.png");
        assertThat(asMap(elements.get(1))).containsEntry("text", "여기 명암 수정 필요");
        assertThat(asMap(elements.get(2))).containsEntry("points", List.of(10, 20, 15, 40, 30, 55));
    }

    @Test
    @DisplayName("저장된 문서를 JSONB 연산자로 조회할 수 있다")
    void queriesDocumentWithJsonbOperators() {
        // given
        Map<String, Object> document = Canvas.emptyDocument();
        document.put("elements", List.of(
                Map.of("id", "el_img_a1", "type", "image", "s3Key", "projects/p1/canvas/a.png"),
                Map.of("id", "el_img_a2", "type", "image", "s3Key", "projects/p1/canvas/b.png"),
                Map.of("id", "el_txt_b1", "type", "text", "text", "메모")));
        Canvas canvas = Canvas.builder().project(project).document(document).build();
        entityManager.persist(canvas);
        entityManager.flush();
        UUID canvasId = canvas.getId();

        // when — docs/canvas-schema.md의 "이미지 목록 추출" 쿼리
        List<String> s3Keys = jdbcTemplate.queryForList(
                """
                SELECT el ->> 's3Key'
                FROM canvas, jsonb_array_elements(document -> 'elements') AS el
                WHERE canvas.id = ? AND el ->> 'type' = 'image'
                """,
                String.class, canvasId);
        Integer elementCount = jdbcTemplate.queryForObject(
                "SELECT jsonb_array_length(document -> 'elements') FROM canvas WHERE id = ?",
                Integer.class, canvasId);

        // then
        assertThat(s3Keys).containsExactly("projects/p1/canvas/a.png", "projects/p1/canvas/b.png");
        assertThat(elementCount).isEqualTo(3);
    }

    @Test
    @DisplayName("문서를 덮어쓰면 updated_at이 갱신된다")
    void touchesUpdatedAtOnDocumentReplace() {
        // given
        Canvas canvas = entityManager.persist(TestFixtures.canvas(project));
        entityManager.flush();
        var savedAt = canvas.getUpdatedAt();

        // when
        canvas.replaceDocument(Canvas.emptyDocument());
        entityManager.flush();

        // then
        assertThat(canvas.getCreatedAt()).isNotNull();
        assertThat(canvas.getUpdatedAt()).isAfterOrEqualTo(savedAt);
    }
}
