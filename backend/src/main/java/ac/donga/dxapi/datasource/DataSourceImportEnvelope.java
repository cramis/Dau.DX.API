// 데이터소스 일괄 import envelope {version,kind:"dataSource",items}. export round-trip.
package ac.donga.dxapi.datasource;

import java.util.List;

public record DataSourceImportEnvelope(Integer version, String kind, List<DataSourceImportItem> items) {
}
