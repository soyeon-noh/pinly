package com.kodeongee.pinly.domain.feedback.entity;

/**
 * 피드백 처리 상태.
 *
 * <p>진행 순서는 {@code PENDING_REVISION → PENDING_CONFIRM → CONFIRMED}.
 * DB의 {@code ck_feedback_status} CHECK 제약과 값이 일치해야 한다.
 */
public enum FeedbackStatus {

    /** 수정 대기 — 피드백이 등록되고 아직 반영되지 않음. */
    PENDING_REVISION,

    /** 확인 대기 — 작가가 반영했고 요청자의 확인을 기다림. */
    PENDING_CONFIRM,

    /** 확인됨 — 요청자가 반영 결과를 확인함. */
    CONFIRMED
}
