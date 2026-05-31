// 데이터소스 정의 조회(동적 풀 구성). DXAPI_DATASOURCE_M.
package ac.donga.dxapi.gateway;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DataSourceMapper {

    DataSourceDef findById(@Param("id") String id);
}
