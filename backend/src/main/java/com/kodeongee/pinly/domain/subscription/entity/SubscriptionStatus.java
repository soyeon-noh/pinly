package com.kodeongee.pinly.domain.subscription.entity;

/** 구독 상태. DB의 {@code ck_subscription_status} CHECK 제약과 값이 일치해야 한다. */
public enum SubscriptionStatus {

    /** 정상 이용 중. */
    ACTIVE,

    /** 사용자가 취소함. */
    CANCELED,

    /** 결제 실패 등으로 연체. */
    PAST_DUE
}
