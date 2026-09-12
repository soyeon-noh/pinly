package com.kodeongee.pinly.global.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import java.time.Instant;
import lombok.Getter;

/**
 * 생성 시각만 추적하는 엔티티의 공통 상위 타입.
 *
 * <p>수정 시각까지 필요하면 {@link BaseTimeEntity}를 상속한다.
 * 시각 갱신은 DB 트리거가 아니라 JPA 생명주기 콜백 한 곳에서만 처리한다.
 */
@Getter
@MappedSuperclass
public abstract class BaseCreatedEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void initCreatedAt() {
        this.createdAt = Instant.now();
    }
}
