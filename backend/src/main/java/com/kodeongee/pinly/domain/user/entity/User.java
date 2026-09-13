package com.kodeongee.pinly.domain.user.entity;

import com.kodeongee.pinly.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자.
 *
 * <p>테이블명이 {@code app_user}인 이유: {@code user}는 PostgreSQL 예약어다.
 * 소셜 전용 계정은 {@code passwordHash}가 없다.
 */
@Entity
@Getter
@Table(name = "app_user")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Builder
    private User(String email, String passwordHash, String name) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
    }

    /** 표시 이름을 변경한다. */
    public void changeName(String name) {
        this.name = name;
    }

    /** 비밀번호 해시를 교체한다. 소셜 전용 계정에 비밀번호를 추가할 때도 쓴다. */
    public void changePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
