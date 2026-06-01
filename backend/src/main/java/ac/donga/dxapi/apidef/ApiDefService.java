// API 정의 관리 서비스. 채번(A+YYYYMMDD+seq3)·path 유니크·dataSrc 검증·자식(params/resps) 동기화·매핑 시 삭제 차단.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.gateway.SqlPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Service
public class ApiDefService {

    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE");
    private static final Set<String> STATUSES = Set.of("DRAFT", "ACTIVE", "INACTIVE");
    private static final Set<String> PARAM_TYPES = Set.of("string", "number", "date", "boolean");
    private static final Set<String> MASK_RULES = Set.of("none", "name", "phone", "email", "rrn", "card", "addr");

    private final ApiAdminMapper mapper;

    public ApiDefService(ApiAdminMapper mapper) {
        this.mapper = mapper;
    }

    public ItemsResponse<ApiDefResponse> list(String q) {
        return new ItemsResponse<>(mapper.findAll(blank(q)).stream().map(this::assemble).toList());
    }

    public ApiDefResponse get(String id) {
        return assemble(require(id));
    }

    public boolean checkPath(String path) {
        return mapper.existsByPath(path, null) == 0;
    }

    @Transactional
    public ApiDefResponse create(ApiDefSaveRequest req, String actor) {
        String status = validate(req);
        if (mapper.existsByPath(req.path(), null) > 0) {
            throw new ApiException(ErrorCode.PATH_EXISTS);
        }
        String id = nextId();
        mapper.insert(id, req.name(), req.group(), req.method(), req.path(), status, req.dataSrcId(),
                yn(req.authRequired(), true), yn(req.docVisible(), true), req.sql(), req.desc(), actor);
        insertChildren(id, req.params(), req.resps());
        return assemble(require(id));
    }

    @Transactional
    public ApiDefResponse update(String id, ApiDefSaveRequest req, String actor) {
        require(id);
        String status = validate(req);
        if (mapper.existsByPath(req.path(), id) > 0) {
            throw new ApiException(ErrorCode.PATH_EXISTS);
        }
        mapper.update(id, req.name(), req.group(), req.method(), req.path(), status, req.dataSrcId(),
                yn(req.authRequired(), true), yn(req.docVisible(), true), req.sql(), req.desc(), actor);
        mapper.deleteParams(id);
        mapper.deleteResps(id);
        insertChildren(id, req.params(), req.resps());
        return assemble(require(id));
    }

    @Transactional
    public void delete(String id) {
        require(id);
        if (mapper.countMappings(id) > 0) {
            throw new ApiException(ErrorCode.IN_USE);
        }
        mapper.delete(id);   // params/resps 는 FK ON DELETE CASCADE
    }

    private String validate(ApiDefSaveRequest req) {
        if (!METHODS.contains(req.method())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "method: " + req.method());
        }
        String status = req.status() == null ? "DRAFT" : req.status();
        if (!STATUSES.contains(status)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "status: " + status);
        }
        if (mapper.countDataSrc(req.dataSrcId()) == 0) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "미존재 dataSrcId: " + req.dataSrcId());
        }
        // SQL 안전 정책(C4). GET 은 읽기 전용, 그 외 method 는 쓰기 허용. DDL·DELETE·다중문은 항상 거부.
        SqlPolicy.Result sql = SqlPolicy.check(req.sql(), !"GET".equals(req.method()));
        if (!sql.allowed()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "SQL: " + sql.reason());
        }
        return status;
    }

    private void insertChildren(String id, List<ApiParamDto> params, List<ApiRespDto> resps) {
        if (params != null) {
            int seq = 1;
            for (ApiParamDto p : params) {
                if (!PARAM_TYPES.contains(p.type())) {
                    throw new ApiException(ErrorCode.INVALID_INPUT, "param type: " + p.type());
                }
                mapper.insertParam(id, seq++, p.name(), p.type(), p.required() ? "Y" : "N", p.defaultValue(), p.desc());
            }
        }
        if (resps != null) {
            int seq = 1;
            for (ApiRespDto r : resps) {
                String mask = r.maskRule() == null ? "none" : r.maskRule();
                if (!MASK_RULES.contains(mask)) {
                    throw new ApiException(ErrorCode.INVALID_INPUT, "maskRule: " + mask);
                }
                mapper.insertResp(id, seq++, r.col(), r.type(), r.displayName(), mask);
            }
        }
    }

    private ApiDefResponse assemble(ApiDef d) {
        List<ApiParamDto> params = mapper.findParams(d.apiNo()).stream()
                .map(p -> new ApiParamDto(p.paramNm(), p.paramTypeDvcd(), "Y".equals(p.essntlYn()), p.basVal(), p.descText()))
                .toList();
        List<ApiRespDto> resps = mapper.findResps(d.apiNo()).stream()
                .map(r -> new ApiRespDto(r.colNm(), r.colTypeDvcd(), r.dispNm(), r.maskRuleDvcd()))
                .toList();
        return new ApiDefResponse(d.apiNo(), d.apiNm(), d.apiGroupCd(), d.httpMthdDvcd(), d.reqPath(),
                d.sttusDvcd(), d.dataSrcId(), "Y".equals(d.authEssntlYn()), "Y".equals(d.docDispYn()),
                d.sqlText(), d.descText(), params, resps);
    }

    private ApiDef require(String id) {
        ApiDef d = mapper.findById(id);
        if (d == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return d;
    }

    private String nextId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String maxId = mapper.selectMaxId("A" + datePart + "%");
        int seq = maxId == null ? 1 : Integer.parseInt(maxId.substring(maxId.length() - 3)) + 1;
        return "A" + datePart + String.format("%03d", seq);
    }

    private String yn(Boolean b, boolean def) {
        return (b == null ? def : b) ? "Y" : "N";
    }

    private String blank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
