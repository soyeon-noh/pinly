package com.kodeongee.pinly.domain.comment.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.kodeongee.pinly.domain.canvas.entity.Canvas;
import com.kodeongee.pinly.domain.project.entity.Project;
import com.kodeongee.pinly.domain.user.entity.User;
import com.kodeongee.pinly.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("코멘트(핀)")
class CommentTest {

    private Canvas canvas;
    private User author;

    @BeforeEach
    void setUp() {
        this.author = TestFixtures.user();
        Project project = TestFixtures.project(author);
        this.canvas = TestFixtures.canvas(project);
    }

    @Test
    @DisplayName("핀은 캔버스 좌표를 가지고 해결되지 않은 상태로 만들어진다")
    void pinHasCoordinates() {
        // when
        Comment pin = Comment.pin(canvas, author, "여기 명암 수정 필요", 120.5, 340.0);

        // then
        assertThat(pin.getPosX()).isEqualTo(120.5);
        assertThat(pin.getPosY()).isEqualTo(340.0);
        assertThat(pin.isReply()).isFalse();
        assertThat(pin.isResolved()).isFalse();
    }

    @Test
    @DisplayName("답글은 좌표가 없고 부모의 캔버스를 그대로 물려받는다")
    void replyHasNoCoordinates() {
        // given
        Comment pin = Comment.pin(canvas, author, "여기 명암 수정 필요", 120.5, 340.0);

        // when
        Comment reply = Comment.reply(pin, author, "확인했습니다");

        // then
        assertThat(reply.isReply()).isTrue();
        assertThat(reply.getParent()).isSameAs(pin);
        assertThat(reply.getCanvas()).isSameAs(canvas);
        assertThat(reply.getPosX()).isNull();
        assertThat(reply.getPosY()).isNull();
    }

    @Test
    @DisplayName("해결됨 표시는 되돌릴 수 있다")
    void resolveAndReopen() {
        // given
        Comment pin = Comment.pin(canvas, author, "여기 명암 수정 필요", 10, 20);

        // when
        pin.resolve();

        // then
        assertThat(pin.isResolved()).isTrue();

        // when
        pin.reopen();

        // then
        assertThat(pin.isResolved()).isFalse();
    }
}
