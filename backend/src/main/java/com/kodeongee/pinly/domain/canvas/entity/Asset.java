package com.kodeongee.pinly.domain.canvas.entity;

import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import com.kodeongee.pinly.global.entity.BaseCreatedEntity;
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

/**
 * 업로드 이미지 메타데이터.
 *
 * <p>캔버스 문서는 {@code s3Key}만 참조하므로, 실제 업로드 파일 추적·정리·용량 산정을 위해
 * 별도로 기록한다. presigned URL은 만료되므로 저장하지 않는다.
 */
@Entity
@Getter
@Table(name = "asset")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Asset extends BaseCreatedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploader_id", nullable = false)
    private User uploader;

    @Column(name = "s3_key", nullable = false, unique = true, length = 512)
    private String s3Key;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "byte_size", nullable = false)
    private long byteSize;

    @Builder
    private Asset(Project project, User uploader, String s3Key, String contentType, long byteSize) {
        this.project = project;
        this.uploader = uploader;
        this.s3Key = s3Key;
        this.contentType = contentType;
        this.byteSize = byteSize;
    }
}
