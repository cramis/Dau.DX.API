// API 정의 관리 서비스. 채번(A+YYYYMMDD+seq3)·path 유니크·dataSrc 검증·자식(params/resps) 동기화·매핑 시 삭제 차단.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.BulkImportResult;
import ac.donga.dxapi.common.BulkRowResult;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.gateway.SqlPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ApiDefService {

    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE");
    private static final Set<String> STATUSES = Set.of("DRAFT", "ACTIVE", "INACTIVE");
    private static final Set<String> PARAM_TYPES = Set.of("string", "number", "date", "boolean");
    private static final Set<String> MASK_RULES = Set.of("none", "name", "phone", "email", "rrn", "card", "addr");

    private final ApiAdminMapper mapper;
    private final int maxOpenDrafts;

    public ApiDefService(ApiAdminMapper mapper,
                         @org.springframework.beans.factory.annotation.Value("${app.ai.max-open-drafts:50}") int maxOpenDrafts) {
        this.mapper = mapper;
        this.maxOpenDrafts = maxOpenDrafts;
    }

    /** regId 지정 시 해당 등록자 건만 (AI 는 자기 초안만 — 02_AI초안등록_PRD §6). */
    public ItemsResponse<ApiDefResponse> list(String q, String regId) {
        return new ItemsResponse<>(mapper.findAll(blank(q), regId).stream().map(this::assemble).toList());
    }

    /** regIdFilter 지정 시 등록자 불일치는 403 (AI 는 자기 건만 단건 조회). */
    public ApiDefResponse get(String id, String regIdFilter) {
        ApiDef d = require(id);
        if (regIdFilter != null && !regIdFilter.equals(d.regId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return assemble(d);
    }

    /** 문서 노출(DOC_DISP_YN=Y) API 목록. OpenAPI 스펙 생성용. (FR7) */
    public List<ApiDefResponse> listDocVisible() {
        return mapper.findAll(null, null).stream().map(this::assemble).filter(ApiDefResponse::docVisible).toList();
    }

    /** FE 문서 뷰어용 공개 목록(docVisible, SQL 제외). (FR7) */
    public ItemsResponse<PublicApiDoc> publicDocs() {
        return new ItemsResponse<>(listDocVisible().stream()
                .map(r -> new PublicApiDoc(r.no(), r.name(), r.group(), r.method(), r.path(),
                        r.authRequired(), r.desc(), r.params(), r.resps()))
                .toList());
    }

    public boolean checkPath(String path) {
        return mapper.existsByPath(path, null) == 0;
    }

    /** 일괄 import(upsert). 검증-우선 all-or-nothing. dryRun 또는 1행 실패 시 무적재. (FR — Bulk import) */
    @Transactional
    public BulkImportResult bulkImport(List<ApiImportItem> items, boolean dryRun, String actor) {
        List<BulkRowResult> rows = new ArrayList<>();
        Set<String> seenPaths = new HashSet<>();
        boolean allOk = true;
        for (int i = 0; i < items.size(); i++) {
            ApiImportItem it = items.get(i);
            try {
                requireText(it.name(), "name");
                requireText(it.group(), "group");
                requireText(it.path(), "path");
                requireText(it.sql(), "sql");
                if (!seenPaths.add(it.path())) {
                    throw new ApiException(ErrorCode.INVALID_INPUT, "payload 내 path 중복: " + it.path());
                }
                boolean update = exists(it.no());
                validate(toReq(it));   // method/status/dataSrc/SQL 정책
                if (mapper.existsByPath(it.path(), update ? it.no() : null) > 0) {
                    throw new ApiException(ErrorCode.PATH_EXISTS);
                }
                rows.add(BulkRowResult.ok(i, it.no(), update ? "updated" : "inserted"));
            } catch (ApiException e) {
                allOk = false;
                rows.add(BulkRowResult.fail(i, it.no(), e.code().name(), e.getMessage()));
            }
        }
        if (dryRun || !allOk) {
            return BulkImportResult.of(dryRun, rows);   // 무적재(검증 read-only)
        }
        try {
            List<BulkRowResult> applied = new ArrayList<>();
            for (int i = 0; i < items.size(); i++) {
                ApiImportItem it = items.get(i);
                ApiDefSaveRequest req = toReq(it);
                if (exists(it.no())) {
                    update(it.no(), req, actor);
                    applied.add(BulkRowResult.ok(i, it.no(), "updated"));
                } else {
                    applied.add(BulkRowResult.ok(i, create(req, actor).no(), "inserted"));
                }
            }
            return BulkImportResult.of(false, applied);
        } catch (RuntimeException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return BulkImportResult.of(false, List.of(BulkRowResult.fail(0, null, "INTERNAL_ERROR", e.getMessage())));
        }
    }

    private boolean exists(String no) {
        return no != null && !no.isBlank() && mapper.findById(no) != null;
    }

    private ApiDefSaveRequest toReq(ApiImportItem it) {
        return new ApiDefSaveRequest(it.name(), it.group(), it.method(), it.path(), it.status(),
                it.dataSrcId(), it.authRequired(), it.docVisible(), it.sql(), it.desc(), it.params(), it.resps());
    }

    private void requireText(String v, String field) {
        if (v == null || v.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, field + " 필수");
        }
    }

    @Transactional
    public ApiDefResponse create(ApiDefSaveRequest req, String actor) {
        return create(req, actor, false);
    }

    /** aiActor=true 면 요청 status 무시하고 DRAFT 강제 + open-draft 상한 (02_AI초안등록_PRD §6·§8.3). */
    @Transactional
    public ApiDefResponse create(ApiDefSaveRequest req, String actor, boolean aiActor) {
        String status = validate(req);
        if (aiActor) {
            status = "DRAFT";   // 서버 강제 — AI 는 어떤 status 를 보내도 초안
            if (mapper.countDraftsByRegid(actor) >= maxOpenDrafts) {
                throw new ApiException(ErrorCode.INVALID_INPUT,
                        "AI open-draft 상한 초과(" + maxOpenDrafts + "). 기존 초안 승인/정리 후 재시도");
            }
        }
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
                String mask = p.maskRule() == null ? "none" : p.maskRule();
                if (!MASK_RULES.contains(mask)) {
                    throw new ApiException(ErrorCode.INVALID_INPUT, "param maskRule: " + mask);
                }
                mapper.insertParam(id, seq++, p.name(), p.type(), p.required() ? "Y" : "N", p.defaultValue(), p.desc(), mask);
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
                .map(p -> new ApiParamDto(p.paramNm(), p.paramTypeDvcd(), "Y".equals(p.essntlYn()), p.basVal(), p.descText(), p.maskRuleDvcd()))
                .toList();
        List<ApiRespDto> resps = mapper.findResps(d.apiNo()).stream()
                .map(r -> new ApiRespDto(r.colNm(), r.colTypeDvcd(), r.dispNm(), r.maskRuleDvcd()))
                .toList();
        return new ApiDefResponse(d.apiNo(), d.apiNm(), d.apiGroupCd(), d.httpMthdDvcd(), d.reqPath(),
                d.sttusDvcd(), d.dataSrcId(), "Y".equals(d.authEssntlYn()), "Y".equals(d.docDispYn()),
                d.sqlText(), d.descText(), d.regId(), params, resps);
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
