package com.kodeongee.pinly;

import com.kodeongee.pinly.support.TestcontainersConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@DisplayName("애플리케이션 부팅")
class PinlyApplicationTests {

    @Test
    @DisplayName("스프링 컨텍스트가 정상적으로 로드된다")
    void contextLoads() {
    }

}
