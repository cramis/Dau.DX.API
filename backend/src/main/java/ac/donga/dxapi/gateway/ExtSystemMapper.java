// 연계시스템 인증 조회 + 매핑 API 확인. DXAPI_USR_EXT_SYS_M / _EXT_SYS_API_MAP_M.
package ac.donga.dxapi.gateway;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ExtSystemMapper {

    ExtSystemAuth findByCertHash(@Param("hash") String hash);

    int countMappedApi(@Param("extId") String extId, @Param("apiNo") String apiNo);
}
