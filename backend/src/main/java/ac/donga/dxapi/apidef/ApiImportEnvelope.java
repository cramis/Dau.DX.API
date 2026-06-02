// API 일괄 import envelope. FE 와 동일 형식 {version,kind,items}. export round-trip.
package ac.donga.dxapi.apidef;

import java.util.List;

public record ApiImportEnvelope(Integer version, String kind, List<ApiImportItem> items) {
}
