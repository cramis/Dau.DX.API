// 목록 응답 공통 래퍼. { items: [...] }. 05 계약의 목록 엔드포인트 형태.
package ac.donga.dxapi.common;

import java.util.List;

public record ItemsResponse<T>(List<T> items) {
}
