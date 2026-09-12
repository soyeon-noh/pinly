package com.kodeongee.pinly.domain.project.entity;

import com.kodeongee.pinly.domain.user.entity.User;
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
 * 프로젝트 — 하나의 작업 단위.
 *
 * <p>캔버스·코멘트·피드백 로그를 묶는 최상위 단위이고, {@code shareToken}으로 링크 공유가 가능하다.
 */
@Entity
@Getter
@Table(name = "project")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Project extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "share_token", unique = true)
    private UUID shareToken;

    @Column(name = "share_enabled", nullable = false)
    private boolean shareEnabled;

    @Enumerated(EnumType.STRING)
    @Column(name = "share_role", nullable = false, length = 20)
    private ProjectRole shareRole;

    @Builder
    private Project(User owner, String name) {
        this.owner = owner;
        this.name = name;
        this.shareEnabled = false;
        this.shareRole = ProjectRole.VIEWER;
    }

    /** 프로젝트 이름을 변경한다. */
    public void rename(String name) {
        this.name = name;
    }

    /**
     * 링크 공유를 켜고 새 토큰을 발급한다.
     *
     * <p>이전 토큰은 무효가 되므로, 유출된 링크를 끊는 용도로도 쓸 수 있다.
     */
    public void enableShare(ProjectRole shareRole) {
        this.shareEnabled = true;
        this.shareRole = shareRole;
        this.shareToken = UUID.randomUUID();
    }

    /** 링크 공유를 끄고 토큰을 폐기한다. */
    public void disableShare() {
        this.shareEnabled = false;
        this.shareToken = null;
    }
}
