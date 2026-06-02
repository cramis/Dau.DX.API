// API 문서 공개 엔드포인트(비로그인). OpenAPI 3 스펙 + FE 뷰어용 목록. AuthSupport 미호출 = 공개(Spring Security 없음). FR7.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.ItemsResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class DocsController {

    private final ApiDefService service;
    private final String baseUrl;
    private final String version;

    public DocsController(ApiDefService service,
                          @Value("${app.gateway.public-base-url:http://localhost:8080}") String baseUrl,
                          @Value("${app.version:0.0.0}") String version) {
        this.service = service;
        this.baseUrl = baseUrl;
        this.version = version;
    }

    /** 전체 OpenAPI 3 스펙(DOC_DISP_YN=Y 만). 공개·SQL 비포함. */
    @GetMapping("/openapi.json")
    public Map<String, Object> openapi() {
        return OpenApiSpecBuilder.build(service.listDocVisible(), baseUrl, version);
    }

    /** 그룹별 OpenAPI 스펙. */
    @GetMapping("/openapi/{group}.json")
    public Map<String, Object> openapiByGroup(@PathVariable String group) {
        List<ApiDefResponse> apis = service.listDocVisible().stream()
                .filter(a -> group.equalsIgnoreCase(a.group()))
                .toList();
        return OpenApiSpecBuilder.build(apis, baseUrl, version);
    }

    /** FE 문서 뷰어용 목록(공개, docVisible, SQL 제외). */
    @GetMapping("/api/docs/apis")
    public ApiResponse<ItemsResponse<PublicApiDoc>> docsApis() {
        return ApiResponse.ok(service.publicDocs());
    }
}
