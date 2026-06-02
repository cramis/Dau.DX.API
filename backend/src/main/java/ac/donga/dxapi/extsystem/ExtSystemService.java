// 연계시스템 관리 서비스. 채번(E+YYYYMMDD+seq3)·인증키 생성/재발급·매핑 동기화·IP JSON.
package ac.donga.dxapi.extsystem;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.gateway.CertKeyService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Service
public class ExtSystemService {

    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final ExtSystemAdminMapper mapper;
    private final CertKeyService certKeyService;
    private final ObjectMapper objectMapper;

    public ExtSystemService(ExtSystemAdminMapper mapper, CertKeyService certKeyService, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.certKeyService = certKeyService;
        this.objectMapper = objectMapper;
    }

    public ItemsResponse<ExtSystemResponse> list() {
        return new ItemsResponse<>(mapper.findAll().stream().map(this::toResponse).toList());
    }

    public ExtSystemResponse get(String id) {
        return toResponse(require(id));
    }

    @Transactional
    public ExtSystemCreateResponse create(ExtSystemCreateRequest req, String actor) {
        if (mapper.countByName(req.name(), null) > 0) {
            throw new ApiException(ErrorCode.NAME_EXISTS);
        }
        String status = req.status() == null ? "ACTIVE" : validateStatus(req.status());
        LocalDateTime begin = parse(req.useBegin());
        LocalDateTime end = parse(req.useEnd());
        if (begin.isAfter(end)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "useBegin > useEnd");
        }
        String id = nextId();
        String plain = certKeyService.generate(id);
        mapper.insert(id, req.name(), certKeyService.hash(plain), certKeyService.disti(plain),
                toJson(req.allowedIps()), begin, end,
                req.picgName(), req.picgTel(), req.picgEmail(), req.remark(), status,
                validateRate(req.rateLmtPerMin()), actor);
        syncMappings(id, req.mappedApis(), actor);
        return new ExtSystemCreateResponse(toResponse(mapper.findById(id)), plain);
    }

    @Transactional
    public ExtSystemResponse update(String id, ExtSystemUpdateRequest req, String actor) {
        require(id);
        String status = req.status() == null ? null : validateStatus(req.status());
        if (req.name() != null && mapper.countByName(req.name(), id) > 0) {
            throw new ApiException(ErrorCode.NAME_EXISTS);
        }
        LocalDateTime begin = req.useBegin() == null ? null : parse(req.useBegin());
        LocalDateTime end = req.useEnd() == null ? null : parse(req.useEnd());
        if (begin != null && end != null && begin.isAfter(end)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "useBegin > useEnd");
        }
        String ipsJson = req.allowedIps() == null ? null : toJson(req.allowedIps());
        mapper.update(id, req.name(), ipsJson, begin, end,
                req.picgName(), req.picgTel(), req.picgEmail(), req.remark(), status,
                validateRate(req.rateLmtPerMin()), actor);
        if (req.mappedApis() != null) {
            mapper.deleteMappings(id);
            syncMappings(id, req.mappedApis(), actor);
        }
        return toResponse(mapper.findById(id));
    }

    @Transactional
    public FreshKeyResponse regenerateKey(String id, String actor) {
        require(id);
        String plain = certKeyService.generate(id);
        mapper.updateCertKey(id, certKeyService.hash(plain), certKeyService.disti(plain), actor);
        return new FreshKeyResponse(plain);
    }

    @Transactional
    public void delete(String id) {
        require(id);
        mapper.delete(id);   // 매핑은 FK ON DELETE CASCADE
    }

    private ExtSystemResponse toResponse(ExtSystem e) {
        return new ExtSystemResponse(
                e.contctSystId(), e.contctSystNm(),
                e.crtfcKeyDistiText() + "-****-****-****",
                parseIps(e.alwIpAddrText()),
                iso(e.useBeginDt()), iso(e.useEndDt()),
                mapper.findMappedApis(e.contctSystId()),
                e.picgNm(), e.picgTelNo(), e.picgEmail(), e.rmark(), e.sttusDvcd(), e.rateLmtPerMin());
    }

    private void syncMappings(String id, List<String> apis, String actor) {
        if (apis == null) {
            return;
        }
        for (String apiNo : apis) {
            if (mapper.countApiDef(apiNo) == 0) {
                throw new ApiException(ErrorCode.INVALID_INPUT, "미존재 API: " + apiNo);
            }
            mapper.insertMapping(id, apiNo, actor);
        }
    }

    private ExtSystem require(String id) {
        ExtSystem e = mapper.findById(id);
        if (e == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return e;
    }

    private String validateStatus(String status) {
        if (!STATUSES.contains(status)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "status: " + status);
        }
        return status;
    }

    // 분당 한도. null=전역 기본 상속, 0=무제한, >0=개별 한도. 음수 거부. (갭#4b)
    private Integer validateRate(Integer rateLmtPerMin) {
        if (rateLmtPerMin != null && rateLmtPerMin < 0) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "rateLmtPerMin < 0");
        }
        return rateLmtPerMin;
    }

    private String nextId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String maxId = mapper.selectMaxId("E" + datePart + "%");
        int seq = maxId == null ? 1 : Integer.parseInt(maxId.substring(maxId.length() - 3)) + 1;
        return "E" + datePart + String.format("%03d", seq);
    }

    private LocalDateTime parse(String iso) {
        try {
            return LocalDateTime.parse(iso);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "일시 형식: " + iso);
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list == null ? List.of() : list);
        } catch (Exception e) {
            return "[]";
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
            return List.of();
        }
    }

    private String iso(LocalDateTime ldt) {
        return ldt == null ? null : ldt.toString();
    }
}
