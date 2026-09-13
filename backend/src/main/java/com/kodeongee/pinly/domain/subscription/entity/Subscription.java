package com.kodeongee.pinly.domain.subscription.entity;

import com.kodeongee.pinly.domain.user.entity.User;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자 구독.
 *
 * <p>업그레이드·다운그레이드는 새 행을 만들지 않고 {@code plan}을 갱신한다.
 */
@Entity
@Getter
@Table(name = "subscription")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;

    @Column(name = "canceled_at")
    private Instant canceledAt;

    @Builder
    private Subscription(User user, Plan plan, Instant currentPeriodEnd) {
        this.user = user;
        this.plan = plan;
        this.currentPeriodEnd = currentPeriodEnd;
        this.status = SubscriptionStatus.ACTIVE;
    }

    @PrePersist
    void initStartedAt() {
        if (this.startedAt == null) {
            this.startedAt = Instant.now();
        }
    }

    /** 요금제를 변경한다(업그레이드·다운그레이드). */
    public void changePlan(Plan plan) {
        this.plan = plan;
    }

    /** 구독을 취소한다. 남은 기간은 {@code currentPeriodEnd}까지 유지된다. */
    public void cancel() {
        this.status = SubscriptionStatus.CANCELED;
        this.canceledAt = Instant.now();
    }

    /** 결제 실패로 연체 처리한다. */
    public void markPastDue() {
        this.status = SubscriptionStatus.PAST_DUE;
    }
}
