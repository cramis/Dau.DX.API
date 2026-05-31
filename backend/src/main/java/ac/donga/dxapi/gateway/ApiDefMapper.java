// 게이트웨이용 API 정의/파라미터/응답 조회. DXAPI_API_DEF_M / _PARAM_M / _RESP_M.
package ac.donga.dxapi.gateway;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ApiDefMapper {

    GatewayApi findByPathAndMethod(@Param("path") String path, @Param("method") String method);

    List<ApiParamDef> findParams(@Param("apiNo") String apiNo);

    List<ApiRespDef> findResps(@Param("apiNo") String apiNo);
}
