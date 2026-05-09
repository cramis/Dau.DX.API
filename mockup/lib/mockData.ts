// 메모리 시드 데이터. 새로고침 시 모듈 재로드되면 초기 상태로 복원된다.
import type {
  ApiDef,
  Approval,
  CallHistory,
  DataSource,
  ExtSystem,
  User,
} from "@/types/api";

export const mockData: {
  users: User[];
  apis: ApiDef[];
  dataSources: DataSource[];
  extSystems: ExtSystem[];
  callHistory: CallHistory[];
  approvals: Approval[];
} = {
  users: [
    {
      id: "admin01",
      name: "관리자",
      email: "admin01@donga.ac.kr",
      org: "동아대학교",
      dept: "정보전산원",
      phone: "010-1111-2222",
      role: "ADMIN",
      status: "ACTIVE",
      lastLoginAt: "2026-05-09T09:00:00",
    },
    {
      id: "user01",
      name: "홍길동",
      email: "user01@donga.ac.kr",
      org: "동아대학교",
      dept: "학사지원처",
      phone: "010-3333-4444",
      role: "USER",
      status: "ACTIVE",
    },
    {
      id: "user02",
      name: "김신청",
      email: "pending@donga.ac.kr",
      org: "동아대학교",
      dept: "교무처",
      phone: "010-5555-6666",
      role: "USER",
      status: "PENDING",
    },
  ],

  dataSources: [
    {
      id: "DS20260509001",
      name: "Oracle19c-prod",
      dbType: "ORACLE",
      jdbcUrl: "jdbc:oracle:thin:@10.0.0.10:1521:PRODDB",
      dbUser: "dxapi",
      poolMin: 5,
      poolMax: 20,
      queryTimeoutSec: 10,
      useYn: "Y",
    },
  ],

  apis: [
    {
      no: "A20260509001",
      name: "사용자 정보 조회",
      group: "USER",
      method: "GET",
      path: "sample-user-info",
      status: "ACTIVE",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: true,
      sql: "SELECT user_id, user_nm, dept_nm FROM v_user WHERE user_id = #{id}",
      params: [{ name: "id", type: "string", required: true, desc: "사용자 ID" }],
      resps: [
        { col: "user_id", type: "VARCHAR", displayName: "사용자ID", maskRule: "none" },
        { col: "user_nm", type: "VARCHAR", displayName: "사용자명", maskRule: "name" },
        { col: "dept_nm", type: "VARCHAR", displayName: "부서명", maskRule: "none" },
      ],
    },
    {
      no: "A20260509002",
      name: "성적 목록 조회",
      group: "GRADE",
      method: "GET",
      path: "sample-grade-list",
      status: "ACTIVE",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: true,
      sql: "SELECT subject, grade, semester FROM v_grade WHERE user_id = #{id}",
      params: [{ name: "id", type: "string", required: true }],
      resps: [
        { col: "subject", type: "VARCHAR", maskRule: "none" },
        { col: "grade", type: "VARCHAR", maskRule: "none" },
        { col: "semester", type: "VARCHAR", maskRule: "none" },
      ],
    },
    {
      no: "A20260509003",
      name: "성적 저장",
      group: "GRADE",
      method: "POST",
      path: "sample-grade-save",
      status: "ACTIVE",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: true,
      sql: "INSERT INTO grade (user_id, subject, grade) VALUES (#{id}, #{subject}, #{grade})",
      params: [
        { name: "id", type: "string", required: true },
        { name: "subject", type: "string", required: true },
        { name: "grade", type: "string", required: true },
      ],
      resps: [{ col: "saved", type: "NUMBER", maskRule: "none" }],
    },
    {
      no: "A20260509004",
      name: "부서 트리 조회",
      group: "DEPT",
      method: "GET",
      path: "sample-dept-tree",
      status: "ACTIVE",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: true,
      sql: "SELECT id, name, parent_id FROM v_dept",
      params: [],
      resps: [
        { col: "id", type: "VARCHAR", maskRule: "none" },
        { col: "name", type: "VARCHAR", maskRule: "none" },
      ],
    },
    {
      no: "A20260509005",
      name: "알림 발송",
      group: "NOTIFY",
      method: "POST",
      path: "sample-notification-send",
      status: "DRAFT",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: false,
      sql: "CALL sp_send_notification(#{userId}, #{message})",
      params: [
        { name: "userId", type: "string", required: true },
        { name: "message", type: "string", required: true },
      ],
      resps: [
        { col: "messageId", type: "VARCHAR", maskRule: "none" },
        { col: "sentAt", type: "VARCHAR", maskRule: "none" },
      ],
    },
  ],

  extSystems: [
    {
      id: "E20260509001",
      name: "학사정보시스템",
      certKey: "AKAD0001-XXXXYYYY-ZZZZAAAA-BBBBCCCC",
      allowedIps: ["10.0.0.0/24", "127.0.0.1/32"],
      useBegin: "2026-01-01T00:00:00",
      useEnd: "2026-12-31T23:59:59",
      mappedApis: ["A20260509001", "A20260509002"],
      picgName: "이담당",
      picgEmail: "picg@donga.ac.kr",
      status: "ACTIVE",
    },
  ],

  callHistory: [],
  approvals: [],
};
