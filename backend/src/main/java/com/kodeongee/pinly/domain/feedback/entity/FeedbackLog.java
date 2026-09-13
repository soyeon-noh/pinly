package com.kodeongee.pinly.domain.feedback.entity;

import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** 피드백 로그 — 피드백 항목을 묶는 보드. 이름을 바꿀 수 있다. */
@Entity
@Getter
@Table(name = "feedback_log")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeedbackLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 255)
    private String name;

    @Builder
    private FeedbackLog(Project project, String name) {
        this.project = project;
        this.name = name;
    }

    /** 로그 이름을 변경한다. */
    public void rename(String name) {
        this.name = name;
    }
}
