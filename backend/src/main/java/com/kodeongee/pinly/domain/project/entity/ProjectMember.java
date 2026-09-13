package com.kodeongee.pinly.domain.project.entity;

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
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 프로젝트 참여자 — 링크·초대로 들어온 협업자. */
@Entity
@Getter
@Table(
        name = "project_member",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_project_member",
                columnNames = {"project_id", "user_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectMember extends BaseCreatedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectRole role;

    @Builder
    private ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project;
        this.user = user;
        this.role = role == null ? ProjectRole.EDITOR : role;
    }

    /** 참여자 권한을 변경한다. */
    public void changeRole(ProjectRole role) {
        this.role = role;
    }
}
