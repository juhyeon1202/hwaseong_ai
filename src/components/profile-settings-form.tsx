"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/(protected)/mypage/actions";

import {
  HWASEONG_DISTRICTS,
} from "@/lib/hwaseong-districts";

import {
  Button,
  Card,
  SectionHeader,
} from "@/components/ui";

type ProfileSettingsFormProps = {
  currentNickname: string;
  currentHomeDistrict:
    | string
    | null;
};

const initialState: ProfileActionState = {
  status: "idle",
  message: "",
};

export function ProfileSettingsForm({
  currentNickname,
  currentHomeDistrict,
}: ProfileSettingsFormProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    nickname,
    setNickname,
  ] = useState(currentNickname);

  const [
    homeDistrict,
    setHomeDistrict,
  ] = useState(
    currentHomeDistrict ?? "",
  );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    updateProfile,
    initialState,
  );

  useEffect(() => {
    if (
      state.status === "success"
    ) {
      setIsOpen(false);
    }
  }, [state.status]);

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionHeader
            title="회원정보 관리"
            description="닉네임과 거주지역을 변경할 수 있습니다."
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setIsOpen(
              (current) => !current,
            )
          }
          aria-expanded={isOpen}
        >
          {isOpen
            ? "수정 취소"
            : "회원정보 수정"}
        </Button>
      </div>

      {!isOpen && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ProfileValue
            label="닉네임"
            value={currentNickname}
          />

          <ProfileValue
            label="거주지역"
            value={
              currentHomeDistrict ??
              "미설정"
            }
          />
        </div>
      )}

      {isOpen && (
        <form
          action={formAction}
          className="mt-6 space-y-5 border-t border-line-light pt-6"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-main">
              닉네임
            </span>

            <input
              name="nickname"
              value={nickname}
              onChange={(event) =>
                setNickname(
                  event.target.value,
                )
              }
              required
              minLength={2}
              maxLength={30}
              autoComplete="nickname"
              className={inputClassName}
            />

            <span className="mt-1.5 block text-xs text-muted">
              2자 이상 30자 이하로 입력해
              주세요.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-main">
              거주지역
            </span>

            <select
              name="homeDistrict"
              value={homeDistrict}
              onChange={(event) =>
                setHomeDistrict(
                  event.target.value,
                )
              }
              required
              className={inputClassName}
            >
              <option
                value=""
                disabled
              >
                거주지역 선택
              </option>

              {HWASEONG_DISTRICTS.map(
                (district) => (
                  <option
                    key={district}
                    value={district}
                  >
                    {district}
                  </option>
                ),
              )}
            </select>

            <span className="mt-1.5 block text-xs leading-5 text-muted">
              거주지역은 동네 참여율과
              실시간 순위에 사용됩니다.
            </span>
          </label>

          {state.message && (
            <p
              role={
                state.status ===
                "error"
                  ? "alert"
                  : "status"
              }
              className={[
                "rounded-control p-3 text-sm",
                state.status ===
                "success"
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger",
              ].join(" ")}
            >
              {state.message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNickname(
                  currentNickname,
                );

                setHomeDistrict(
                  currentHomeDistrict ??
                    "",
                );

                setIsOpen(false);
              }}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              취소
            </Button>

            <Button
              type="submit"
              disabled={
                isPending ||
                nickname.trim().length <
                  2 ||
                !homeDistrict
              }
              className="w-full sm:w-auto"
            >
              {isPending
                ? "저장 중..."
                : "변경 내용 저장"}
            </Button>
          </div>
        </form>
      )}

      {!isOpen &&
        state.message && (
          <p
            role="status"
            className={[
              "mt-4 rounded-control p-3 text-sm",
              state.status ===
              "success"
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            ].join(" ")}
          >
            {state.message}
          </p>
        )}
    </Card>
  );
}

function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control bg-surface-muted p-4">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-main">
        {value}
      </p>
    </div>
  );
}

const inputClassName = [
  "min-h-12 w-full rounded-control",
  "border border-line bg-surface",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
].join(" ");