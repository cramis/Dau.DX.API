> Dau.DX.API 의 Oracle 19c MetaDB 구축을 위해 DBA 측 사전 확인·발급·운영 협의가 필요한 항목 정리. 본 문서와 함께 [`07_DBA_DDL.sql`](07_DBA_DDL.sql) 한 파일만 전달하면 충분하다.

# 07. DBA 요청서 (Oracle 19c MetaDB 구축)

---

## 0. 한 페이지 요약

| 항목 | 값 |
|---|---|
| 신청 부서 | (개발팀) |
| 신청 일자 | 2026-05-17 |
| 시스템명 | Dau.DX.API (차세대 SQL-to-REST API 게이트웨이, EzAPI 후속) |
| 환경 | Oracle 19c, 사내 인프라 |
| 스키마 사용자 | `DXAPI` (신규) |
| Tablespace | `TS_DXAPI_META` (비즈니스), `TS_DXAPI_MON` (모니터링) 두 종 |
| 테이블 개수 | 14개 (마스터 8 + 이력·승인·코드 3 + 신규 3) |
| 인덱스 개수 | 37개 (PK 14 + UNIQUE 4 + LOCAL 5 + 일반 14) |
| 시퀀스 개수 | 7개 |
| 공통 코드 시드 | 30건 (9 분류) |
| 스케줄러 잡 | 2개 (호출 이력 파티션 drop, Refresh 토큰 정리) |
| 예상 데이터량 | 1년차 ~50GB. `DXAPI_CALL_HIST_L` 7일 hot retention 가정 |
| 라이선스 의존 | **Partitioning** 옵션 (필수), **Advanced Compression** (선택) |
| 함께 제공되는 산출물 | 본 문서 + [`07_DBA_DDL.sql`](07_DBA_DDL.sql) (실행 스크립트) |
| 설계 근거 | [`06_DB_모델링.md`](06_DB_모델링.md) (코멘트·매핑 포함 정식 PRD) |

---

## 1. DBA 측 사전 확인 요청 (☐ → ☑ 회신 요망)

본 시스템 적용 전 다음 8가지 항목에 대한 확인이 필요합니다.

| # | 항목 | 영향 | 회신 요망 내용 |
|---|---|---|---|
| 1 | **Partitioning 옵션 라이선스** 보유 여부 | `DXAPI_CALL_HIST_L` 의 INTERVAL 파티셔닝 필수 | 미보유 시 → 일일 테이블 회전(`call_hist_20260517`) 방식으로 변경 필요 |
| 2 | **Advanced Compression 라이선스** 보유 여부 | `DXAPI_CALL_HIST_L` 저장 공간 40~60% 절감 | 미보유 시 → `COMPRESS FOR OLTP` 생략 |
| 3 | **PDB 분리 정책** | `DXAPI_MON` 별도 PDB 분리 vs 단일 PDB 운용 | 분리 시 모니터링 부하가 비즈니스 DB 에 영향 0 |
| 4 | **Tablespace 발급 가능 시점** | 본 시스템 적용 시작일 결정 | `TS_DXAPI_META` 32G / `TS_DXAPI_MON` 64G AUTOEXTEND |
| 5 | **사용자 비밀번호 정책** | `DXAPI` 사용자 생성 시 적용 | Vault 관리. 비밀번호 회전 주기 명시 요망 |
| 6 | **UNDO_RETENTION** 설정값 | 대량 INSERT/DROP PARTITION 워크로드 | 15분 권장. 사내 표준값과의 충돌 여부 |
| 7 | **사내 Unified Auditing 정책** | 관리자 SELECT 행위 audit 요건 여부 | PIPA 대응. 별도 audit policy 필요 시 정의 |
| 8 | **DR / Standby DB 정책** | `DXAPI_CALL_HIST_L` 의 Standby 복제 포함 여부 | 호출 이력은 RPO ≤ 1분 / RTO ≤ 5분 목표 |

---

## 2. 발급 요청 사항

### 2.1 Tablespace 2종

```sql
-- 비즈니스 메타 (마스터 11개 + 신규 3개의 META 분류 9개)
CREATE TABLESPACE TS_DXAPI_META
  DATAFILE 'ts_dxapi_meta_01.dbf' SIZE 1G AUTOEXTEND ON NEXT 256M MAXSIZE 32G
  EXTENT MANAGEMENT LOCAL AUTOALLOCATE
  SEGMENT SPACE MANAGEMENT AUTO;

-- 호출 이력 + DS 풀 시계열 (대량 INSERT + 일일 DROP PARTITION 전용)
CREATE TABLESPACE TS_DXAPI_MON
  DATAFILE 'ts_dxapi_mon_01.dbf' SIZE 2G AUTOEXTEND ON NEXT 512M MAXSIZE 64G
  EXTENT MANAGEMENT LOCAL AUTOALLOCATE
  SEGMENT SPACE MANAGEMENT AUTO;
```

데이터파일 경로(`'ts_dxapi_meta_01.dbf'`)는 사내 표준 경로로 치환해 주십시오.

### 2.2 사용자 1종

```sql
CREATE USER DXAPI IDENTIFIED BY "<vault-managed>"
  DEFAULT TABLESPACE TS_DXAPI_META
  QUOTA UNLIMITED ON TS_DXAPI_META
  QUOTA UNLIMITED ON TS_DXAPI_MON;

GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW,
      CREATE MATERIALIZED VIEW, CREATE PROCEDURE TO DXAPI;
```

- 비밀번호는 Vault 가 발급한 값으로 치환해 주십시오.
- 추후 모니터링/배치 잡 운영을 위해 `CREATE JOB` 권한도 부여 요망 (`GRANT CREATE JOB TO DXAPI`).

### 2.3 실행 순서

[`07_DBA_DDL.sql`](07_DBA_DDL.sql) 한 파일을 sqlplus 또는 SQL Developer 로 실행하면 다음 순서로 모두 적용됩니다.

```
섹션 1.  사전 준비 (Tablespace, USER, GRANT)         — 위 §2.1·§2.2 와 동일
섹션 2.  시퀀스 7종
섹션 3.  마스터 테이블 8종 + 코멘트 + 인덱스
섹션 4.  이력·승인·코드 3종 + 코멘트 + 인덱스
섹션 5.  신규 3종 (Refresh / Doc Cache / DS Stat) + 코멘트 + 인덱스
섹션 6.  공통 코드 시드 INSERT 32건 + COMMIT
섹션 7.  DBMS_SCHEDULER 잡 2종 (파티션 drop, 토큰 정리)
```

### 2.4 검증 쿼리 (실행 후)

```sql
-- 1. 객체 개수
SELECT object_type, COUNT(*) cnt FROM user_objects GROUP BY object_type;
-- 기대: TABLE 14, INDEX 23, SEQUENCE 7, JOB 2

-- 2. 코멘트 적용 확인
SELECT COUNT(*) FROM user_tab_comments  WHERE comments IS NOT NULL;  -- 기대 14
SELECT COUNT(*) FROM user_col_comments  WHERE comments IS NOT NULL;  -- 기대 ~150

-- 3. 파티션 확인
SELECT partition_name, high_value FROM user_tab_partitions
WHERE  table_name = 'DXAPI_CALL_HIST_L';
-- 기대: P_INIT 1건 (이후 INSERT 발생 시 INTERVAL 자동 생성)

-- 4. 공통 코드 시드 확인
SELECT cla_dvcd, COUNT(*) FROM DXAPI_EZ_CODE_M GROUP BY cla_dvcd;
-- 기대 9 분류 (USER_STTUS / API_STTUS / EXT_SYS_STTUS / ROLE / DB_TYPE / HTTP_MTHD / MASK_RULE / CONFM_TYPE / CONFM_STTUS) = 30건

-- 5. 스케줄 잡 확인
SELECT job_name, state, repeat_interval FROM user_scheduler_jobs;
-- 기대 JOB_DROP_OLD_CALL_HIST / JOB_PURGE_EXPIRED_REFRESH_TOKEN
```

---

## 3. 운영 항목 (DBA 협업 요망)

### 3.1 정기 작업

| 작업 | 주기 | 자동화 여부 | 책임 |
|---|---|---|---|
| `DXAPI_CALL_HIST_L` 7일 초과 파티션 DROP | 매일 03:00 | DBMS_SCHEDULER (`JOB_DROP_OLD_CALL_HIST`) 자동 | DBA 모니터링 |
| `DXAPI_REFRESH_TOKEN_L` 만료된 행 DELETE | 매일 04:00 | DBMS_SCHEDULER (`JOB_PURGE_EXPIRED_REFRESH_TOKEN`) 자동 | DBA 모니터링 |
| `DXAPI_DS_RUNTIME_STAT_L` 7일 초과 행 DELETE | 매일 04:30 | 본 문서 §3.3 의 추가 잡 등록 검토 | DBA 결정 |
| 통계 수집 (`GATHER_TABLE_STATS`) | 매일 02:00 | Oracle Auto Task 활용 또는 별도 잡 | DBA |
| Tablespace 사용량 모니터링 | 상시 | 사내 표준 모니터링 | DBA |
| 백업 (RMAN) | 사내 표준 | 사내 표준 | DBA |

### 3.2 모니터링 알람 임계치 제안

| 항목 | 경고 | 심각 |
|---|---|---|
| `TS_DXAPI_META` 사용률 | 70% | 85% |
| `TS_DXAPI_MON` 사용률 | 80% | 90% |
| `DXAPI_CALL_HIST_L` 파티션 개수 | > 10일치 (드롭 잡 실패 의심) | > 14일치 |
| `JOB_DROP_OLD_CALL_HIST` 실패 횟수 | 1회 | 2회 연속 |
| `DXAPI_REFRESH_TOKEN_L` 행 수 | > 사용자수 × 10 | > 사용자수 × 50 |

### 3.3 추가 등록 가능한 잡

`DXAPI_DS_RUNTIME_STAT_L` 의 7일 초과 행 삭제 잡(애플리케이션 단에서 처리 가능하지만 DB 측에 둘 수도 있음). DBA 와 협의 필요.

```sql
BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'JOB_PURGE_DS_STAT',
    job_type        => 'PLSQL_BLOCK',
    job_action      => q'[
      BEGIN
        DELETE FROM DXAPI_DS_RUNTIME_STAT_L
        WHERE  SNAPSHOT_DT < SYSTIMESTAMP - INTERVAL '7' DAY;
        COMMIT;
      END;
    ]',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=DAILY;BYHOUR=4;BYMINUTE=30',
    enabled         => TRUE,
    comments        => 'DS 풀 시계열 7일 초과 행 삭제'
  );
END;
/
```

---

## 4. 비상시 / 롤백

### 4.1 전체 롤백 (개발 단계 한정)

```sql
-- 1. 잡 무효화
BEGIN DBMS_SCHEDULER.DROP_JOB('JOB_DROP_OLD_CALL_HIST');         EXCEPTION WHEN OTHERS THEN NULL; END; /
BEGIN DBMS_SCHEDULER.DROP_JOB('JOB_PURGE_EXPIRED_REFRESH_TOKEN'); EXCEPTION WHEN OTHERS THEN NULL; END; /

-- 2. 객체 일괄 삭제 (DXAPI 스키마 접속 후)
BEGIN
  FOR o IN (SELECT object_name, object_type FROM user_objects
            WHERE object_type IN ('TABLE','SEQUENCE','VIEW','MATERIALIZED VIEW','PROCEDURE')) LOOP
    EXECUTE IMMEDIATE 'DROP '||o.object_type||' "'||o.object_name||'" CASCADE CONSTRAINTS PURGE';
  END LOOP;
END;
/

-- 3. (필요 시) 사용자·테이블스페이스 삭제 (SYSTEM 권한)
DROP USER DXAPI CASCADE;
DROP TABLESPACE TS_DXAPI_META INCLUDING CONTENTS AND DATAFILES;
DROP TABLESPACE TS_DXAPI_MON  INCLUDING CONTENTS AND DATAFILES;
```

**운영 단계 진입 후 본 절차는 사용 금지.** 데이터 유실 발생.

### 4.2 부분 롤백 (특정 테이블만)

각 `CREATE TABLE` 블록의 역순으로 `DROP TABLE ... CASCADE CONSTRAINTS PURGE` 를 실행. FK 의존성 때문에 다음 순서 권장.

```
1. DXAPI_DS_RUNTIME_STAT_L
2. DXAPI_REFRESH_TOKEN_L
3. DXAPI_API_DOC_CACHE_M
4. DXAPI_USER_APPR_L
5. DXAPI_CALL_HIST_L
6. DXAPI_USR_EXT_SYS_USER_M
7. DXAPI_EXT_SYS_API_MAP_M
8. DXAPI_API_RESP_M
9. DXAPI_API_PARAM_M
10. DXAPI_API_DEF_M       -- FK → DATASOURCE
11. DXAPI_USR_EXT_SYS_M
12. DXAPI_DATASOURCE_M
13. DXAPI_USR_USER_M
14. DXAPI_EZ_CODE_M
```

---

## 5. 보존 정책 (회신 시 검토 요망)

| 데이터 | 보존 기간 | 자동 작업 |
|---|---|---|
| `DXAPI_CALL_HIST_L` | 7일 hot | 매일 03:00 자동 drop |
| `DXAPI_DS_RUNTIME_STAT_L` | 7일 | 매일 04:30 자동 delete (§3.3 잡) |
| `DXAPI_REFRESH_TOKEN_L` (만료) | 30일 | 매일 04:00 자동 delete |
| `DXAPI_USER_APPR_L` | 영구 | — (감사 대응) |
| `DXAPI_USR_USER_M` (INACTIVE 1년+) | 1년 후 익명화 | 분기 1회 USER_NM/EMAIL/HP_NO 익명화 (애플리케이션) |
| 감사 컬럼 (REGDT/MODDT 등) | 영구 | — |

PIPA 보존기간 정책과 충돌 시 회신 부탁드립니다.

---

## 6. 성능 / 부하 ballpark (단일 인스턴스, 16 core / 32GB / SSD 가정)

| 부하 시나리오 | 호출 이력 INSERT 패턴 | CPU | INSERT 응답 영향 | 1년 데이터량 |
|---|---|---|---|---|
| 분당 1k (≈ 16 TPS) | 동기 INSERT | < 5% | < 1ms | ~5억 row, 100GB |
| 분당 10k (≈ 167 TPS) | 동기 INSERT | 10~20% | 1~3ms | ~50억 row, 1TB |
| 분당 60k (≈ 1000 TPS) | 1초/100건 배치 권장 | 30~50% | 0 (큐) | ~300억 row, 6TB |

대학 환경 1년차 가정은 **분당 1k 미만**. 단일 Oracle 인스턴스로 충분히 처리됩니다.

---

## 7. 회신 요청

다음 사항에 대한 회신을 부탁드립니다.

1. §1 의 8가지 사전 확인 항목.
2. §2.1 Tablespace 발급 가능 일자와 데이터파일 경로.
3. §2.2 `DXAPI` 사용자 비밀번호 (Vault 등록 후 별도 채널로 전달).
4. §3.1 운영 작업 책임 분담 (DBA / 개발팀 / 공동).
5. §5 보존 정책과 사내 PIPA 표준의 정합 여부.

---

**작성일**: 2026-05-17
**문의**: 개발팀
**관련 문서**:
- [`06_DB_모델링.md`](06_DB_모델링.md) — 14 테이블 설계 PRD (개발팀 참조용)
- [`07_DBA_DDL.sql`](07_DBA_DDL.sql) — 실행 스크립트 (UTF-8 인코딩, sqlplus/SQL Developer 호환)
- [`04_동아_오라클_모니터링.md`](04_동아_오라클_모니터링.md) — `call_history` 파티션 설계 근거
- [`open-questions.md` A5](../product/open-questions.md) — Oracle 단독 캐시·큐 전략 결정
