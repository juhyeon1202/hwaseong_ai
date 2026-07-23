import type { Metadata } from "next";

import {
  InquiryDeleteButton,
  InquiryEditModal,
} from "@/components/inquiry-edit-modal";

import { InquiryForm } from "@/components/account-tools";
import {
  Badge,
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

type InquiriesPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
  }>;
};

const statusLabels: Record<InquiryStatus, string> = {
  waiting: "답변 대기",
  in_progress: "확인 중",
  completed: "답변 완료",
};

export default async function InquiriesPage({
  searchParams,
}: InquiriesPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const mode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;

  if (mode === "write") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-brand-text">
            고객 지원
          </p>

          <h1 className="mt-2 text-2xl font-bold text-main sm:text-3xl">
            1:1 문의 작성
          </h1>

          <p className="mt-2 text-sm leading-6 text-secondary">
            서비스 이용 중 궁금한 점이나 불편한 내용을 남겨 주세요.
            등록한 문의와 답변은 마이페이지에서 확인할 수 있습니다.
          </p>
        </header>

        <InquiryForm />

        <p className="mt-4 text-center text-xs leading-5 text-muted">
          문의 내용은 작성자 본인과 관리자만 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
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
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const inquiries = (data as Inquiry[] | null) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <SectionHeader
        title="나의 1:1 문의"
        description="내가 등록한 문의와 관리자 답변을 확인하세요."
      />

      {error ? (
        <Card>
          <p role="alert" className="text-sm text-danger">
            문의 내역을 불러오지 못했습니다.
          </p>
        </Card>
      ) : inquiries.length === 0 ? (
        <EmptyState
          title="등록한 문의가 없습니다"
          description="프로필 메뉴의 1:1 문의에서 새로운 문의를 등록할 수 있습니다."
        />
      ) : (
        <ul className="space-y-4">
          {inquiries.map((inquiry) => (
            <InquiryItem
              key={inquiry.id}
              inquiry={inquiry}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InquiryItem({
  inquiry,
}: {
  inquiry: Inquiry;
}) {
  const canEdit = inquiry.status === "waiting";

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={inquiry.status} />

          <span className="ml-auto text-xs text-muted">
            {formatDateTime(inquiry.created_at)}
          </span>
        </div>

        <h2 className="mt-4 font-bold text-main">
          {inquiry.title}
        </h2>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
          {inquiry.content}
        </p>

        {inquiry.admin_response ? (
          <div className="mt-5 rounded-control bg-brand-softer p-4">
            <p className="text-xs font-semibold text-brand-text">
              관리자 답변
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-main">
              {inquiry.admin_response}
            </p>

            {inquiry.responded_at && (
              <p className="mt-3 text-xs text-muted">
                답변일 {formatDateTime(inquiry.responded_at)}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-control bg-surface-muted p-4">
            <p className="text-sm text-secondary">
              관리자가 문의 내용을 확인하고 있습니다.
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEdit && (
              <InquiryEditModal
                inquiry={{
                  id: inquiry.id,
                  title: inquiry.title,
                  content: inquiry.content,
                }}
              />
            )}

            <InquiryDeleteButton
              inquiryId={inquiry.id}
              inquiryTitle={inquiry.title}
            />
          </div>

          {!canEdit && (
            <p className="mt-3 text-right text-xs text-muted">
              관리자가 확인을 시작한 문의는 수정할 수 없습니다.
            </p>
          )}
        </div>
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
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}