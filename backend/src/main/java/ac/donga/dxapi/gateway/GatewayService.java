// 게이트웨이 핵심. 라우팅 → 4단 검증 → 필수 파라미터 → SQL 실행. 05 §10 / PRD §8.2.
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ErrorCode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class GatewayService {

    private static final Logger log = LoggerFactory.getLogger(GatewayService.class);
    private static final String ACTIVE = "ACTIVE";

    private final ApiDefMapper apiDefMapper;
    private final ExtSystemMapper extSystemMapper;
    private final CertKeyService certKeyService;
    private final IpWhitelistChecker ipChecker;
    private final SqlExecutor sqlExecutor;
    private final ObjectMapper objectMapper;

    public GatewayService(ApiDefMapper apiDefMapper, ExtSystemMapper extSystemMapper,
                          CertKeyService certKeyService, IpWhitelistChecker ipChecker,
                          SqlExecutor sqlExecutor, ObjectMapper objectMapper) {
        this.apiDefMapper = apiDefMapper;
        this.extSystemMapper = extSystemMapper;
        this.certKeyService = certKeyService;
        this.ipChecker = ipChecker;
        this.sqlExecutor = sqlExecutor;
        this.objectMapper = objectMapper;
    }

    public GatewayOutcome handle(String apiPath, String method, Map<String, Object> params,
                                 String certKey, String clientIp) {
        GatewayApi api = apiDefMapper.findByPathAndMethod(apiPath, method);
        if (api == null) {
            return GatewayOutcome.fail(ErrorCode.API_NOT_FOUND, null);
        }
        if (!ACTIVE.equals(api.sttusDvcd())) {
            return GatewayOutcome.fail(ErrorCode.API_NOT_ACTIVE, null);
        }

        if ("Y".equals(api.authEssntlYn())) {
            GatewayOutcome verify = verify(api, certKey, clientIp);
            if (verify != null) {
                return verify;
            }
        }

        GatewayOutcome missing = checkRequiredParams(api.apiNo(), params);
        if (missing != null) {
            return missing;
        }

        try {
            List<ApiRespDef> resps = apiDefMapper.findResps(api.apiNo());
            Object data = sqlExecutor.execute(api, resps, params);
            // TODO M4: 여기서 CallHistory enqueue (성공/실패 공통).
            return GatewayOutcome.ok(data);
        } catch (Exception e) {
            log.error("gateway exec fail api={} path={}", api.apiNo(), apiPath, e);
            // 외부 노출 — 내부 오류 상세는 숨기고 traceId 로만 추적.
            return GatewayOutcome.fail(ErrorCode.INTERNAL_ERROR, null);
        }
    }

    /** 4단 검증. 통과 시 null, 실패 시 해당 Outcome. */
    private GatewayOutcome verify(GatewayApi api, String certKey, String clientIp) {
        if (certKey == null || certKey.isBlank()) {
            return GatewayOutcome.fail(ErrorCode.INVALID_CERT_KEY, null);
        }
        ExtSystemAuth ext = extSystemMapper.findByCertHash(certKeyService.hash(certKey));
        if (ext == null) {
            return GatewayOutcome.fail(ErrorCode.INVALID_CERT_KEY, null);
        }
        if (!ACTIVE.equals(ext.sttusDvcd())) {
            return GatewayOutcome.fail(ErrorCode.EXT_SYSTEM_INACTIVE, null);
        }
        if (!ipChecker.isAllowed(clientIp, parseIps(ext.alwIpAddrText()))) {
            return GatewayOutcome.fail(ErrorCode.IP_NOT_ALLOWED, "client ip " + clientIp);
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(ext.useBeginDt()) || now.isAfter(ext.useEndDt())) {
            return GatewayOutcome.fail(ErrorCode.OUT_OF_PERIOD, null);
        }
        if (extSystemMapper.countMappedApi(ext.contctSystId(), api.apiNo()) == 0) {
            return GatewayOutcome.fail(ErrorCode.API_NOT_MAPPED, null);
        }
        return null;
    }

    private GatewayOutcome checkRequiredParams(String apiNo, Map<String, Object> params) {
        List<String> missing = apiDefMapper.findParams(apiNo).stream()
                .filter(p -> "Y".equals(p.essntlYn()))
                .map(ApiParamDef::paramNm)
                .filter(name -> {
                    Object v = params.get(name);
                    return v == null || "".equals(v);
                })
                .toList();
        if (!missing.isEmpty()) {
            return GatewayOutcome.fail(ErrorCode.MISSING_PARAM, "필수 파라미터 누락: " + String.join(", ", missing));
        }
        return null;
    }

    private List<String> parseIps(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            log.warn("allowedIps JSON 파싱 실패: {}", json);
            return List.of();
        }
    }
}
