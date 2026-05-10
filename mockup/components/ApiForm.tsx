// API 등록·수정 폼 (4탭 컨트롤러). create / edit 모두 같은 컴포넌트로 처리.
// Wanted 카드 + wide 탭 + 균등 그리드로 리뉴얼. e2e 계약(role=tab/tabpanel, label, button name, register name) 보존.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { I } from "@/components/design/Icons";
import { SqlEditor } from "@/components/SqlEditor";
import { apiCreateSchema, type ApiCreateInput } from "@/lib/schemas/api";
import type { ApiDef, DataSource } from "@/types/api";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;
const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
const PARAM_TYPES = ["string", "number", "date", "boolean"] as const;
const MASK_RULES = [
  "none",
  "name",
  "phone",
  "email",
  "rrn",
  "card",
  "addr",
] as const;

type TabId = "basic" | "sql" | "params" | "resps";
const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "기본 정보" },
  { id: "sql", label: "SQL" },
  { id: "params", label: "입력 파라미터" },
  { id: "resps", label: "응답 컬럼" },
];

const SELECT_CLS = "w-select";

interface Props {
  mode: "create" | "edit";
  initial: ApiDef | null;
  dataSources: DataSource[];
}

export function ApiForm({ mode, initial, dataSources }: Props) {
  const router = useRouter();
  const [validateMsg, setValidateMsg] = useState<string | null>(null);
  const [pathChecked, setPathChecked] = useState(mode === "edit");
  const [tab, setTab] = useState<TabId>("basic");

  const form = useForm<ApiCreateInput>({
    resolver: zodResolver(apiCreateSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          group: initial.group,
          method: initial.method,
          path: initial.path,
          status: initial.status,
          dataSrcId: initial.dataSrcId,
          authRequired: initial.authRequired,
          docVisible: initial.docVisible,
          sql: initial.sql,
          desc: initial.desc ?? "",
          params: initial.params,
          resps: initial.resps,
        }
      : {
          name: "",
          group: "",
          method: "GET",
          path: "",
          status: "DRAFT",
          dataSrcId: dataSources[0]?.id ?? "",
          authRequired: true,
          docVisible: true,
          sql: "",
          desc: "",
          params: [],
          resps: [
            { col: "", type: "VARCHAR", displayName: "", maskRule: "none" },
          ],
        },
  });

  const params = useFieldArray({ control: form.control, name: "params" });
  const resps = useFieldArray({ control: form.control, name: "resps" });

  async function checkPath() {
    const path = form.getValues("path");
    if (!path) {
      form.setError("path", { message: "경로를 입력해주세요." });
      return;
    }
    const url = new URL(
      "/api/mock/apis/check-path",
      window.location.origin
    );
    url.searchParams.set("path", path);
    if (initial?.no) url.searchParams.set("excludeNo", initial.no);
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (data?.available) {
      toast.success("사용 가능한 경로입니다.");
      setPathChecked(true);
    } else {
      toast.error("이미 사용 중인 경로입니다.");
      setPathChecked(false);
    }
  }

  async function validateSql() {
    const sql = form.getValues("sql");
    if (!sql.trim()) {
      toast.error("SQL 을 입력해주세요.");
      return;
    }
    const res = await fetch("/api/mock/apis/validate-sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.ok) {
      setValidateMsg(data.plan);
      toast.success("SQL 형식이 유효합니다.");
    } else {
      setValidateMsg(null);
      toast.error("SQL 검증 실패");
    }
  }

  async function onSubmit(values: ApiCreateInput) {
    if (mode === "create" && !pathChecked) {
      toast.error("경로 중복확인을 먼저 해주세요.");
      return;
    }
    const url =
      mode === "create"
        ? "/api/mock/apis"
        : `/api/mock/apis/${initial!.no}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.message === "PATH_EXISTS") {
        toast.error("이미 사용 중인 경로입니다.");
        setPathChecked(false);
        return;
      }
      toast.error(mode === "create" ? "등록 실패" : "수정 실패");
      return;
    }
    toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
    router.push("/api-list");
    router.refresh();
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/mock/apis/${initial.no}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("삭제 실패");
      return;
    }
    toast.success("삭제되었습니다.");
    router.push("/api-list");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="w-card">
          <div className="w-tabs w-tabs--wide" role="tablist">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`apiform-panel-${t.id}`}
                id={`apiform-tab-${t.id}`}
                className={`w-tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="w-tab__num">{i + 1}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="w-card__body">
            <div
              role="tabpanel"
              id={`apiform-panel-${tab}`}
              aria-labelledby={`apiform-tab-${tab}`}
              hidden={tab !== "basic"}
            >
              {tab === "basic" && (
                <>
                  <div className="w-form-grid">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API 이름 *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>그룹 *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="USER / GRADE / ..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP 메서드 *</FormLabel>
                          <FormControl>
                            <select
                              className={SELECT_CLS}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value as (typeof HTTP_METHODS)[number]
                                )
                              }
                            >
                              {HTTP_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>경로(path) *</FormLabel>
                          <div style={{ display: "flex", gap: 8 }}>
                            <FormControl>
                              <Input
                                placeholder="sample-user-info"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setPathChecked(false);
                                }}
                              />
                            </FormControl>
                            <button
                              type="button"
                              className="w-btn w-btn--ghost"
                              onClick={checkPath}
                            >
                              중복확인
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>상태 *</FormLabel>
                          <FormControl>
                            <select
                              className={SELECT_CLS}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value as (typeof STATUSES)[number]
                                )
                              }
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dataSrcId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>데이터소스 *</FormLabel>
                          <FormControl>
                            <select
                              className={SELECT_CLS}
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                            >
                              {dataSources.length === 0 ? (
                                <option value="">
                                  (등록된 데이터소스 없음)
                                </option>
                              ) : (
                                dataSources.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} ({d.dbType})
                                  </option>
                                ))
                              )}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authRequired"
                      render={({ field }) => (
                        <FormItem>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              paddingTop: 24,
                            }}
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <FormLabel style={{ cursor: "pointer", margin: 0 }}>
                              인증 필수
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="docVisible"
                      render={({ field }) => (
                        <FormItem>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              paddingTop: 24,
                            }}
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <FormLabel style={{ cursor: "pointer", margin: 0 }}>
                              API 문서 노출
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="desc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>설명</FormLabel>
                            <FormControl>
                              <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              role="tabpanel"
              id="apiform-panel-sql"
              aria-labelledby="apiform-tab-sql"
              hidden={tab !== "sql"}
            >
              {tab === "sql" && (
                <FormField
                  control={form.control}
                  name="sql"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-form-toolbar">
                        <FormLabel>SQL *</FormLabel>
                        <button
                          type="button"
                          className="w-btn w-btn--ghost w-btn--sm"
                          onClick={validateSql}
                        >
                          <I name="Check" size={12} /> SQL 검증
                        </button>
                      </div>
                      <FormControl>
                        <SqlEditor value={field.value} onChange={field.onChange} />
                      </FormControl>
                      {validateMsg ? (
                        <p
                          className="w-mono"
                          style={{
                            background: "var(--w-bg-alternative)",
                            padding: 10,
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--w-fg-strong)",
                            marginTop: 8,
                          }}
                        >
                          {validateMsg}
                        </p>
                      ) : (
                        <p
                          className="w-muted"
                          style={{ fontSize: 12, marginTop: 8 }}
                        >
                          바인드 변수는{" "}
                          <code className="w-mono">#&#123;name&#125;</code>{" "}
                          형식으로 작성하세요.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div
              role="tabpanel"
              id="apiform-panel-params"
              aria-labelledby="apiform-tab-params"
              hidden={tab !== "params"}
            >
              {tab === "params" && (
                <>
                  <div className="w-form-toolbar">
                    <p className="w-muted" style={{ fontSize: 13, margin: 0 }}>
                      SQL 의 바인드 변수와 매칭되는 입력 파라미터 목록.
                    </p>
                    <button
                      type="button"
                      className="w-btn w-btn--ghost w-btn--sm"
                      onClick={() =>
                        params.append({
                          name: "",
                          type: "string",
                          required: true,
                          defaultValue: "",
                          desc: "",
                        })
                      }
                    >
                      <I name="Plus" size={12} /> 행 추가
                    </button>
                  </div>
                  {params.fields.length === 0 ? (
                    <div className="w-empty">
                      <p className="w-empty__title">파라미터가 없습니다</p>
                      <p className="w-empty__sub">
                        우측 상단의 [+ 행 추가] 를 누르세요.
                      </p>
                    </div>
                  ) : (
                    <div className="w-tbl-wrap">
                      <table className="w-form-table">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th style={{ width: 110 }}>타입</th>
                            <th style={{ width: 60 }}>필수</th>
                            <th>기본값</th>
                            <th>설명</th>
                            <th style={{ width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {params.fields.map((row, i) => (
                            <tr key={row.id}>
                              <td>
                                <Input {...form.register(`params.${i}.name`)} />
                              </td>
                              <td>
                                <select
                                  className={SELECT_CLS}
                                  {...form.register(`params.${i}.type`)}
                                >
                                  {PARAM_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <Checkbox
                                  checked={form.watch(`params.${i}.required`)}
                                  onCheckedChange={(v) =>
                                    form.setValue(
                                      `params.${i}.required`,
                                      v === true
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <Input
                                  {...form.register(`params.${i}.defaultValue`)}
                                />
                              </td>
                              <td>
                                <Input {...form.register(`params.${i}.desc`)} />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="w-btn w-btn--ghost w-btn--sm"
                                  onClick={() => params.remove(i)}
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              role="tabpanel"
              id="apiform-panel-resps"
              aria-labelledby="apiform-tab-resps"
              hidden={tab !== "resps"}
            >
              {tab === "resps" && (
                <>
                  <div className="w-form-toolbar">
                    <p className="w-muted" style={{ fontSize: 13, margin: 0 }}>
                      응답 컬럼과 마스킹 규칙. 1개 이상 필요합니다.
                    </p>
                    <button
                      type="button"
                      className="w-btn w-btn--ghost w-btn--sm"
                      onClick={() =>
                        resps.append({
                          col: "",
                          type: "VARCHAR",
                          displayName: "",
                          maskRule: "none",
                        })
                      }
                    >
                      <I name="Plus" size={12} /> 행 추가
                    </button>
                  </div>
                  <div className="w-tbl-wrap">
                    <table className="w-form-table">
                      <thead>
                        <tr>
                          <th>컬럼</th>
                          <th style={{ width: 130 }}>타입</th>
                          <th>표시명</th>
                          <th style={{ width: 130 }}>마스킹</th>
                          <th style={{ width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resps.fields.map((row, i) => (
                          <tr key={row.id}>
                            <td>
                              <Input {...form.register(`resps.${i}.col`)} />
                            </td>
                            <td>
                              <Input {...form.register(`resps.${i}.type`)} />
                            </td>
                            <td>
                              <Input
                                {...form.register(`resps.${i}.displayName`)}
                              />
                            </td>
                            <td>
                              <select
                                className={SELECT_CLS}
                                {...form.register(`resps.${i}.maskRule`)}
                              >
                                {MASK_RULES.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="w-btn w-btn--ghost w-btn--sm"
                                onClick={() => resps.remove(i)}
                                disabled={resps.fields.length === 1}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {form.formState.errors.resps?.message && (
                    <p
                      style={{
                        color: "var(--w-tint-critical)",
                        fontSize: 12.5,
                        marginTop: 8,
                      }}
                    >
                      {form.formState.errors.resps.message}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "14px 20px",
              borderTop: "1px solid var(--w-line-neutral)",
              background: "var(--w-bg-alternative)",
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              flexWrap: "wrap",
            }}
          >
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "저장 중..."
                : mode === "create"
                  ? "등록"
                  : "수정 저장"}
            </Button>
            {mode === "edit" && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                삭제
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/api-list")}
            >
              취소
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
