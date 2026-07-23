import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { PolicyPage } from "@/components/policy-page";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

const privacySections = [
  {
    title: "수집하는 개인정보",
    paragraphs: [
      "화성 교통일지는 회원가입과 서비스 제공에 필요한 최소한의 개인정보만 수집합니다.",
    ],
    items: [
      "필수정보: 로그인 이메일, 비밀번호 인증정보, 닉네임",
      "선택정보: 거주지역, 생년월일, 성별, 선호 언어",
      "서비스 이용정보: 교통일지, 출석 기록, 포인트 내역, 즐겨찾기, 문의 내용",
    ],
  },
  {
    title: "개인정보 이용 목적",
    items: [
      "회원 식별과 로그인 상태 유지",
      "교통일지와 사용자 참여 내역 제공",
      "거주지역 기준 참여 통계 제공",
      "1:1 문의 처리와 서비스 오류 대응",
      "부정 이용과 중복 참여 방지",
    ],
  },
  {
    title: "위치정보 처리",
    paragraphs: [
      "정류장 익명 신고 시 현재 위치는 선택한 정류장과의 거리 확인에만 사용합니다.",
      "현재 GPS 좌표는 거리 검증 후 폐기하며 익명 신고 테이블에는 저장하지 않습니다.",
    ],
    items: [
      "저장 항목: 정류장 ID, 신고 시각, 불편 유형, 노선번호(선택)",
      "저장하지 않는 항목: 신고자의 GPS 좌표와 화면에 표시되는 개인 식별정보",
    ],
  },
  {
    title: "보유 및 이용 기간",
    paragraphs: [
      "회원정보는 회원탈퇴 시까지 보관합니다. 관련 법령에 따라 보존할 필요가 있는 정보는 해당 기간 동안 별도로 보관할 수 있습니다.",
    ],
    items: [
      "회원 프로필: 회원탈퇴 시까지",
      "교통일지와 참여내역: 사용자가 삭제하거나 회원탈퇴할 때까지",
      "1:1 문의 기록: 처리 완료 후 운영정책에 따른 기간까지",
    ],
  },
  {
    title: "개인정보 처리 위탁 및 저장",
    paragraphs: [
      "인증과 데이터 저장을 위해 Supabase를 사용하며, 웹 서비스 배포를 위해 Vercel을 사용합니다.",
      "실제 서비스 전환 시 각 서비스의 데이터 처리 위치와 위탁 내용을 최종 방침에 구체적으로 고지합니다.",
    ],
  },
  {
    title: "사용자의 권리",
    items: [
      "자신의 개인정보 열람 및 수정 요청",
      "교통일지와 게시글 등 직접 작성한 데이터 삭제",
      "회원탈퇴 및 개인정보 처리 정지 요청",
      "개인정보 처리에 대한 문의와 이의 제기",
    ],
  },
  {
    title: "개인정보 보호 문의",
    paragraphs: [
      "현재 서비스는 화성시 AI 공모전 출품을 위한 프로토타입입니다. 실제 운영 전 개인정보 보호 담당자와 문의 수단을 별도로 고지합니다.",
    ],
  },
];

export default async function PrivacyPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <PolicyPage
        title="개인정보처리방침"
        description="화성 교통일지는 사용자의 개인정보와 위치정보를 안전하게 처리하기 위해 다음과 같은 원칙을 따릅니다."
        updatedAt="2026년 7월 23일"
        sections={privacySections}
      />
    </AppShell>
  );
}