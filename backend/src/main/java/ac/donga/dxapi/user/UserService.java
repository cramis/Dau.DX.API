// 사용자 조회·관리 서비스. 본인 정보(me) + 관리자 CRUD. 05 계약 §2·§3.
package ac.donga.dxapi.user;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class UserService {

    private static final Set<String> ROLES = Set.of("ADMIN", "USER", "AI");
    private static final Set<String> STATUSES = Set.of("PENDING", "ACTIVE", "REJECTED", "INACTIVE");

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

    public ItemsResponse<UserResponse> list(String q, String status) {
        List<UserResponse> items = userMapper.search(blank(q), blank(status)).stream()
                .map(UserResponse::from)
                .toList();
        return new ItemsResponse<>(items);
    }

    public UserResponse get(String id) {
        return UserResponse.from(require(id));
    }

    public UserResponse updateByAdmin(String id, String selfId, UserAdminUpdateRequest req) {
        if (id.equals(selfId)) {
            throw new ApiException(ErrorCode.CANNOT_UPDATE_SELF);
        }
        require(id);
        if (req.role() == null && req.status() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        if (req.role() != null && !ROLES.contains(req.role())) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        if (req.status() != null && !STATUSES.contains(req.status())) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        userMapper.updateAdmin(id, req.role(), req.status());
        return UserResponse.from(userMapper.findById(id));
    }

    public void softDelete(String id, String selfId) {
        if (id.equals(selfId)) {
            throw new ApiException(ErrorCode.CANNOT_UPDATE_SELF);
        }
        require(id);
        userMapper.softDelete(id);
    }

    private User require(String id) {
        User user = userMapper.findById(id);
        if (user == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return user;
    }

    private String blank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
