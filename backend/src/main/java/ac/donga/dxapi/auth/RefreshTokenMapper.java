// Refresh 토큰(jti) 영속·검증·폐기. DXAPI_REFRESH_TOKEN_L (Redis 대체, open-questions A5).
package ac.donga.dxapi.auth;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;

@Mapper
public interface RefreshTokenMapper {

    int insert(@Param("jti") String jti,
               @Param("userId") String userId,
               @Param("expireAt") Instant expireAt,
               @Param("issueIp") String issueIp,
               @Param("userAgent") String userAgent);

    /** 폐기되지 않고 만료되지 않은 jti 건수. 1 이면 유효. */
    int countValid(@Param("jti") String jti);

    int revoke(@Param("jti") String jti, @Param("reason") String reason);
}
