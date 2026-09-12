package com.kodeongee.pinly.domain.feedback.entity;

import com.kodeongee.pinly.domain.comment.entity.Comment;
import com.kodeongee.pinly.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 피드백 항목 — 로그에 속한 개별 처리 단위.
 *
 * <p>캔버스 코멘트에서 "할 일로 열기"로 만들어진 경우 {@code comment}가 연결된다.
 * 코멘트가 삭제되면 연결만 끊기고({@code ON DELETE SET NULL}) 피드백 이력은 남는다.
 */
@Entity
@Getter
@Table(name = "feedback")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feedback extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "log_id", nullable = false)
    private FeedbackLog log;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private Comment comment;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeedbackStatus status;

    @Builder
    private Feedback(FeedbackLog log, Comment comment, String content) {
        this.log = log;
        this.comment = comment;
        this.content = content;
        this.status = FeedbackStatus.PENDING_REVISION;
    }

    /** 내용을 수정한다. */
    public void editContent(String content) {
        this.content = content;
    }

    /** 상태를 변경한다. */
    public void changeStatus(FeedbackStatus status) {
        this.status = status;
    }

    /** 캔버스 코멘트와 연결한다. */
    public void linkComment(Comment comment) {
        this.comment = comment;
    }
}
