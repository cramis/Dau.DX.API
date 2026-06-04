// 연계시스템 일괄 import envelope {version,kind:"extSystem",items}. export round-trip.
package ac.donga.dxapi.extsystem;

import java.util.List;

public record ExtSystemImportEnvelope(Integer version, String kind, List<ExtSystemImportItem> items) {
}
