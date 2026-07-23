"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  HWASEONG_DISTRICTS,
  isHwaseongDistrict,
} from "@/lib/hwaseong-districts";

import { createClient } from "@/lib/supabase/client";

type Gender =
  | "male"
  | "female";

type Language =
  | "ko"
  | "en"
  | "zh";

const nicknameAdjectives = [
  "느긋한",
  "활기찬",
  "친절한",
  "씩씩한",
  "부지런한",
  "다정한",
  "용감한",
  "즐거운",
  "산뜻한",
  "따뜻한",
  "행복한",
  "똑똑한",
];

const nicknameNouns = [
  "동탄여우",
  "병점수달",
  "봉담토끼",
  "화성곰",
  "향남고양이",
  "남양펭귄",
  "진안다람쥐",
  "새솔참새",
  "송산두루미",
  "반월너구리",
  "마도강아지",
  "정남사슴",
];

export function SignupForm() {
  const router = useRouter();

  const [nickname, setNickname] =
    useState("화성시민");

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState("");

  const [birthDate, setBirthDate] =
    useState("");

  const [gender, setGender] =
    useState<Gender>("male");

  const [
    homeDistrict,
    setHomeDistrict,
  ] = useState("");

  const [language, setLanguage] =
    useState<Language>("ko");

  const [
    referralCode,
    setReferralCode,
  ] = useState("");

  const [isOtpSent, setIsOtpSent] =
    useState(false);

  const [
    isPhoneVerified,
    setIsPhoneVerified,
  ] = useState(false);

  const [isSendingOtp, setIsSendingOtp] =
    useState(false);

  const [
    isVerifyingOtp,
    setIsVerifyingOtp,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const normalizedPhone =
    normalizeKoreanPhone(phone);

  useEffect(() => {
    setNickname(
      createRandomNickname(),
    );
  }, []);

  function regenerateNickname() {
    let nextNickname =
      createRandomNickname();

    while (
      nextNickname === nickname
    ) {
      nextNickname =
        createRandomNickname();
    }

    setNickname(nextNickname);
  }

  function showError(value: string) {
    setIsError(true);
    setMessage(value);
  }

  function showSuccess(value: string) {
    setIsError(false);
    setMessage(value);
  }

  function validateProfile() {
    if (nickname.length < 2) {
      showError(
        "닉네임을 생성해 주세요.",
      );
      return false;
    }

    if (name.trim().length < 2) {
      showError(
        "이름을 입력해 주세요.",
      );
      return false;
    }

    if (
      !/^[a-zA-Z0-9_]{4,20}$/.test(
        username,
      )
    ) {
      showError(
        "아이디는 영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요.",
      );
      return false;
    }

    if (!normalizedPhone) {
      showError(
        "올바른 휴대전화 번호를 입력해 주세요.",
      );
      return false;
    }

    if (password.length < 8) {
      showError(
        "비밀번호는 8자 이상 입력해 주세요.",
      );
      return false;
    }

    if (password !== passwordConfirm) {
      showError(
        "비밀번호가 서로 일치하지 않습니다.",
      );
      return false;
    }

    if (!birthDate) {
      showError(
        "생년월일을 입력해 주세요.",
      );
      return false;
    }

    if (
      !isHwaseongDistrict(homeDistrict)
    ) {
      showError(
        "거주지역을 선택해 주세요.",
      );
      return false;
    }

    return true;
  }

  async function sendOtp() {
    setMessage("");

    if (!validateProfile()) {
      return;
    }

    setIsSendingOtp(true);

    try {
      const supabase = createClient();

      const { data, error } =
        await supabase.auth.signUp({
          phone: normalizedPhone,
          password,
          options: {
            data: {
              nickname,
              name: name.trim(),
              username:
                username
                  .trim()
                  .toLowerCase(),
              phone:
                normalizedPhone,
              birth_date:
                birthDate,
              gender,
              home_district:
                homeDistrict,
              preferred_language:
                language,
              referral_code:
                referralCode
                  .trim()
                  .toUpperCase() ||
                null,
            },
          },
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        setIsOtpSent(true);
        setIsPhoneVerified(true);

        showSuccess(
          "전화번호 인증이 완료되었습니다.",
        );
        return;
      }

      setIsOtpSent(true);

      showSuccess(
        "인증번호를 전송했습니다. 문자로 받은 번호를 입력해 주세요.",
      );
    } catch (error) {
      showError(
        getSignupErrorMessage(
          error instanceof Error
            ? error.message
            : "인증번호를 전송하지 못했습니다.",
        ),
      );
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyOtp() {
    setMessage("");

    if (!normalizedPhone) {
      showError(
        "휴대전화 번호를 확인해 주세요.",
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showError(
        "문자로 받은 6자리 인증번호를 입력해 주세요.",
      );
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token: otp,
          type: "sms",
        });

      if (error) {
        throw error;
      }

      setIsPhoneVerified(true);

      showSuccess(
        "휴대전화 인증이 완료되었습니다.",
      );
    } catch (error) {
      showError(
        getSignupErrorMessage(
          error instanceof Error
            ? error.message
            : "인증번호를 확인하지 못했습니다.",
        ),
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  function completeSignup(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateProfile()) {
      return;
    }

    if (!isPhoneVerified) {
      showError(
        "휴대전화 인증을 완료해 주세요.",
      );
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <section className="w-full max-w-lg overflow-visible rounded-card border border-line bg-white shadow-card">
      <header className="flex min-h-[64px] items-center border-b border-line-light px-6">
        <span
          aria-hidden="true"
          className="mr-3 size-4 rounded-full bg-line"
        />

        <h1 className="text-xl font-bold text-main">
          정보 입력
        </h1>
      </header>

      <form
        onSubmit={completeSignup}
        className="space-y-5 p-6 sm:p-8"
      >
        <p className="text-sm font-medium text-muted">
          2 / 3 단계
        </p>

        <section
          aria-label="랜덤 닉네임"
          className="rounded-card border border-brand-line bg-brand-softer p-4"
        >
          <div className="flex items-center gap-4">
            <span
              className={[
                "flex size-16 shrink-0",
                "items-center justify-center",
                "rounded-full bg-[#ffe4ca]",
                "text-sm font-extrabold",
                "text-brand-text",
              ].join(" ")}
            >
              {getNicknameAvatar(
                nickname,
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                랜덤 닉네임
              </p>

              <p className="mt-1 break-words text-lg font-extrabold leading-6 text-main">
                {nickname}
              </p>
            </div>

            <button
              type="button"
              onClick={
                regenerateNickname
              }
              className={[
                "min-h-11 shrink-0",
                "rounded-control border",
                "border-line bg-white",
                "px-4 text-sm font-bold",
                "text-secondary",
                "hover:border-brand",
                "hover:text-brand",
              ].join(" ")}
            >
              다시 생성
            </button>
          </div>
        </section>

        <SignupField label="이름">
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
            maxLength={50}
            autoComplete="name"
            placeholder="이름"
            className={inputClassName}
          />
        </SignupField>

        <SignupField
          label="아이디"
          description="영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요."
        >
          <input
            value={username}
            onChange={(event) =>
              setUsername(
                event.target.value.replace(
                  /[^a-zA-Z0-9_]/g,
                  "",
                ),
              )
            }
            required
            minLength={4}
            maxLength={20}
            autoCapitalize="none"
            autoComplete="username"
            placeholder="아이디"
            className={inputClassName}
          />
        </SignupField>

        <SignupField label="전화번호">
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(
                  formatPhoneInput(
                    event.target.value,
                  ),
                );

                setIsOtpSent(false);
                setIsPhoneVerified(false);
                setOtp("");
              }}
              required
              autoComplete="tel"
              placeholder="010-0000-0000"
              className={inputClassName}
            />

            <button
              type="button"
              disabled={
                isSendingOtp ||
                isPhoneVerified
              }
              onClick={() =>
                void sendOtp()
              }
              className={[
                "min-h-14 rounded-control",
                "border border-line bg-white",
                "text-sm font-bold",
                "text-secondary",
                "hover:border-info",
                "hover:text-info",
                "disabled:cursor-not-allowed",
                "disabled:opacity-50",
              ].join(" ")}
            >
              {isPhoneVerified
                ? "인증 완료"
                : isSendingOtp
                  ? "전송 중"
                  : isOtpSent
                    ? "재전송"
                    : "인증"}
            </button>
          </div>
        </SignupField>

        {isOtpSent &&
          !isPhoneVerified && (
            <SignupField label="OTP 인증번호">
              <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="6자리 인증번호"
                  className={inputClassName}
                />

                <button
                  type="button"
                  disabled={
                    isVerifyingOtp
                  }
                  onClick={() =>
                    void verifyOtp()
                  }
                  className="min-h-14 rounded-control bg-info px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isVerifyingOtp
                    ? "확인 중"
                    : "확인"}
                </button>
              </div>
            </SignupField>
          )}

        <SignupField label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="비밀번호"
            className={inputClassName}
          />
        </SignupField>

        <SignupField label="비밀번호 확인">
          <input
            type="password"
            value={passwordConfirm}
            onChange={(event) =>
              setPasswordConfirm(
                event.target.value,
              )
            }
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            className={inputClassName}
          />
        </SignupField>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <SignupField label="생년월일">
            <input
              type="date"
              value={birthDate}
              onChange={(event) =>
                setBirthDate(
                  event.target.value,
                )
              }
              required
              max={getToday()}
              className={inputClassName}
            />
          </SignupField>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted">
              성별
            </legend>

            <div
              className={[
                "grid grid-cols-2 gap-2",
                "[&>label]:block",
                "[&>label]:w-full",
                "[&>label>span]:min-h-14",
                "[&>label>span]:w-full",
              ].join(" ")}
            >
              <ChoiceButton
                name="gender"
                value="male"
                label="남"
                checked={
                  gender === "male"
                }
                onChange={() =>
                  setGender("male")
                }
              />

              <ChoiceButton
                name="gender"
                value="female"
                label="여"
                checked={
                  gender === "female"
                }
                onChange={() =>
                  setGender("female")
                }
              />
            </div>
          </fieldset>
        </div>

        <p className="-mt-2 text-xs leading-5 text-muted">
          생년월일과 성별은 통계용이며 다른
          사용자에게 공개되지 않습니다.
        </p>

        <SignupField label="거주지역">
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex min-h-12 w-[90px] items-center rounded-control border border-line bg-surface-muted px-3 text-sm font-semibold text-secondary">
              화성시
            </div>

            <DistrictDropdown
              value={homeDistrict}
              onChange={
                setHomeDistrict
              }
            />
          </div>
        </SignupField>

        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="mr-3 text-sm font-medium text-muted">
            사용 언어
          </legend>

          <ChoiceButton
            name="language"
            value="ko"
            label="한국어"
            checked={language === "ko"}
            onChange={() =>
              setLanguage("ko")
            }
          />

          <ChoiceButton
            name="language"
            value="en"
            label="EN"
            checked={language === "en"}
            onChange={() =>
              setLanguage("en")
            }
          />

          <ChoiceButton
            name="language"
            value="zh"
            label="中"
            checked={language === "zh"}
            onChange={() =>
              setLanguage("zh")
            }
          />
        </fieldset>

        <SignupField
          label="추천인 코드"
          optional
          description="유효한 추천인 코드는 가입 완료 후 포인트 지급에 사용됩니다."
        >
          <input
            value={referralCode}
            onChange={(event) =>
              setReferralCode(
                event.target.value
                  .toUpperCase()
                  .replace(
                    /[^A-Z0-9-]/g,
                    "",
                  )
                  .slice(0, 20),
              )
            }
            placeholder="예: HWS-2K9F"
            className={inputClassName}
          />
        </SignupField>

        {message && (
          <p
            role={
              isError
                ? "alert"
                : "status"
            }
            className={[
              "rounded-control px-4 py-3",
              "text-sm leading-6",
              isError
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success",
            ].join(" ")}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!isPhoneVerified}
          className={[
            "flex min-h-14 w-full",
            "items-center justify-center",
            "rounded-control bg-brand",
            "px-5 text-base font-bold",
            "text-white",
            "hover:bg-brand-hover",
            "disabled:cursor-not-allowed",
            "disabled:opacity-50",
          ].join(" ")}
        >
          가입 완료
        </button>

        <p className="text-center text-sm text-muted">
          이미 회원이신가요?{" "}
          <Link
            href="/auth?mode=login"
            className="font-semibold text-brand-text"
          >
            로그인
          </Link>
        </p>
      </form>
    </section>
  );
}

function DistrictDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] =
    useState(false);

  return (
    <div className="relative z-30 w-[180px]">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() =>
          setIsOpen((current) => !current)
        }
        className={[
          "flex min-h-12 w-full items-center",
          "justify-between gap-2",
          "rounded-control border border-line",
          "bg-white px-3 text-left",
          "text-sm outline-none",
          isOpen
            ? "border-brand ring-2 ring-brand-soft"
            : "",
        ].join(" ")}
      >
        <span
          className={
            value
              ? "truncate text-main"
              : "truncate text-muted"
          }
        >
          {value || "읍·면·동 선택"}
        </span>

        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={[
            "size-4 shrink-0 text-muted",
            "transition-transform",
            isOpen
              ? "rotate-180"
              : "",
          ].join(" ")}
        >
          <path
            d="m5 7.5 5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={[
            "absolute left-0 top-[calc(100%+6px)]",
            "z-50 w-full",
            "max-h-56 overflow-y-auto",
            "rounded-control border border-line",
            "bg-white p-1 shadow-floating",
          ].join(" ")}
        >
          {HWASEONG_DISTRICTS.map(
            (district) => (
              <button
                key={district}
                type="button"
                role="option"
                aria-selected={
                  value === district
                }
                onClick={() => {
                  onChange(district);
                  setIsOpen(false);
                }}
                className={[
                  "flex min-h-10 w-full",
                  "items-center rounded-lg",
                  "px-3 text-left text-sm",
                  value === district
                    ? "bg-brand-soft font-semibold text-brand-text"
                    : "text-secondary hover:bg-surface-muted",
                ].join(" ")}
              >
                {district}
              </button>
            ),
          )}
        </div>
      )}

      <input
        type="hidden"
        name="homeDistrict"
        value={value}
        required
      />
    </div>
  );
}

function SignupField({
  label,
  optional = false,
  description,
  children,
}: {
  label: string;
  optional?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
        {label}

        {optional && (
          <span className="text-xs">
            (선택)
          </span>
        )}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-xs leading-5 text-muted">
          {description}
        </span>
      )}
    </label>
  );
}

function ChoiceButton({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />

      <span
        className={[
          "inline-flex min-h-12 items-center",
          "justify-center rounded-control",
          "border border-line bg-white",
          "px-4 text-sm font-semibold",
          "text-secondary",
          "peer-checked:border-[#191f28]",
          "peer-checked:bg-[#191f28]",
          "peer-checked:text-white",
        ].join(" ")}
      >
        {label}
      </span>
    </label>
  );
}

function createRandomNickname() {
  const adjective =
    nicknameAdjectives[
      Math.floor(
        Math.random() *
          nicknameAdjectives.length,
      )
    ];

  const noun =
    nicknameNouns[
      Math.floor(
        Math.random() *
          nicknameNouns.length,
      )
    ];

  const number =
    Math.floor(
      10 + Math.random() * 90,
    );

  return `${adjective}${noun}${number}`;
}

function getNicknameAvatar(
  nickname: string,
) {
  const noun =
    nicknameNouns.find((value) =>
      nickname.includes(value),
    );

  if (!noun) {
    return "화성";
  }

  return noun.slice(-2);
}

function formatPhoneInput(
  value: string,
) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function normalizeKoreanPhone(
  value: string,
) {
  const digits =
    value.replace(/\D/g, "");

  if (
    !/^01[016789]\d{7,8}$/.test(
      digits,
    )
  ) {
    return "";
  }

  return `+82${digits.slice(1)}`;
}

function getToday() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getSignupErrorMessage(
  message: string,
) {
  if (
    message.includes(
      "User already registered",
    )
  ) {
    return "이미 가입된 전화번호입니다.";
  }

  if (
    message.includes(
      "Phone provider is not enabled",
    )
  ) {
    return "Supabase에서 전화번호 인증 기능이 활성화되지 않았습니다.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("rate_limit")
  ) {
    return "인증번호 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    message.includes(
      "Token has expired",
    )
  ) {
    return "인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.";
  }

  return message;
}

const inputClassName = [
  "min-h-14 w-full rounded-control",
  "border border-line bg-white",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-brand",
  "focus:ring-2 focus:ring-brand-soft",
].join(" ");