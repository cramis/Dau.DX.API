// 등록 API 메타(ApiDefResponse) → OpenAPI 3 스펙(Map) 변환. springdoc 미사용(DB 등록 SQL 기반이라 어노테이션 스캔 불가). FR7.
package ac.donga.dxapi.apidef;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class OpenApiSpecBuilder {

    private OpenApiSpecBuilder() {
    }

    /** docVisible API 목록 → OpenAPI 3.0.3 스펙. 외부 호출 경로 = /api/sample/{path}, 인증헤더 = X-Cert-Key. SQL 미포함. */
    static Map<String, Object> build(List<ApiDefResponse> apis, String serverUrl, String version) {
        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("openapi", "3.0.3");
        spec.put("info", Map.of(
                "title", "Dau.DX.API Gateway",
                "version", version,
                "description", "등록된 API 의 외부 호출 게이트웨이. 호출 시 헤더 X-Cert-Key(연계시스템 인증키) 필요."));
        spec.put("servers", List.of(Map.of("url", serverUrl, "description", "Dau.DX.API gateway")));

        Map<String, Object> paths = new LinkedHashMap<>();
        for (ApiDefResponse a : apis) {
            String pathKey = "/api/sample/" + a.path();
            String verb = a.method() == null ? "get" : a.method().toLowerCase();
            Object item = paths.computeIfAbsent(pathKey, k -> new LinkedHashMap<String, Object>());
            @SuppressWarnings("unchecked")
            Map<String, Object> pathItem = (Map<String, Object>) item;
            pathItem.put(verb, operation(a, verb));
        }
        spec.put("paths", paths);

        spec.put("components", Map.of("securitySchemes", Map.of(
                "certKey", Map.of(
                        "type", "apiKey",
                        "in", "header",
                        "name", "X-Cert-Key",
                        "description", "연계시스템 인증키(HMAC-SHA256). 발급 시 1회 노출 — 평문은 문서에 표기되지 않음."))));
        return spec;
    }

    private static Map<String, Object> operation(ApiDefResponse a, String verb) {
        Map<String, Object> op = new LinkedHashMap<>();
        op.put("tags", List.of(a.group() == null ? "default" : a.group()));
        op.put("summary", a.name());
        if (a.desc() != null) {
            op.put("description", a.desc());
        }
        op.put("operationId", a.no());

        boolean bodyVerb = !("get".equals(verb) || "delete".equals(verb));
        if (bodyVerb) {
            Map<String, Object> props = new LinkedHashMap<>();
            List<String> required = new ArrayList<>();
            for (ApiParamDto p : a.params()) {
                Map<String, Object> sch = new LinkedHashMap<>();
                sch.put("type", openapiType(p.type()));
                if (p.desc() != null) {
                    sch.put("description", p.desc());
                }
                props.put(p.name(), sch);
                if (p.required()) {
                    required.add(p.name());
                }
            }
            Map<String, Object> schema = new LinkedHashMap<>();
            schema.put("type", "object");
            schema.put("properties", props);
            if (!required.isEmpty()) {
                schema.put("required", required);
            }
            op.put("requestBody", Map.of("required", true,
                    "content", Map.of("application/json", Map.of("schema", schema))));
        } else {
            List<Map<String, Object>> params = new ArrayList<>();
            for (ApiParamDto p : a.params()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("name", p.name());
                pm.put("in", "query");
                pm.put("required", p.required());
                pm.put("schema", Map.of("type", openapiType(p.type())));
                if (p.desc() != null) {
                    pm.put("description", p.desc());
                }
                params.add(pm);
            }
            if (!params.isEmpty()) {
                op.put("parameters", params);
            }
        }

        // 200 응답 = 게이트웨이 표준 형태 { ok, data:[{컬럼...}], traceId }
        Map<String, Object> colProps = new LinkedHashMap<>();
        for (ApiRespDto r : a.resps()) {
            Map<String, Object> sch = new LinkedHashMap<>();
            sch.put("type", openapiType(r.type()));
            String desc = r.displayName();
            if (r.maskRule() != null && !"none".equals(r.maskRule())) {
                desc = (desc == null ? "" : desc + " ") + "(마스킹: " + r.maskRule() + ")";
            }
            if (desc != null) {
                sch.put("description", desc);
            }
            colProps.put(r.col(), sch);
        }
        Map<String, Object> okSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "ok", Map.of("type", "boolean"),
                        "data", Map.of("type", "array", "items", Map.of("type", "object", "properties", colProps)),
                        "traceId", Map.of("type", "string")));
        op.put("responses", Map.of("200", Map.of(
                "description", "성공",
                "content", Map.of("application/json", Map.of("schema", okSchema)))));

        if (a.authRequired()) {
            op.put("security", List.of(Map.of("certKey", List.of())));
        }
        return op;
    }

    /** 파라미터/컬럼 타입 → OpenAPI type. number/date/boolean 외 전부 string. */
    private static String openapiType(String t) {
        if (t == null) {
            return "string";
        }
        String s = t.toLowerCase();
        if (s.contains("num") || s.contains("int") || s.contains("dec")) {
            return "number";
        }
        if (s.contains("bool")) {
            return "boolean";
        }
        return "string";
    }
}
