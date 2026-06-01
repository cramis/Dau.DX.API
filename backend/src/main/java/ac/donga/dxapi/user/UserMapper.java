// 사용자 마스터 조회·로그인 상태 갱신. DXAPI_USR_USER_M.
package ac.donga.dxapi.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {

    User findById(@Param("id") String id);

    /** 로그인 성공 시 최근로그인 갱신 + 실패카운트 0. */
    int touchLoginSuccess(@Param("id") String id);

    int incrementLoginFailure(@Param("id") String id);

    List<User> search(@Param("q") String q, @Param("status") String status);

    int updateAdmin(@Param("id") String id, @Param("role") String role, @Param("status") String status);

    int softDelete(@Param("id") String id);
}
