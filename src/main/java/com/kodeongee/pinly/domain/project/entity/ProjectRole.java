package com.kodeongee.pinly.domain.project.entity;

/** 프로젝트 내 권한. 링크 공유 시 부여되는 권한에도 같은 값을 쓴다. */
public enum ProjectRole {
    OWNER,
    EDITOR,
    VIEWER
}
