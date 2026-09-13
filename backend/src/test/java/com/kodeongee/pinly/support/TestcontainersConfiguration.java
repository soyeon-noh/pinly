package com.kodeongee.pinly.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * DB가 필요한 테스트가 공유하는 PostgreSQL 컨테이너 설정.
 *
 * <p>JSONB / GIN 인덱스 / gen_random_uuid() 를 쓰기 때문에 H2 대신 실제 PostgreSQL을 띄운다.
 * 테스트 클래스에서 {@code @Import(TestcontainersConfiguration.class)} 로 가져다 쓴다.
 *
 * <p>실행에는 Docker 데몬이 필요하다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:16-alpine");

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(POSTGRES_IMAGE);
    }
}
