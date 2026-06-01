// 연계시스템 관리 CRUD + 매핑(API) 동기화. DXAPI_USR_EXT_SYS_M / _EXT_SYS_API_MAP_M.
package ac.donga.dxapi.extsystem;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface ExtSystemAdminMapper {

    List<ExtSystem> findAll();

    ExtSystem findById(@Param("id") String id);

    String selectMaxId(@Param("like") String like);

    int countByName(@Param("name") String name, @Param("excludeId") String excludeId);

    List<String> findMappedApis(@Param("extId") String extId);

    int countApiDef(@Param("apiNo") String apiNo);

    int insert(@Param("id") String id, @Param("name") String name,
               @Param("keyHash") String keyHash, @Param("keyDisti") String keyDisti,
               @Param("ipsJson") String ipsJson,
               @Param("useBegin") LocalDateTime useBegin, @Param("useEnd") LocalDateTime useEnd,
               @Param("picgNm") String picgNm, @Param("picgTel") String picgTel,
               @Param("picgEmail") String picgEmail, @Param("remark") String remark,
               @Param("status") String status, @Param("regid") String regid);

    int update(@Param("id") String id, @Param("name") String name, @Param("ipsJson") String ipsJson,
               @Param("useBegin") LocalDateTime useBegin, @Param("useEnd") LocalDateTime useEnd,
               @Param("picgNm") String picgNm, @Param("picgTel") String picgTel,
               @Param("picgEmail") String picgEmail, @Param("remark") String remark,
               @Param("status") String status, @Param("modid") String modid);

    int updateCertKey(@Param("id") String id, @Param("keyHash") String keyHash,
                      @Param("keyDisti") String keyDisti, @Param("modid") String modid);

    int delete(@Param("id") String id);

    int insertMapping(@Param("extId") String extId, @Param("apiNo") String apiNo, @Param("regid") String regid);

    int deleteMappings(@Param("extId") String extId);
}
