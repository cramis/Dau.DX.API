// 사용자 응답 DTO. mockup types/api.ts 의 User 형태(필드명)로 노출. PW_HASH 는 절대 포함하지 않음.
package ac.donga.dxapi.user;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        String id,
        String name,
        String email,
        String org,
        String dept,
        String phone,
        String tel,
        String role,
        String status,
        String lastLoginAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(
                u.userId(),
                u.userNm(),
                u.email(),
                u.orgNm(),
                u.deptNm(),
                u.hpNo(),
                u.telNo(),
                u.roleDvcd(),
                u.sttusDvcd(),
                u.ltlyLoginDt() == null ? null : u.ltlyLoginDt().toString()
        );
    }
}
