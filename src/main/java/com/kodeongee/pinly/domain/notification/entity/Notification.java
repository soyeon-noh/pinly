package com.kodeongee.pinly.domain.notification.entity;

import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import com.kodeongee.pinly.global.entity.BaseCreatedEntity;
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
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 알림.
 *
 * <p>{@code project}가 있으면 프로젝트 알림, 없으면 전체 알림이다.
 * 알림 종류마다 필요한 데이터가 달라 {@code payload}(JSONB)에 담는다.
 */
@Entity
@Getter
@Table(name = "notification")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseCreatedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Builder
    private Notification(User user, Project project, NotificationType type, Map<String, Object> payload) {
        this.user = user;
        this.project = project;
        this.type = type;
        this.payload = payload == null ? Map.of() : payload;
        this.isRead = false;
    }

    /** 읽음으로 표시한다. */
    public void markAsRead() {
        this.isRead = true;
    }
}
