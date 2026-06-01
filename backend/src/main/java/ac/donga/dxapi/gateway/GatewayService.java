// 게이트웨이 핵심. 라우팅 → 4단 검증 → 필수 파라미터 → SQL 실행 → 호출 이력 적재. 05 §10 / PRD §8.2.
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.monitoring.CallHistoryQueue;
import ac.donga.dxapi.monitoring.CallHistoryRecord;
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
    private final CallHistoryQueue callHistoryQueue;
    private final MaskingApplier masking;

    public GatewayService(ApiDefMapper apiDefMapper, ExtSystemMapper extSystemMapper,
                          CertKeyService certKeyService, IpWhitelistChecker ipChecker,
                          SqlExecutor sqlExecutor, ObjectMapper objectMapper,
                          CallHistoryQueue callHistoryQueue, MaskingApplier masking) {
        this.apiDefMapper = apiDefMapper;
        this.extSystemMapper = extSystemMapper;
        this.certKeyService = certKeyService;
        this.ipChecker = ipChecker;
        this.sqlExecutor = sqlExecutor;
        this.objectMapper = objectMapper;
        this.callHistoryQueue = callHistoryQueue;
        this.masking = masking;
    }

    private record Processed(GatewayOutcome outcome, String apiNo, String extId) {
    }

    private record VerifyResult(GatewayOutcome outcome, String extId) {
    }

    public GatewayOutcome handle(String apiPath, String method, Map<String, Object> params,
                                 String certKey, String clientIp, String traceId) {
        long startMs = System.currentTimeMillis();
        Processed p = process(apiPath, method, params, certKey, clientIp);
        record(apiPath, method, params, clientIp, traceId, p, System.currentTimeMillis() - startMs);
        return p.outcome();
    }

    private Processed process(String apiPath, String method, Map<String, Object> params,
                             String certKey, String clientIp) {
        GatewayApi api = apiDefMapper.findByPathAndMethod(apiPath, method);
        if (api == null) {
            return new Processed(GatewayOutcome.fail(ErrorCode.API_NOT_FOUND, null), null, null);
        }
        if (!ACTIVE.equals(api.sttusDvcd())) {
            return new Processed(GatewayOutcome.fail(ErrorCode.API_NOT_ACTIVE, null), api.apiNo(), null);
        }

        String extId = null;
        if ("Y".equals(api.authEssntlYn())) {
            VerifyResult vr = verify(api, certKey, clientIp);
            if (vr.outcome() != null) {
                return new Processed(vr.outcome(), api.apiNo(), vr.extId());
            }
            extId = vr.extId();
        }

        GatewayOutcome missing = checkRequiredParams(api.apiNo(), params);
        if (missing != null) {
            return new Processed(missing, api.apiNo(), extId);
        }

        try {
            List<ApiRespDef> resps = apiDefMapper.findResps(api.apiNo());
            Object data = sqlExecutor.execute(api, resps, params);
            return new Processed(GatewayOutcome.ok(data), api.apiNo(), extId);
        } catch (Exception e) {
            log.error("gateway exec fail api={} path={}", api.apiNo(), apiPath, e);
            // 외부 노출 — 내부 오류 상세는 숨기고 traceId 로만 추적.
            return new Processed(GatewayOutcome.fail(ErrorCode.INTERNAL_ERROR, null), api.apiNo(), extId);
        }
    }

    /** 4단 검증. 통과 시 outcome=null + extId, 실패 시 outcome=fail. */
    private VerifyResult verify(GatewayApi api, String certKey, String clientIp) {
        if (certKey == null || certKey.isBlank()) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.INVALID_CERT_KEY, null), null);
        }
        ExtSystemAuth ext = extSystemMapper.findByCertHash(certKeyService.hash(certKey));
        if (ext == null) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.INVALID_CERT_KEY, null), null);
        }
        String extId = ext.contctSystId();
        if (!ACTIVE.equals(ext.sttusDvcd())) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.EXT_SYSTEM_INACTIVE, null), extId);
        }
        if (!ipChecker.isAllowed(clientIp, parseIps(ext.alwIpAddrText()))) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.IP_NOT_ALLOWED, "client ip " + clientIp), extId);
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(ext.useBeginDt()) || now.isAfter(ext.useEndDt())) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.OUT_OF_PERIOD, null), extId);
        }
        if (extSystemMapper.countMappedApi(extId, api.apiNo()) == 0) {
            return new VerifyResult(GatewayOutcome.fail(ErrorCode.API_NOT_MAPPED, null), extId);
        }
        return new VerifyResult(null, extId);
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

    private void record(String apiPath, String method, Map<String, Object> params, String clientIp,
                        String traceId, Processed p, long elapsedMs) {
        int status = p.outcome().success() ? 200 : p.outcome().code().status().value();
        String errCd = p.outcome().success() ? null : p.outcome().code().name();
        // 호출이력 적재 전 요청 PII 마스킹(휴리스틱 — 주민/카드). 원본 params 는 SQL 실행에만 쓰였고 여기선 사본만 직렬화.
        // #1b 후속: API param 메타(maskRule)를 ruleByParam 으로 전달해 명시 마스킹 강화.
        String paramJson = toJson(masking.maskParamsForLog(params, null));
        callHistoryQueue.enqueue(new CallHistoryRecord(
                LocalDateTime.now(), p.extId(), p.apiNo(), apiPath, method, clientIp, traceId,
                paramJson, status, errCd, elapsedMs));
    }

    private String toJson(Map<String, Object> params) {
        try {
            return objectMapper.writeValueAsString(params);
        } catch (Exception e) {
            return "{}";
        }
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
