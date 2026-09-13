package com.kodeongee.pinly.domain.comment.entity;

import com.kodeongee.pinly.domain.canvas.entity.Canvas;
import com.kodeongee.pinly.domain.user.entity.User;
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

/**
 * 코멘트 — 캔버스 특정 좌표에 붙는 핀, 또는 핀에 달린 답글.
 *
 * <p>핀은 {@code posX/posY}를 가지고 DOM 오버레이로 렌더된다. 답글은 좌표가 없고
 * {@code parent}만 가진다. 좌표는 화면 좌표가 아니라 캔버스(stage) 좌표계 기준이다.
 */
@Entity
@Getter
@Table(name = "comment")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canvas_id", nullable = false)
    private Canvas canvas;

    /** 답글이면 부모 핀, 핀 자체면 {@code null}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "pos_x")
    private Double posX;

    @Column(name = "pos_y")
    private Double posY;

    @Column(nullable = false)
    private boolean resolved;

    private Comment(Canvas canvas, Comment parent, User author, String body, Double posX, Double posY) {
        this.canvas = canvas;
        this.parent = parent;
        this.author = author;
        this.body = body;
        this.posX = posX;
        this.posY = posY;
        this.resolved = false;
    }

    /** 캔버스 좌표에 새 핀을 만든다. */
    public static Comment pin(Canvas canvas, User author, String body, double posX, double posY) {
        return new Comment(canvas, null, author, body, posX, posY);
    }

    /** 핀에 답글을 단다. 답글은 좌표를 갖지 않는다. */
    public static Comment reply(Comment parent, User author, String body) {
        return new Comment(parent.getCanvas(), parent, author, body, null, null);
    }

    /** 답글 여부. */
    public boolean isReply() {
        return this.parent != null;
    }

    /** 본문을 수정한다. */
    public void editBody(String body) {
        this.body = body;
    }

    /** 핀 위치를 옮긴다. */
    public void moveTo(double posX, double posY) {
        this.posX = posX;
        this.posY = posY;
    }

    /** 해결됨으로 표시한다. */
    public void resolve() {
        this.resolved = true;
    }

    /** 해결됨 표시를 되돌린다. */
    public void reopen() {
        this.resolved = false;
    }
}
