// 승인 이력 조회·처리. DXAPI_USER_APPR_L.
package ac.donga.dxapi.approval;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ApprovalMapper {

    List<Approval> findByType(@Param("type") String type, @Param("status") String status);

    Approval findById(@Param("seq") long seq);

    int process(@Param("seq") long seq, @Param("status") String status,
                @Param("reviewer") String reviewer, @Param("reason") String reason);
}
