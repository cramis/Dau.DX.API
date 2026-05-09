// API 등록·수정 폼 (4탭 컨트롤러). create / edit 모두 같은 컴포넌트로 처리.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

const SELECT_CLS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  mode: "create" | "edit";
  initial: ApiDef | null;
  dataSources: DataSource[];
}

export function ApiForm({ mode, initial, dataSources }: Props) {
  const router = useRouter();
  const [validateMsg, setValidateMsg] = useState<string | null>(null);
  const [pathChecked, setPathChecked] = useState(mode === "edit");

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
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
            <TabsTrigger value="params">입력 파라미터</TabsTrigger>
            <TabsTrigger value="resps">응답 컬럼</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <Input placeholder="USER / GRADE / ..." {...field} />
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
                    <div className="flex gap-2">
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={checkPath}
                      >
                        중복확인
                      </Button>
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
                          <option value="">(등록된 데이터소스 없음)</option>
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
                    <div className="flex items-center gap-2 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
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
                    <div className="flex items-center gap-2 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        API 문서 노출
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="pt-4">
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
          </TabsContent>

          <TabsContent value="sql" className="pt-4">
            <FormField
              control={form.control}
              name="sql"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>SQL *</FormLabel>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={validateSql}
                    >
                      SQL 검증
                    </Button>
                  </div>
                  <FormControl>
                    <SqlEditor
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  {validateMsg ? (
                    <p className="rounded-md bg-muted/50 p-2 font-mono text-xs">
                      {validateMsg}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      바인드 변수는 <code className="font-mono">#&#123;name&#125;</code>{" "}
                      형식으로 작성하세요.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="params" className="pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  SQL 의 바인드 변수와 매칭되는 입력 파라미터 목록.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
                  + 행 추가
                </Button>
              </div>
              {params.fields.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  파라미터가 없습니다. 우측 상단의 행 추가를 누르세요.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2">이름</th>
                      <th className="py-2 pr-2">타입</th>
                      <th className="py-2 pr-2">필수</th>
                      <th className="py-2 pr-2">기본값</th>
                      <th className="py-2 pr-2">설명</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.fields.map((row, i) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-1 pr-2">
                          <Input {...form.register(`params.${i}.name`)} />
                        </td>
                        <td className="py-1 pr-2">
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
                        <td className="py-1 pr-2 text-center">
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
                        <td className="py-1 pr-2">
                          <Input
                            {...form.register(`params.${i}.defaultValue`)}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input {...form.register(`params.${i}.desc`)} />
                        </td>
                        <td className="py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => params.remove(i)}
                          >
                            삭제
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resps" className="pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  응답 컬럼과 마스킹 규칙. 1개 이상 필요합니다.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    resps.append({
                      col: "",
                      type: "VARCHAR",
                      displayName: "",
                      maskRule: "none",
                    })
                  }
                >
                  + 행 추가
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2">컬럼</th>
                    <th className="py-2 pr-2">타입</th>
                    <th className="py-2 pr-2">표시명</th>
                    <th className="py-2 pr-2">마스킹</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {resps.fields.map((row, i) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-1 pr-2">
                        <Input {...form.register(`resps.${i}.col`)} />
                      </td>
                      <td className="py-1 pr-2">
                        <Input {...form.register(`resps.${i}.type`)} />
                      </td>
                      <td className="py-1 pr-2">
                        <Input
                          {...form.register(`resps.${i}.displayName`)}
                        />
                      </td>
                      <td className="py-1 pr-2">
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
                      <td className="py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => resps.remove(i)}
                          disabled={resps.fields.length === 1}
                        >
                          삭제
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.formState.errors.resps?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.resps.message}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
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
      </form>
    </Form>
  );
}
