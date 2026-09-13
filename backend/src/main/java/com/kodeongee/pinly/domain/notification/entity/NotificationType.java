package com.kodeongee.pinly.domain.notification.entity;

/**
 * 알림 종류.
 *
 * <p>DB 컬럼은 VARCHAR(40)이고 CHECK 제약을 걸지 않았다 — 알림 종류는 기능이 늘 때마다
 * 추가되므로, 값을 추가할 때 마이그레이션까지 따라가지 않도록 앱 레벨에서만 검증한다.
 */
public enum NotificationType {

    /** 코멘트가 새로 달림. */
    COMMENT_ADDED,

    /** 코멘트에 답글이 달림. */
    COMMENT_REPLIED,

    /** 피드백 상태가 바뀜. */
    FEEDBACK_STATUS,

    /** 프로젝트에 초대됨. */
    PROJECT_INVITED
}
