// 등록 SQL 을 대상 DS 에서 실행. #{param} → :param 바인딩(literal 결합 차단). 결과 컬럼 마스킹.
package ac.donga.dxapi.gateway;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
        DataSource ds = registry.get(api.dataSrcId());
        NamedParameterJdbcTemplate tpl = new NamedParameterJdbcTemplate(ds);
        String sql = toNamed(api.sqlText());

        String verb = sql.trim().split("\\s+", 2)[0].toUpperCase();
        if ("SELECT".equals(verb)) {
            List<Map<String, Object>> rows = tpl.queryForList(sql, params);
            return maskRows(rows, resps);
        }
        int affected = tpl.update(sql, params);
        return Map.of("affected", affected);
    }

    private List<Map<String, Object>> maskRows(List<Map<String, Object>> rows, List<ApiRespDef> resps) {
        Map<String, String> ruleByCol = new LinkedHashMap<>();
        for (ApiRespDef r : resps) {
            ruleByCol.put(r.colNm().toLowerCase(), r.maskRuleDvcd());
        }
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

    static String toNamed(String sql) {
        return BIND.matcher(sql).replaceAll(":$1");
    }
}
