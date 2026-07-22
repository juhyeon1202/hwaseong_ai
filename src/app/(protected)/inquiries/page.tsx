import type { Metadata } from "next";

import {
  respondToInquiry,
} from "@/app/(protected)/account-actions";
import { AppShell } from "@/components/app-shell";
import {
  InquiryForm,
} from "@/components/account-tools";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "1:1 문의",
};

type InquiryStatus =
  | "waiting"
  | "in_progress"
  | "completed";

type Inquiry = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatus;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

const statusLabels = {
  waiting: "답변 대기",
  in_progress: "확인 중",
  completed: "답변 완료",
} as const;

export default async function InquiriesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("inquiries")
    .select(
      `
        id,
        user_id,
        title,
        content,
        status,
        admin_response,
        responded_at,
        created_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (user.role !== "admin") {
    query = query.eq(
      "user_id",
      user.id,
    );
  }

  const { data, error } = await query;

  const inquiries =
    (data as Inquiry[] | null) ?? [];

  return (
    <AppShell user={user}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="space-y-4">
          <SectionHeader
            title={
              user.role === "admin"
                ? "전체 1:1 문의"
                : "나의 1:1 문의"
            }
            description={
              user.role === "admin"
                ? "시민 문의를 확인하고 답변합니다."
                : "등록한 문의와 답변을 확인하세요."
            }
          />

          {error ? (
            <Card>
              <p className="text-sm text-danger">
                문의를 불러오지 못했습니다.
              </p>
            </Card>
          ) : inquiries.length === 0 ? (
            <EmptyState
              title="등록된 문의가 없습니다"
              description="서비스 이용 중 궁금한 점을 남겨 주세요."
            />
          ) : (
            <ul className="space-y-3">
              {inquiries.map(
                (inquiry) => (
                  <InquiryItem
                    key={inquiry.id}
                    inquiry={inquiry}
                    isAdmin={
                      user.role ===
                      "admin"
                    }
                  />
                ),
              )}
            </ul>
          )}
        </section>

        <aside>
          <InquiryForm />
        </aside>
      </div>
    </AppShell>
  );
}

function InquiryItem({
  inquiry,
  isAdmin,
}: {
  inquiry: Inquiry;
  isAdmin: boolean;
}) {
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={inquiry.status}
          />

          <span className="ml-auto text-xs text-muted">
            {formatDateTime(
              inquiry.created_at,
            )}
          </span>
        </div>

        <h2 className="mt-4 font-bold text-main">
          {inquiry.title}
        </h2>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
          {inquiry.content}
        </p>

        {inquiry.admin_response && (
          <div className="mt-5 rounded-control bg-brand-softer p-4">
            <p className="text-xs font-semibold text-brand-text">
              관리자 답변
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-main">
              {inquiry.admin_response}
            </p>
          </div>
        )}

        {isAdmin && (
          <form
            action={respondToInquiry}
            className="mt-5 space-y-3 border-t border-line-light pt-5"
          >
            <input
              type="hidden"
              name="inquiryId"
              value={inquiry.id}
            />

            <select
              name="status"
              defaultValue={
                inquiry.status
              }
              className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-main outline-none focus:border-brand"
            >
              <option value="waiting">
                답변 대기
              </option>

              <option value="in_progress">
                확인 중
              </option>

              <option value="completed">
                답변 완료
              </option>
            </select>

            <textarea
              name="response"
              rows={4}
              maxLength={3000}
              defaultValue={
                inquiry.admin_response ??
                ""
              }
              placeholder="관리자 답변"
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-3 text-sm text-main outline-none focus:border-brand"
            />

            <Button
              type="submit"
              fullWidth
            >
              답변 저장
            </Button>
          </form>
        )}
      </Card>
    </li>
  );
}

function StatusBadge({
  status,
}: {
  status: InquiryStatus;
}) {
  if (status === "completed") {
    return (
      <Badge variant="success">
        {statusLabels[status]}
      </Badge>
    );
  }

  if (status === "in_progress") {
    return (
      <Badge variant="warning">
        {statusLabels[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="info">
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}