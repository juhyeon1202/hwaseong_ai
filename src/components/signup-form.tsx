"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui";
import {
  HWASEONG_DISTRICTS,
  isHwaseongDistrict,
} from "@/lib/hwaseong-districts";
import { createClient } from "@/lib/supabase/client";

type Gender = "male" | "female";
type Language = "ko" | "en" | "zh";

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
  const [nickname, setNickname] =
    useState("");

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [usernameStatus, setUsernameStatus] =
    useState<"idle" | "checking" | "available" | "unavailable">("idle");

  const [email, setEmail] =
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

  const [
    referralCodeStatus,
    setReferralCodeStatus,
  ] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const normalizedEmail =
    email.trim().toLowerCase();

  useEffect(() => {
    setNickname(createRandomNickname());
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

  function validateEmail() {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      showError(
        "올바른 이메일 주소를 입력해 주세요.",
      );

      return false;
    }

    return true;
  }

  function validateProfile() {
    if (nickname.trim().length < 2) {
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

    if (usernameStatus !== "available") {
      showError("아이디 중복 확인을 완료해 주세요.");
      return false;
    }

    if (!validateEmail()) {
      return false;
    }

    if (password.length < 8) {
      showError(
        "비밀번호는 8자 이상 입력해 주세요.",
      );
      return false;
    }

    if (
      password !== passwordConfirm
    ) {
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
      !isHwaseongDistrict(
        homeDistrict,
      )
    ) {
      showError(
        "거주지역을 선택해 주세요.",
      );
      return false;
    }

    if (
      referralCode.trim() &&
      referralCodeStatus !== "valid"
    ) {
      showError(
        "추천인 코드를 다시 확인해 주세요.",
      );
      return false;
    }

    return true;
  }

  async function checkReferralCode() {
    const code = referralCode
      .trim()
      .toUpperCase();

    if (!code) {
      setReferralCodeStatus("idle");
      return;
    }

    setReferralCodeStatus("checking");

    const supabase = createClient();

    const { data, error } =
      await supabase.rpc(
        "referral_code_exists",
        {
          p_code: code,
        },
      );

    setReferralCodeStatus(
      !error && data
        ? "valid"
        : "invalid",
    );
  }

  async function checkUsername() {
    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(normalizedUsername)) {
      setUsernameStatus("unavailable");
      showError("아이디는 영문, 숫자, 밑줄을 사용해 4~20자로 입력해 주세요.");
      return;
    }

    setMessage("");
    setUsernameStatus("checking");

    try {
      const response = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(normalizedUsername)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as {
        available?: boolean;
        message?: string;
      };

      setUsernameStatus(result.available ? "available" : "unavailable");

      if (!result.available) {
        showError(result.message ?? "이미 사용 중인 아이디입니다.");
      }
    } catch {
      setUsernameStatus("unavailable");
      showError("아이디 중복 여부를 확인하지 못했습니다.");
    }
  }

  async function completeSignup(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    if (!validateProfile()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: normalizedEmail,
          password,
          birthDate,
          gender,
          homeDistrict,
          language,
          referralCode: referralCode.trim().toUpperCase(),
        }),
      });
      const result = (await response.json()) as {
        authEmail?: string;
        error?: string;
      };

      if (!response.ok || !result.authEmail) {
        throw new Error(result.error ?? "회원가입을 완료하지 못했습니다.");
      }

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: result.authEmail,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      window.location.replace("/");
      return;

      showSuccess(
        "가입 확인 링크를 이메일로 보냈습니다. 메일의 링크를 누르면 회원가입이 완료됩니다.",
      );
    } catch (error) {
      showError(
        getSignupErrorMessage(
          error instanceof Error
            ? error.message
            : "가입 확인 메일을 보내지 못했습니다.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendConfirmation() {
    if (!validateEmail()) {
      return;
    }

    setMessage("");
    setIsResending(true);

    try {
      const supabase = createClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin,
      );

      callbackUrl.searchParams.set(
        "next",
        "/",
      );

      const { error } =
        await supabase.auth.resend({
          type: "signup",
          email: normalizedEmail,
          options: {
            emailRedirectTo:
              callbackUrl.toString(),
          },
        });

      if (error) {
        throw error;
      }

      showSuccess(
        "가입 확인 링크를 다시 보냈습니다.",
      );
    } catch (error) {
      showError(
        getSignupErrorMessage(
          error instanceof Error
            ? error.message
            : "가입 확인 메일을 다시 보내지 못했습니다.",
        ),
      );
    } finally {
      setIsResending(false);
    }
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
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#ffe4ca] text-sm font-extrabold text-brand-text">
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
              className="min-h-11 shrink-0 rounded-control border border-line bg-white px-4 text-sm font-bold text-secondary hover:border-brand hover:text-brand"
            >
              다시 생성
            </button>
          </div>
        </section>

        <SignupField label="이름">
          <input
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
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
            onChange={(event) => {
              setUsername(
                event.target.value,
              );
              setUsernameStatus("idle");
              setMessage("");
            }}
            required
            minLength={4}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="아이디"
            className={inputClassName}
          />
          <button
            type="button"
            disabled={usernameStatus === "checking"}
            onClick={() => void checkUsername()}
            className="mt-2 min-h-11 w-full rounded-control border border-line bg-white px-4 text-sm font-bold text-secondary hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {usernameStatus === "checking" ? "확인 중..." : "아이디 중복 확인"}
          </button>
          {usernameStatus === "available" && (
            <p className="mt-2 text-xs text-success">사용할 수 있는 아이디입니다.</p>
          )}
        </SignupField>

        <SignupField
          label="이메일"
          description="비밀번호 찾기에서 가입 정보를 확인하는 용도로만 저장됩니다. 인증 메일은 발송하지 않습니다."
        >
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value,
              );

              setConfirmationSent(false);
              setMessage("");
            }}
            required
            autoComplete="email"
            placeholder="example@email.com"
            className={inputClassName}
          />
        </SignupField>

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
            placeholder="8자 이상 비밀번호"
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

          <SignupField label="성별">
            <div className="grid min-h-14 grid-cols-2 gap-2">
              <ChoiceButton
                selected={
                  gender === "male"
                }
                onClick={() =>
                  setGender("male")
                }
              >
                남
              </ChoiceButton>

              <ChoiceButton
                selected={
                  gender === "female"
                }
                onClick={() =>
                  setGender("female")
                }
              >
                여
              </ChoiceButton>
            </div>
          </SignupField>
        </div>

        <SignupField label="거주 지역">
          <select
            value={homeDistrict}
            onChange={(event) =>
              setHomeDistrict(
                event.target.value,
              )
            }
            required
            className={inputClassName}
          >
            <option value="">
              읍·면·동 선택
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
        </SignupField>

        <SignupField label="사용 언어">
          <div className="grid grid-cols-3 gap-2">
            <ChoiceButton
              selected={
                language === "ko"
              }
              onClick={() =>
                setLanguage("ko")
              }
            >
              한국어
            </ChoiceButton>

            <ChoiceButton
              selected={
                language === "en"
              }
              onClick={() =>
                setLanguage("en")
              }
            >
              EN
            </ChoiceButton>

            <ChoiceButton
              selected={
                language === "zh"
              }
              onClick={() =>
                setLanguage("zh")
              }
            >
              中
            </ChoiceButton>
          </div>
        </SignupField>

        <SignupField
          label="추천인 코드"
          optional
        >
          <input
            value={referralCode}
            onChange={(event) => {
              setReferralCode(
                event.target.value
                  .toUpperCase()
                  .replace(
                    /[^A-Z0-9-]/g,
                    "",
                  ),
              );

              setReferralCodeStatus(
                "idle",
              );
            }}
            onBlur={() =>
              void checkReferralCode()
            }
            maxLength={20}
            placeholder="예: HWS-2K9F"
            className={inputClassName}
          />

          {referralCodeStatus ===
            "checking" && (
            <p className="mt-2 text-xs text-muted">
              코드 확인 중...
            </p>
          )}

          {referralCodeStatus ===
            "valid" && (
            <p className="mt-2 text-xs text-success">
              사용할 수 있는 추천인 코드입니다.
            </p>
          )}

          {referralCodeStatus ===
            "invalid" && (
            <p className="mt-2 text-xs text-danger">
              유효하지 않은 추천인 코드입니다.
            </p>
          )}
        </SignupField>

        {message && (
          <p
            role={
              isError
                ? "alert"
                : "status"
            }
            className={[
              "rounded-control p-3 text-sm leading-6",
              isError
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success",
            ].join(" ")}
          >
            {message}
          </p>
        )}

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "회원가입 처리 중..." : "회원가입"}
        </Button>

        <div className="hidden">
        {!confirmationSent ? (
          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "가입 메일 발송 중..."
              : "가입 확인 링크 받기"}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              fullWidth
              disabled={isResending}
              onClick={() =>
                void resendConfirmation()
              }
            >
              {isResending
                ? "재전송 중..."
                : "가입 확인 링크 재전송"}
            </Button>

            <p className="text-center text-xs leading-5 text-muted">
              이메일의 가입 확인 링크를
              누르면 별도의 정보 재입력 없이
              가입이 완료됩니다.
            </p>
          </div>
        )}
        </div>
      </form>
    </section>
  );
}

type SignupFieldProps = {
  label: string;
  description?: string;
  optional?: boolean;
  children: ReactNode;
};

function SignupField({
  label,
  description,
  optional = false,
  children,
}: SignupFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-main">
        {label}

        {optional && (
          <span className="text-xs font-normal text-muted">
            선택
          </span>
        )}
      </span>

      {children}

      {description && (
        <span className="mt-2 block text-xs leading-5 text-muted">
          {description}
        </span>
      )}
    </label>
  );
}

type ChoiceButtonProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ChoiceButton({
  selected,
  onClick,
  children,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "flex min-h-14 items-center justify-center rounded-control border px-3 text-sm font-bold transition",
        selected
          ? "border-main bg-main text-white"
          : "border-line bg-white text-secondary hover:border-main",
      ].join(" ")}
    >
      {children}
    </button>
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
    return "이미 가입된 이메일입니다.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("429")
  ) {
    return "가입 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    message.includes(
      "Password should be",
    )
  ) {
    return "비밀번호는 8자 이상 입력해 주세요.";
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
