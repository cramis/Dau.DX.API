// 사용자 조회 서비스. 본인 정보(me) 등.
package ac.donga.dxapi.user;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public UserResponse getMe(String userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return UserResponse.from(user);
    }
}
