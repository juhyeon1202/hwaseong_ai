import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { PolicyPage } from "@/components/policy-page";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "이용약관",
};

const termsSections = [
  {
    title: "목적",
    paragraphs: [
      "이 약관은 화성 교통일지가 제공하는 교통일지, 익명 신고, 시민 게시판, 희망 노선, 참여 보상 등의 서비스 이용 조건을 정하는 것을 목적으로 합니다.",
    ],
  },
  {
    title: "서비스 내용",
    items: [
      "대중교통 이동 경험과 만족도 기록",
      "정류장 주변 교통 불편 익명 신고",
      "시민 게시판과 희망 노선 제안",
      "출석, 포인트, 룰렛 등 참여 보상",
      "시민 참여 데이터를 활용한 교통 현황 및 AI 분석 정보 제공",
    ],
  },
  {
    title: "회원의 의무",
    items: [
      "타인의 개인정보나 계정을 도용하지 않아야 합니다.",
      "허위 신고와 반복 신고 등 서비스 운영을 방해하는 행위를 해서는 안 됩니다.",
      "게시판에 욕설, 차별, 불법 정보, 개인정보를 게시해서는 안 됩니다.",
      "서비스의 보안 기능과 접근 권한을 우회해서는 안 됩니다.",
    ],
  },
  {
    title: "익명 신고 이용",
    paragraphs: [
      "익명 신고는 정류장에서 발생한 교통 불편을 빠르게 공유하기 위한 기능입니다.",
      "허위 신고와 자동화된 반복 신고가 확인되면 서비스 이용이 제한될 수 있습니다.",
    ],
  },
  {
    title: "게시물 관리",
    paragraphs: [
      "운영자는 다른 사용자의 권리를 침해하거나 서비스 목적에 맞지 않는 게시물을 숨김 또는 삭제 처리할 수 있습니다.",
    ],
    items: [
      "욕설, 비방 또는 혐오 표현",
      "허위 교통정보",
      "타인의 개인정보가 포함된 게시물",
      "광고, 스팸 또는 반복 게시물",
    ],
  },
  {
    title: "포인트와 보상",
    paragraphs: [
      "포인트와 룰렛 보상은 서비스 참여를 장려하기 위한 수단이며 현금으로 교환할 수 없습니다.",
      "부정한 방법으로 적립한 포인트와 보상은 회수될 수 있습니다.",
    ],
  },
  {
    title: "AI 제공 정보",
    paragraphs: [
      "AI가 생성한 교통 분석, 우회 안내, 민원 초안과 관리자 답변 초안은 참고용 정보입니다.",
      "실제 교통 상황이나 행정 처리 결과와 차이가 있을 수 있으며 중요한 내용은 관리자가 검토해야 합니다.",
    ],
  },
  {
    title: "서비스 변경 및 중단",
    paragraphs: [
      "프로토타입 운영 과정에서 기능과 화면이 변경되거나 일부 서비스가 일시적으로 중단될 수 있습니다.",
    ],
  },
  {
    title: "약관 변경",
    paragraphs: [
      "약관이 변경되는 경우 시행일과 변경 내용을 서비스 화면을 통해 안내합니다.",
    ],
  },
];

export default async function TermsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <PolicyPage
        title="이용약관"
        description="화성 교통일지 서비스를 안전하고 공정하게 이용하기 위한 기본 규칙입니다."
        updatedAt="2026년 7월 23일"
        sections={termsSections}
      />
    </AppShell>
  );
}