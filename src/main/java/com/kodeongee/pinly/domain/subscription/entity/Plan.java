package com.kodeongee.pinly.domain.subscription.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 요금제 카탈로그.
 *
 * <p>구독 이력이 걸려 있으므로 요금제는 삭제하지 않고 {@code isActive}로 비활성화한다.
 */
@Entity
@Getter
@Table(name = "plan")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    /** 프로젝트 개수 제한. {@code null}이면 무제한. */
    @Column(name = "project_limit")
    private Integer projectLimit;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> features;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Builder
    private Plan(String code, String name, BigDecimal price, Integer projectLimit, Map<String, Object> features) {
        this.code = code;
        this.name = name;
        this.price = price;
        this.projectLimit = projectLimit;
        this.features = features == null ? Map.of() : features;
        this.isActive = true;
    }

    /** 프로젝트를 더 만들 수 있는지 판단한다. 제한이 없으면 항상 참. */
    public boolean allowsMoreProjects(long currentProjectCount) {
        return this.projectLimit == null || currentProjectCount < this.projectLimit;
    }

    /** 신규 구독을 받지 않도록 비활성화한다. */
    public void deactivate() {
        this.isActive = false;
    }
}
