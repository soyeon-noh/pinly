package com.kodeongee.pinly.domain.canvas.entity;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 캔버스 — 프로젝트의 작업 공간. 시각 요소를 JSONB 문서 한 덩어리로 저장한다.
 *
 * <p>문서 구조는 {@code docs/canvas-schema.md} 참고. 요약하면
 * {@code {schemaVersion, stage:{width,height,background}, elements:[...]}} 이고,
 * {@code elements}의 배열 순서가 곧 z-order다.
 *
 * <p>핀(코멘트)은 이 문서에 넣지 않는다. 작성자·답글·해결 상태 쿼리가 필요하므로
 * 관계형 {@code comment} 테이블에 저장한다.
 */
@Entity
@Getter
@Table(name = "canvas")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Canvas extends BaseTimeEntity {

    /** 문서 구조가 바뀌면 올린다. 마이그레이션 기준값. */
    public static final int CURRENT_SCHEMA_VERSION = 1;

    private static final int DEFAULT_STAGE_WIDTH = 1920;
    private static final int DEFAULT_STAGE_HEIGHT = 1080;
    private static final String DEFAULT_BACKGROUND = "#FFFFFF";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(length = 255)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> document;

    @Builder
    private Canvas(Project project, String name, Map<String, Object> document) {
        this.project = project;
        this.name = name;
        this.document = document == null ? emptyDocument() : document;
    }

    /** 빈 캔버스 문서. 마이그레이션의 컬럼 기본값과 같은 모양이다. */
    public static Map<String, Object> emptyDocument() {
        Map<String, Object> stage = new LinkedHashMap<>();
        stage.put("width", DEFAULT_STAGE_WIDTH);
        stage.put("height", DEFAULT_STAGE_HEIGHT);
        stage.put("background", DEFAULT_BACKGROUND);

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("schemaVersion", CURRENT_SCHEMA_VERSION);
        document.put("stage", stage);
        document.put("elements", List.of());
        return document;
    }

    /**
     * 문서를 통째로 덮어쓴다.
     *
     * <p>MVP는 단일 편집 기준이라 부분 갱신 대신 마지막 저장 우선으로 처리한다.
     */
    public void replaceDocument(Map<String, Object> document) {
        this.document = document;
    }

    /** 캔버스(페이지) 이름을 변경한다. */
    public void rename(String name) {
        this.name = name;
    }
}
