// @Scheduled 활성화. 호출 이력 배치writer(1초 주기) 구동용.
package ac.donga.dxapi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
}
