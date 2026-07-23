"use client";

import Link from "next/link";
import {
  type ReactNode,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPost,
  type PostActionState,
} from "@/app/community/actions";
import {
  createRouteRequest,
  type RouteRequestActionState,
} from "@/app/route-requests/actions";
import {
  RouteStopMap,
} from "@/components/route-stop-map";
import {
  Button,
} from "@/components/ui";

export type CommunityCategory =
  | "route_suggestion"
  | "information"
  | "question";

export type CommunityPostItem = {
  id: string;
  itemType: "post" | "route";
  category: CommunityCategory;
  title: string;
  content: string;
  authorNickname: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  voteCount: number;
  stopCount: number;
};

export type CommunityStopOption = {
  id: number;
  name: string;
  stopNumber: string | null;
  districtName: string | null;
};

type CommunityBoardProps = {
  items: CommunityPostItem[];
  stops: CommunityStopOption[];
  loggedIn: boolean;
};

const categoryOptions: {
  value: "" | CommunityCategory;
  label: string;
}[] = [
  {
    value: "",
    label: "전체",
  },
  {
    value: "route_suggestion",
    label: "노선 제안",
  },
  {
    value: "information",
    label: "교통 정보",
  },
  {
    value: "question",
    label: "질문",
  },
];

const categoryLabels: Record<
  CommunityCategory,
  string
> = {
  route_suggestion: "노선 제안",
  information: "교통 정보",
  question: "질문",
};

const ITEMS_PER_PAGE = 4;

export function CommunityBoard({
  items,
  stops,
  loggedIn,
}: CommunityBoardProps) {
  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState<
    "" | CommunityCategory
  >("");

  const [
    writeModalOpen,
    setWriteModalOpen,
  ] = useState(false);

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const filteredItems = useMemo(() => {
    if (!selectedFilter) {
      return items;
    }

    return items.filter(
      (item) =>
        item.category ===
        selectedFilter,
    );
  }, [items, selectedFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length /
        ITEMS_PER_PAGE,
    ),
  );

  const visibleItems = useMemo(() => {
    const startIndex =
      (currentPage - 1) *
      ITEMS_PER_PAGE;

    return filteredItems.slice(
      startIndex,
      startIndex +
        ITEMS_PER_PAGE,
    );
  }, [
    currentPage,
    filteredItems,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter]);

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  function openWriteModal() {
    if (!loggedIn) {
      window.location.href =
        "/auth?mode=login";
      return;
    }

    setWriteModalOpen(true);
  }

  function changePage(
    nextPage: number,
  ) {
    if (
      nextPage < 1 ||
      nextPage > totalPages
    ) {
      return;
    }

    setCurrentPage(nextPage);
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-1 py-5 md:px-3 md:py-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.04em] text-main md:text-[34px]">
              시민 게시판
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted md:text-base">
              화성시 교통 정보와 의견을
              함께 나눠요.
            </p>
          </div>

          <button
            type="button"
            onClick={openWriteModal}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-[10px] bg-[#d87525] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#c96b1e] active:scale-[0.98]"
          >
            <WriteIcon />
            글 작성하기
          </button>
        </header>

        <nav
          aria-label="게시글 분류"
          className="mt-8 flex gap-3 overflow-x-auto pb-2"
        >
          {categoryOptions.map(
            (category) => {
              const selected =
                selectedFilter ===
                category.value;

              return (
                <button
                  key={
                    category.value ||
                    "all"
                  }
                  type="button"
                  onClick={() =>
                    setSelectedFilter(
                      category.value,
                    )
                  }
                  className={[
                    "min-h-12 shrink-0 rounded-[10px] border px-5 text-sm font-bold transition",
                    selected
                      ? "border-[#5470e8] bg-[#5470e8] text-white shadow-sm"
                      : "border-[#d9dde5] bg-white text-[#596273] hover:border-[#5470e8] hover:text-[#5470e8]",
                  ].join(" ")}
                >
                  {category.label}
                </button>
              );
            },
          )}
        </nav>

        {filteredItems.length ===
        0 ? (
          <div className="mt-6 rounded-[14px] border border-dashed border-[#d9dde5] bg-white px-5 py-20 text-center">
            <p className="font-bold text-main">
              등록된 게시글이
              없습니다.
            </p>

            <p className="mt-2 text-sm text-muted">
              첫 번째 교통 이야기를
              작성해 보세요.
            </p>
          </div>
        ) : (
          <>
            <ol className="mt-6 space-y-4">
              {visibleItems.map(
                (item) => (
                  <CommunityPostCard
                    key={`${item.itemType}-${item.id}`}
                    item={item}
                  />
                ),
              )}
            </ol>

            {totalPages > 1 && (
              <nav
                aria-label="게시글 페이지"
                className="mt-9 flex items-center justify-center gap-2"
              >
                <PaginationButton
                  label="이전 페이지"
                  disabled={
                    currentPage === 1
                  }
                  onClick={() =>
                    changePage(
                      currentPage - 1,
                    )
                  }
                >
                  ‹
                </PaginationButton>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, index) =>
                    index + 1,
                ).map((page) => (
                  <PaginationButton
                    key={page}
                    label={`${page}페이지`}
                    selected={
                      currentPage ===
                      page
                    }
                    onClick={() =>
                      changePage(page)
                    }
                  >
                    {page}
                  </PaginationButton>
                ))}

                <PaginationButton
                  label="다음 페이지"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    changePage(
                      currentPage + 1,
                    )
                  }
                >
                  ›
                </PaginationButton>
              </nav>
            )}
          </>
        )}
      </section>

      {writeModalOpen && (
        <CommunityWriteModal
          stops={stops}
          onClose={() =>
            setWriteModalOpen(false)
          }
        />
      )}
    </>
  );
}

function CommunityPostCard({
  item,
}: {
  item: CommunityPostItem;
}) {
  const href =
    item.itemType === "route"
      ? `/route-requests/${item.id}`
      : `/community/${item.id}`;

  const primaryCount =
    item.itemType === "route"
      ? item.voteCount
      : item.viewCount;

  const secondaryCount =
    item.itemType === "route"
      ? item.stopCount
      : item.commentCount;

  return (
    <li>
      <Link
        href={href}
        className="block rounded-[14px] border border-[#dfe2e8] bg-white px-5 py-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#c8cede] hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)] active:scale-[0.995] md:px-7"
      >
        <CategoryBadge
          category={item.category}
        />

        <h2 className="mt-4 line-clamp-1 text-[18px] font-bold tracking-[-0.02em] text-main md:text-[20px]">
          {item.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-y-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted md:text-sm">
            <span className="max-w-32 truncate font-medium">
              {item.authorNickname}
            </span>

            <span
              aria-hidden="true"
              className="text-[#c4c8d0]"
            >
              ·
            </span>

            <time>
              {formatDate(
                item.createdAt,
              )}
            </time>
          </div>

          <div className="ml-auto flex items-center gap-6 text-sm text-[#6f7786]">
            <span className="inline-flex items-center gap-2">
              <ViewIcon />

              {primaryCount.toLocaleString(
                "ko-KR",
              )}
            </span>

            <span className="inline-flex items-center gap-2">
              {item.itemType ===
              "route" ? (
                <StopIcon />
              ) : (
                <CommentIcon />
              )}

              {secondaryCount.toLocaleString(
                "ko-KR",
              )}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function CategoryBadge({
  category,
}: {
  category: CommunityCategory;
}) {
  const className =
    category ===
    "route_suggestion"
      ? "bg-[#fff1e5] text-[#d66d1d]"
      : category ===
          "information"
        ? "bg-[#edf2ff] text-[#4d68d7]"
        : "bg-[#edf8f1] text-[#378a55]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {categoryLabels[category]}
    </span>
  );
}

type PaginationButtonProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function PaginationButton({
  label,
  selected = false,
  disabled = false,
  onClick,
  children,
}: PaginationButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={
        selected
          ? "page"
          : undefined
      }
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex size-10 items-center justify-center rounded-[8px] border text-sm font-bold transition",
        selected
          ? "border-[#5470e8] bg-[#5470e8] text-white shadow-sm"
          : "border-[#d9dde5] bg-white text-[#596273] hover:border-[#5470e8] hover:text-[#5470e8]",
        disabled
          ? "cursor-not-allowed opacity-35"
          : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

type CommunityWriteModalProps = {
  stops: CommunityStopOption[];
  onClose: () => void;
};

function CommunityWriteModal({
  stops,
  onClose,
}: CommunityWriteModalProps) {
  const [
    category,
    setCategory,
  ] =
    useState<CommunityCategory>(
      "information",
    );

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-write-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={[
          "max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[22px] bg-white shadow-2xl",
          category ===
          "route_suggestion"
            ? "max-w-4xl"
            : "max-w-xl",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line-light bg-white px-5 py-4 md:px-7">
          <h2
            id="community-write-title"
            className="text-xl font-bold text-main"
          >
            게시글 작성
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="작성 창 닫기"
            className="flex size-10 items-center justify-center rounded-full text-2xl text-secondary transition hover:bg-surface-muted"
          >
            ×
          </button>
        </header>

        <div className="p-5 md:p-7">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                "route_suggestion",
                "information",
                "question",
              ] as CommunityCategory[]
            ).map((value) => {
              const selected =
                category === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setCategory(value)
                  }
                  className={[
                    "min-h-11 rounded-control border px-2 text-sm font-bold transition",
                    selected
                      ? "border-[#5470e8] bg-[#5470e8] text-white"
                      : "border-line bg-white text-secondary hover:border-[#5470e8]",
                  ].join(" ")}
                >
                  {
                    categoryLabels[
                      value
                    ]
                  }
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {category ===
            "route_suggestion" ? (
              <RouteProposalComposer
                key="route_suggestion"
                stops={stops}
                onSuccess={onClose}
              />
            ) : (
              <GeneralPostComposer
                key={category}
                category={category}
                onSuccess={onClose}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type GeneralPostComposerProps = {
  category:
    | "information"
    | "question";
  onSuccess: () => void;
};

const initialPostState: PostActionState =
  {
    status: "idle",
    message: "",
  };

function GeneralPostComposer({
  category,
  onSuccess,
}: GeneralPostComposerProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createPost,
    initialPostState,
  );

  useEffect(() => {
    if (
      state.status !== "success"
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        onSuccess,
        650,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [
    state.status,
    onSuccess,
  ]);

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="category"
        value={category}
      />

      <input
        type="hidden"
        name="busType"
        value=""
      />

      <Field label="제목">
        <input
          name="title"
          required
          minLength={2}
          maxLength={100}
          placeholder={
            category === "question"
              ? "궁금한 교통 정보를 질문해 주세요."
              : "공유할 교통 정보의 제목을 입력해 주세요."
          }
          className={inputClassName}
        />
      </Field>

      <Field label="내용">
        <textarea
          name="content"
          required
          minLength={5}
          maxLength={5000}
          rows={8}
          placeholder={
            category === "question"
              ? "질문 내용을 자세히 작성해 주세요."
              : "교통 정보나 의견을 자세히 작성해 주세요."
          }
          className={`${inputClassName} resize-none py-4`}
        />
      </Field>

      <ActionMessage
        status={state.status}
        message={state.message}
      />

      <Button
        type="submit"
        fullWidth
        disabled={isPending}
      >
        {isPending
          ? "등록 중..."
          : "게시글 등록"}
      </Button>
    </form>
  );
}

type RouteProposalComposerProps = {
  stops: CommunityStopOption[];
  onSuccess: () => void;
};

const initialRouteState: RouteRequestActionState =
  {
    status: "idle",
    message: "",
  };

function RouteProposalComposer({
  stops,
  onSuccess,
}: RouteProposalComposerProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createRouteRequest,
    initialRouteState,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedStops,
    setSelectedStops,
  ] = useState<
    CommunityStopOption[]
  >([]);

  const searchRef =
    useRef<HTMLInputElement>(null);

  const filteredStops = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (keyword.length < 2) {
      return [];
    }

    return stops
      .filter((stop) => {
        const searchText = [
          stop.name,
          stop.stopNumber ?? "",
          stop.districtName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(
          keyword,
        );
      })
      .filter(
        (stop) =>
          !selectedStops.some(
            (selected) =>
              selected.id ===
              stop.id,
          ),
      )
      .slice(0, 8);
  }, [
    search,
    selectedStops,
    stops,
  ]);

  useEffect(() => {
    if (
      state.status !== "success"
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        onSuccess,
        650,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [
    state.status,
    onSuccess,
  ]);

  function addStop(
    stop: CommunityStopOption,
  ) {
    if (
      selectedStops.length >= 5
    ) {
      return;
    }

    setSelectedStops(
      (current) => [
        ...current,
        stop,
      ],
    );

    setSearch("");

    window.setTimeout(() => {
      searchRef.current?.focus();
    }, 0);
  }

  function removeStop(
    stopId: number,
  ) {
    setSelectedStops((current) =>
      current.filter(
        (stop) =>
          stop.id !== stopId,
      ),
    );
  }

  function moveStop(
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        selectedStops.length
    ) {
      return;
    }

    setSelectedStops(
      (current) => {
        const next = [...current];

        [
          next[index],
          next[targetIndex],
        ] = [
          next[targetIndex],
          next[index],
        ];

        return next;
      },
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-5">
          <Field label="노선 제목">
            <input
              name="title"
              required
              minLength={2}
              maxLength={100}
              placeholder="예: 병점역-동탄역 출근 직행"
              className={inputClassName}
            />
          </Field>

          <Field label="제안 내용">
            <textarea
              name="description"
              required
              minLength={5}
              maxLength={3000}
              rows={5}
              placeholder="필요한 시간대와 노선이 필요한 이유를 작성해 주세요."
              className={`${inputClassName} resize-none py-4`}
            />
          </Field>

          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <label
                  htmlFor="community-stop-search"
                  className="text-sm font-bold text-main"
                >
                  정류장 검색
                </label>

                <p className="mt-1 text-xs text-muted">
                  이동 순서대로 정류장
                  5개를 선택해 주세요.
                </p>
              </div>

              <strong
                className={[
                  "text-sm",
                  selectedStops.length ===
                  5
                    ? "text-success"
                    : "text-[#d87525]",
                ].join(" ")}
              >
                {selectedStops.length}/5
              </strong>
            </div>

            <input
              ref={searchRef}
              id="community-stop-search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              disabled={
                selectedStops.length >= 5
              }
              placeholder="정류장명 또는 정류장 번호"
              className={`${inputClassName} mt-2`}
            />

            {filteredStops.length >
              0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-control border border-line bg-white shadow-card">
                {filteredStops.map(
                  (stop) => (
                    <li
                      key={stop.id}
                      className="border-b border-line-light last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          addStop(stop)
                        }
                        className="w-full px-4 py-3 text-left transition hover:bg-surface-muted"
                      >
                        <strong className="block text-sm text-main">
                          {stop.name}
                        </strong>

                        <span className="mt-1 block text-xs text-muted">
                          {formatStopDetail(
                            stop,
                          )}
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}

            {search.trim().length >=
              2 &&
              filteredStops.length ===
                0 && (
                <p className="mt-2 text-xs text-muted">
                  검색 결과가
                  없습니다.
                </p>
              )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-main">
              선택한 정류장
            </h3>

            {selectedStops.length ===
            0 ? (
              <div className="mt-2 flex min-h-44 items-center justify-center rounded-control border border-dashed border-line px-5 text-center">
                <p className="text-sm text-muted">
                  아직 선택한 정류장이
                  없습니다.
                </p>
              </div>
            ) : (
              <ol className="mt-2 overflow-hidden rounded-control border border-line">
                {selectedStops.map(
                  (stop, index) => (
                    <SelectedStopRow
                      key={stop.id}
                      stop={stop}
                      index={index}
                      total={
                        selectedStops.length
                      }
                      onMove={moveStop}
                      onRemove={
                        removeStop
                      }
                    />
                  ),
                )}
              </ol>
            )}
          </div>

          {selectedStops.length >
            0 && (
            <div className="overflow-hidden rounded-control border border-line">
              <RouteStopMap
                stopIds={selectedStops.map(
                  (stop) => stop.id,
                )}
              />
            </div>
          )}
        </div>
      </div>

      <ActionMessage
        status={state.status}
        message={state.message}
      />

      <Button
        type="submit"
        fullWidth
        disabled={
          isPending ||
          selectedStops.length < 5
        }
      >
        {isPending
          ? "등록 중..."
          : "노선 제안 등록"}
      </Button>
    </form>
  );
}

type SelectedStopRowProps = {
  stop: CommunityStopOption;
  index: number;
  total: number;
  onMove: (
    index: number,
    direction: -1 | 1,
  ) => void;
  onRemove: (
    stopId: number,
  ) => void;
};

function SelectedStopRow({
  stop,
  index,
  total,
  onMove,
  onRemove,
}: SelectedStopRowProps) {
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-line-light px-3 py-2 last:border-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5470e8] text-xs font-bold text-white">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-main">
          {stop.name}
        </strong>

        <span className="mt-1 block truncate text-xs text-muted">
          {formatStopDetail(stop)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <SmallIconButton
          label="위로 이동"
          disabled={index === 0}
          onClick={() =>
            onMove(index, -1)
          }
        >
          ↑
        </SmallIconButton>

        <SmallIconButton
          label="아래로 이동"
          disabled={
            index === total - 1
          }
          onClick={() =>
            onMove(index, 1)
          }
        >
          ↓
        </SmallIconButton>

        <SmallIconButton
          label="정류장 삭제"
          danger
          onClick={() =>
            onRemove(stop.id)
          }
        >
          ×
        </SmallIconButton>
      </div>

      <input
        type="hidden"
        name="stopIds"
        value={stop.id}
      />
    </li>
  );
}

type SmallIconButtonProps = {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function SmallIconButton({
  label,
  disabled = false,
  danger = false,
  onClick,
  children,
}: SmallIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex size-8 items-center justify-center rounded-control text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-25",
        danger
          ? "text-danger hover:bg-danger-soft"
          : "text-secondary hover:bg-surface-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-main">
        {label}
      </span>

      {children}
    </label>
  );
}

function ActionMessage({
  status,
  message,
}: {
  status:
    | "idle"
    | "success"
    | "error";
  message: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className={[
        "rounded-control p-3 text-sm",
        status === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
      ].join(" ")}
    >
      {message}
    </p>
  );
}

function WriteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
    >
      <path
        d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-[18px]"
    >
      <path
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-[18px]"
    >
      <path
        d="M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-[18px]"
    >
      <path
        d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="10"
        r="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function formatStopDetail(
  stop: CommunityStopOption,
) {
  return [
    stop.stopNumber,
    stop.districtName,
  ]
    .filter(Boolean)
    .join(" · ") || "상세 정보 없음";
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

const inputClassName = [
  "min-h-12 w-full rounded-control",
  "border border-line bg-white",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-[#5470e8]",
  "focus:ring-2 focus:ring-[#5470e8]/10",
  "disabled:bg-surface-muted",
].join(" ");