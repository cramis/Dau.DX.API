// API 정의 관리 CRUD + 자식(params/resps) 동기화. DXAPI_API_DEF_M / _PARAM_M / _RESP_M.
package ac.donga.dxapi.apidef;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ApiAdminMapper {

    List<ApiDef> findAll(@Param("q") String q);

    ApiDef findById(@Param("id") String id);

    List<ApiParamRow> findParams(@Param("apiNo") String apiNo);

    List<ApiRespRow> findResps(@Param("apiNo") String apiNo);

    String selectMaxId(@Param("like") String like);

    int existsByPath(@Param("path") String path, @Param("excludeId") String excludeId);

    int countDataSrc(@Param("dataSrcId") String dataSrcId);

    /** 이 API 를 매핑한 연계시스템 수(삭제 차단 판정). */
    int countMappings(@Param("apiNo") String apiNo);

    int insert(@Param("id") String id, @Param("name") String name, @Param("group") String group,
               @Param("method") String method, @Param("path") String path, @Param("status") String status,
               @Param("dataSrcId") String dataSrcId, @Param("auth") String auth, @Param("doc") String doc,
               @Param("sql") String sql, @Param("desc") String desc, @Param("regid") String regid);

    int update(@Param("id") String id, @Param("name") String name, @Param("group") String group,
               @Param("method") String method, @Param("path") String path, @Param("status") String status,
               @Param("dataSrcId") String dataSrcId, @Param("auth") String auth, @Param("doc") String doc,
               @Param("sql") String sql, @Param("desc") String desc, @Param("modid") String modid);

    int delete(@Param("id") String id);

    int insertParam(@Param("apiNo") String apiNo, @Param("seq") int seq, @Param("name") String name,
                    @Param("type") String type, @Param("ess") String ess, @Param("basVal") String basVal,
                    @Param("desc") String desc);

    int deleteParams(@Param("apiNo") String apiNo);

    int insertResp(@Param("apiNo") String apiNo, @Param("seq") int seq, @Param("col") String col,
                   @Param("type") String type, @Param("disp") String disp, @Param("mask") String mask);

    int deleteResps(@Param("apiNo") String apiNo);
}
