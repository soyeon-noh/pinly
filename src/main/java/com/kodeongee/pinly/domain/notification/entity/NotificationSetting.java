package com.kodeongee.pinly.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 사용자별 알림 설정. 사용자와 1:1이라 {@code user_id}가 곧 PK다.
 *
 * <p>User 연관을 걸지 않고 ID만 들고 있다 — 이 엔티티는 User를 탐색할 일이 없고,
 * 알림 도메인이 사용자 도메인에 의존할 이유도 없다.
 */
@Entity
@Getter
@Table(name = "notification_setting")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSetting {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled;

    /** 알림 종류별 on/off 확장용. 키는 {@link NotificationType} 이름을 쓴다. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> preferences;

    @Builder
    private NotificationSetting(UUID userId, boolean emailEnabled, Map<String, Object> preferences) {
        this.userId = userId;
        this.emailEnabled = emailEnabled;
        this.preferences = preferences == null ? Map.of() : preferences;
    }

    /** 기본 설정(이메일 알림 켜짐)으로 만든다. */
    public static NotificationSetting createDefault(UUID userId) {
        return NotificationSetting.builder()
                .userId(userId)
                .emailEnabled(true)
                .build();
    }

    /** 이메일 알림 수신 여부를 변경한다. */
    public void changeEmailEnabled(boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
    }

    /** 알림 종류별 설정을 통째로 교체한다. */
    public void replacePreferences(Map<String, Object> preferences) {
        this.preferences = preferences;
    }
}
