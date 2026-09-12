package com.kodeongee.pinly.domain.feedback.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import com.kodeongee.pinly.support.PostgresJpaTest;
import com.kodeongee.pinly.support.TestFixtures;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;

@PostgresJpaTest
@DisplayName("피드백 상태 매핑")
class FeedbackPersistenceTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("FeedbackStatus의 모든 값이 CHECK 제약을 통과한다")
    void everyStatusSatisfiesCheckConstraint() {
        // given
        User owner = entityManager.persist(TestFixtures.user());
        Project project = entityManager.persist(TestFixtures.project(owner));
        FeedbackLog log = entityManager.persist(TestFixtures.feedbackLog(project));

        // when — enum에 값이 추가되면 CHECK 제약도 따라와야 하므로 values()를 그대로 돈다
        Arrays.stream(FeedbackStatus.values()).forEach(status -> {
            Feedback feedback = Feedback.builder().log(log).content(status.name() + " 항목").build();
            feedback.changeStatus(status);
            entityManager.persist(feedback);
        });
        entityManager.flush();

        // then
        List<String> saved = jdbcTemplate.queryForList(
                "SELECT status FROM feedback WHERE log_id = ? ORDER BY status", String.class, log.getId());
        assertThat(saved).containsExactlyInAnyOrder(
                Arrays.stream(FeedbackStatus.values()).map(Enum::name).toArray(String[]::new));
    }

    @Test
    @DisplayName("새 피드백은 수정 대기 상태로 시작한다")
    void startsAsPendingRevision() {
        // given
        User owner = entityManager.persist(TestFixtures.user());
        Project project = entityManager.persist(TestFixtures.project(owner));
        FeedbackLog log = entityManager.persist(TestFixtures.feedbackLog(project));

        // when
        Feedback feedback = entityManager.persist(
                Feedback.builder().log(log).content("3컷 명암 조정").build());
        entityManager.flush();
        entityManager.clear();

        // then
        Feedback found = entityManager.find(Feedback.class, feedback.getId());
        assertThat(found.getStatus()).isEqualTo(FeedbackStatus.PENDING_REVISION);
        assertThat(found.getComment()).isNull();
    }
}
