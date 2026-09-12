package com.kodeongee.pinly.support;

import com.kodeongee.pinly.domain.canvas.entity.Canvas;
import com.kodeongee.pinly.domain.feedback.entity.FeedbackLog;
import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import java.util.concurrent.atomic.AtomicLong;

/** 테스트에서 반복되는 최소 엔티티를 만드는 헬퍼. 검증 대상이 아닌 값은 기본값으로 채운다. */
public final class TestFixtures {

    private static final AtomicLong SEQUENCE = new AtomicLong();

    private TestFixtures() {
    }

    /** 이메일이 매번 다른 사용자. UNIQUE 제약을 피하려고 시퀀스를 붙인다. */
    public static User user() {
        long seq = SEQUENCE.incrementAndGet();
        return User.builder()
                .email("user%d@pinly.test".formatted(seq))
                .name("작가%d".formatted(seq))
                .build();
    }

    public static Project project(User owner) {
        return Project.builder()
                .owner(owner)
                .name("1화 콘티")
                .build();
    }

    public static Canvas canvas(Project project) {
        return Canvas.builder()
                .project(project)
                .name("1page")
                .build();
    }

    public static FeedbackLog feedbackLog(Project project) {
        return FeedbackLog.builder()
                .project(project)
                .name("1화 피드백")
                .build();
    }
}
