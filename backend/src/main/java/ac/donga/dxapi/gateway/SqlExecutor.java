// 등록 SQL 을 대상 DS 에서 실행. #{param} → :param 바인딩(literal 결합 차단). 결과 컬럼 마스킹.
package ac.donga.dxapi.gateway;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SqlExecutor {

    private static final Pattern BIND = Pattern.compile("#\\{\\s*(\\w+)\\s*}");

    private final DataSourceRegistry registry;
    private final MaskingApplier masking;

    public SqlExecutor(DataSourceRegistry registry, MaskingApplier masking) {
        this.registry = registry;
        this.masking = masking;
    }

    public Object execute(GatewayApi api, List<ApiRespDef> resps, Map<String, Object> params) {
        // 런타임 하드가드 — 등록 우회(직접 DB·import 등) SQL 방어. 관대 모드이나 DDL/DELETE/다중문/위험패키지는 거부.
        SqlPolicy.Result policy = SqlPolicy.check(api.sqlText(), true);
        if (!policy.allowed()) {
            throw new IllegalStateException("SQL policy 위반: " + policy.reason());
        }
        DataSource ds = registry.get(api.dataSrcId());
        NamedParameterJdbcTemplate tpl = new NamedParameterJdbcTemplate(ds);
        String sql = toNamed(api.sqlText());
        Map<String, Object> bound = withBindDefaults(api.sqlText(), params);

        String verb = sql.trim().split("\\s+", 2)[0].toUpperCase();
        if ("SELECT".equals(verb)) {
            List<Map<String, Object>> rows = tpl.queryForList(sql, bound);
            return maskRows(rows, resps);
        }
        int affected = tpl.update(sql, bound);
        return Map.of("affected", affected);
    }

    private List<Map<String, Object>> maskRows(List<Map<String, Object>> rows, List<ApiRespDef> resps) {
        Map<String, String> ruleByCol = new LinkedHashMap<>();
        for (ApiRespDef r : resps) {
            ruleByCol.put(r.colNm().toLowerCase(), r.maskRuleDvcd());
        }
        return mask(rows, ruleByCol);
    }

    /** 응답 행 마스킹 — 컬럼 소문자 정규화 + 규칙 적용. 게이트웨이·test-run 공용. */
    public List<Map<String, Object>> mask(List<Map<String, Object>> rows, Map<String, String> ruleByCol) {
        for (Map<String, Object> row : rows) {
            // Oracle 은 컬럼명을 대문자로 반환 — 소문자 키로 정규화 후 마스킹.
            Map<String, Object> normalized = new LinkedHashMap<>();
            for (Map.Entry<String, Object> e : row.entrySet()) {
                String col = e.getKey().toLowerCase();
                String rule = ruleByCol.get(col);
                normalized.put(col, rule == null ? e.getValue() : masking.apply(rule, e.getValue()));
            }
            row.clear();
            row.putAll(normalized);
        }
        return rows;
    }

    /** #{param} → :param 치환. 게이트웨이·test-run 공용. */
    public static String toNamed(String sql) {
        return BIND.matcher(sql).replaceAll(":$1");
    }

    /**
     * SQL 의 모든 #{param} 바인드명을 추출해, params 에 없는 키는 null 로 채운 사본 반환.
     * 선택 파라미터 미입력 시 NamedParameterJdbcTemplate 의 'No value supplied' 방지. 게이트웨이·test-run 공용.
     */
    public static Map<String, Object> withBindDefaults(String sql, Map<String, Object> params) {
        Map<String, Object> filled = new LinkedHashMap<>(params);
        Matcher m = BIND.matcher(sql);
        while (m.find()) {
            filled.putIfAbsent(m.group(1), null);
        }
        return filled;
    }
}
