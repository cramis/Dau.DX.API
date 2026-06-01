// 호출 이력 조회(읽기). 통계 표본 + 상세 이력. DXAPI_CALL_HIST_L.
package ac.donga.dxapi.monitoring;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface MonitoringMapper {

    List<CallSample> findSamplesSince(@Param("since") LocalDateTime since);

    List<CallHistory> findHistory(@Param("q") String q,
                                  @Param("statusCode") Integer statusCode,
                                  @Param("apiNo") String apiNo,
                                  @Param("extSysId") String extSysId,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,
                                  @Param("limit") int limit);
}
