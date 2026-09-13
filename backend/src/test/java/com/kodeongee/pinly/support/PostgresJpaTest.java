package com.kodeongee.pinly.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

/**
 * 실제 PostgreSQL에 붙는 JPA 슬라이스 테스트.
 *
 * <p>{@code @DataJpaTest}는 기본적으로 DataSource를 내장 DB로 바꾸려 하는데, pinly는 JSONB·GIN·
 * {@code gen_random_uuid()}를 쓰므로 그 교체를 끄고 {@link TestcontainersConfiguration}의
 * PostgreSQL 컨테이너를 그대로 쓴다. Flyway 마이그레이션도 이 컨테이너에 적용된다.
 */
@Documented
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
public @interface PostgresJpaTest {
}
