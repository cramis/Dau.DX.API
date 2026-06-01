// 데이터소스 관리 CRUD. DXAPI_DATASOURCE_M. (게이트웨이 읽기용 gateway.DataSourceMapper 와 별개)
package ac.donga.dxapi.datasource;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DataSourceAdminMapper {

    List<DataSource> findAll();

    DataSource findById(@Param("id") String id);

    /** 오늘자 채번 prefix(예: DS20260601%)에 해당하는 최대 ID. 없으면 null. */
    String selectMaxId(@Param("like") String like);

    int countByName(@Param("name") String name, @Param("excludeId") String excludeId);

    /** 이 데이터소스를 참조하는 API 정의 수(삭제 차단 판정). */
    int countApisUsing(@Param("id") String id);

    int insert(@Param("id") String id, @Param("name") String name, @Param("dbType") String dbType,
               @Param("jdbcUrl") String jdbcUrl, @Param("dbUser") String dbUser, @Param("encPw") String encPw,
               @Param("poolMin") int poolMin, @Param("poolMax") int poolMax,
               @Param("queryTimeoutSec") int queryTimeoutSec, @Param("useYn") String useYn,
               @Param("regid") String regid);

    int update(@Param("id") String id, @Param("name") String name, @Param("dbType") String dbType,
               @Param("jdbcUrl") String jdbcUrl, @Param("dbUser") String dbUser, @Param("encPw") String encPw,
               @Param("poolMin") Integer poolMin, @Param("poolMax") Integer poolMax,
               @Param("queryTimeoutSec") Integer queryTimeoutSec, @Param("useYn") String useYn,
               @Param("modid") String modid);

    int delete(@Param("id") String id);
}
