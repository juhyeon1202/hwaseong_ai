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
  createRouteSuggestionPost,
  type PostActionState,
  type RouteSuggestionActionState,
} from "@/app/community/actions";
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

const categoryLabels: Record<
  CommunityCategory,
  string
> = {
  route_suggestion: "노선 제안",
  information: "교통 정보",
  question: "질문",
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

const ITEMS_PER_PAGE = 4;

export function CommunityBoard({
  items,
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

  const filteredItems = useMemo(
    () =>
      selectedFilter
        ? items.filter(
            (item) =>
              item.category ===
              selectedFilter,
          )
        : items,
    [
      items,
      selectedFilter,
    ],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length /
        ITEMS_PER_PAGE,
    ),
  );

  const visibleItems = useMemo(() => {
    const start =
      (currentPage - 1) *
      ITEMS_PER_PAGE;

    return filteredItems.slice(
      start,
      start + ITEMS_PER_PAGE,
    );
  }, [
    currentPage,
    filteredItems,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter]);

  function openWriteModal() {
    if (!loggedIn) {
      window.location.href =
        "/auth?mode=login";

      return;
    }

    setWriteModalOpen(true);
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl py-5 md:py-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-main">
              시민 게시판
            </h1>

            <p className="mt-2 text-sm text-muted md:text-base">
              화성시 교통 정보와 의견을
              시민들과 함께 나눠요.
            </p>
          </div>

          <button
            type="button"
            onClick={openWriteModal}
            className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-[10px] bg-[#d87525] px-5 text-sm font-bold text-white transition hover:bg-[#c7651d]"
          >
            <span aria-hidden="true">
              ✎
            </span>

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
                      ? "border-[#5470e8] bg-[#5470e8] text-white"
                      : "border-line bg-white text-secondary hover:border-[#5470e8]",
                  ].join(" ")}
                >
                  {category.label}
                </button>
              );
            },
          )}
        </nav>

        {visibleItems.length === 0 ? (
          <div className="mt-6 rounded-[14px] border border-dashed border-line bg-white px-5 py-20 text-center">
            <p className="font-bold text-main">
              등록된 게시글이 없습니다.
            </p>

            <p className="mt-2 text-sm text-muted">
              첫 번째 교통 이야기를
              작성해 보세요.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-4">
            {visibleItems.map(
              (item) => (
                <PostCard
                  key={`${item.itemType}-${item.id}`}
                  item={item}
                />
              ),
            )}
          </ol>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="게시글 페이지"
            className="mt-9 flex justify-center gap-2"
          >
            <PageButton
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1,
                    ),
                )
              }
            >
              ‹
            </PageButton>

            {Array.from(
              {
                length: totalPages,
              },
              (_, index) =>
                index + 1,
            ).map((page) => (
              <PageButton
                key={page}
                selected={
                  currentPage === page
                }
                onClick={() =>
                  setCurrentPage(page)
                }
              >
                {page}
              </PageButton>
            ))}

            <PageButton
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1,
                    ),
                )
              }
            >
              ›
            </PageButton>
          </nav>
        )}
      </section>

      {writeModalOpen && (
        <WriteModal
          onClose={() =>
            setWriteModalOpen(false)
          }
        />
      )}
    </>
  );
}

function PostCard({
  item,
}: {
  item: CommunityPostItem;
}) {
  const href = `/community/${item.id}`;

  return (
    <li>
      <Link
        href={href}
        className="block rounded-[14px] border border-line bg-white px-5 py-6 shadow-card transition hover:-translate-y-0.5 hover:border-[#cbd3f6] md:px-7"
      >
        <CategoryBadge
          category={item.category}
        />

        <h2 className="mt-4 line-clamp-1 text-lg font-bold text-main md:text-xl">
          {item.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>
            {item.authorNickname}
          </span>

          <span>·</span>

          <time>
            {formatDate(
              item.createdAt,
            )}
          </time>

          <div className="ml-auto flex gap-5">
            {item.itemType ===
            "route" ? (
              <>
                <span>
                  투표{" "}
                  {item.voteCount.toLocaleString(
                    "ko-KR",
                  )}
                </span>

                <span>
                  정류장{" "}
                  {item.stopCount}
                </span>
              </>
            ) : (
              <>
                <span>
                  조회{" "}
                  {item.viewCount.toLocaleString(
                    "ko-KR",
                  )}
                </span>

                <span>
                  댓글{" "}
                  {item.commentCount}
                </span>
              </>
            )}
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
  const color =
    category ===
    "route_suggestion"
      ? "bg-[#fff1e5] text-[#d66d1d]"
      : category ===
          "information"
        ? "bg-[#edf2ff] text-[#4d68d7]"
        : "bg-[#edf8f1] text-[#378a55]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${color}`}
    >
      {categoryLabels[category]}
    </span>
  );
}

type WriteModalProps = {
  onClose: () => void;
};

function WriteModal({
  onClose,
}: WriteModalProps) {
  const [
    category,
    setCategory,
  ] =
    useState<CommunityCategory>(
      "information",
    );

  useEffect(() => {
    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function closeWithEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      closeWithEscape,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        closeWithEscape,
      );
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/55 p-4"
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
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line-light bg-white px-6 py-4">
          <h2
            id="write-modal-title"
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
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setCategory(value)
                }
                className={[
                  "min-h-11 rounded-control border px-2 text-sm font-bold transition",
                  category === value
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
            ))}
          </div>

          <div className="mt-6">
            {category ===
            "route_suggestion" ? (
              <RouteProposalForm
                onSuccess={onClose}
              />
            ) : (
              <GeneralPostForm
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

const initialPostState: PostActionState =
  {
    status: "idle",
    message: "",
  };

function GeneralPostForm({
  category,
  onSuccess,
}: {
  category:
    | "information"
    | "question";
  onSuccess: () => void;
}) {
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

    const timer =
      window.setTimeout(
        onSuccess,
        600,
      );

    return () =>
      window.clearTimeout(timer);
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
              ? "궁금한 내용을 제목으로 입력해 주세요."
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
              ? "교통 이용과 관련해 궁금한 내용을 자세히 작성해 주세요."
              : "시민들과 공유할 교통 정보를 자세히 작성해 주세요."
          }
          className={`${inputClassName} resize-none py-4`}
        />
      </Field>

      <ActionMessage
        state={state}
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

type StopSearchResponse = {
  stops?: CommunityStopOption[];
  message?: string;
};

const initialRouteState: RouteSuggestionActionState =
  {
    status: "idle",
    message: "",
  };

function RouteProposalForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createRouteSuggestionPost,
    initialRouteState,
  );

  const [
    apiStops,
    setApiStops,
  ] = useState<
    CommunityStopOption[]
  >([]);

  const [
    selectedStops,
    setSelectedStops,
  ] = useState<
    CommunityStopOption[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoadingStops,
    setIsLoadingStops,
  ] = useState(false);

  const [
    stopLoadError,
    setStopLoadError,
  ] = useState("");

  const searchRef =
    useRef<HTMLInputElement>(null);

  const visibleApiStops =
    useMemo(
      () =>
        apiStops.filter(
          (stop) =>
            !selectedStops.some(
              (selected) =>
                selected.id ===
                stop.id,
            ),
        ),
      [
        apiStops,
        selectedStops,
      ],
    );

  useEffect(() => {
    if (
      state.status !== "success"
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        onSuccess,
        600,
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    state.status,
    onSuccess,
  ]);

  async function searchStops() {
    const keyword =
      search.trim();

    if (keyword.length < 2) {
      setApiStops([]);

      setStopLoadError(
        "정류장명 또는 정류장 번호를 2자 이상 입력해 주세요.",
      );

      searchRef.current?.focus();

      return;
    }

    setIsLoadingStops(true);
    setStopLoadError("");
    setApiStops([]);

    try {
      const params =
        new URLSearchParams({
          query: keyword,
        });

      const response =
        await fetch(
          `/api/route-stops?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const result =
        (await response.json()) as StopSearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "정류장을 검색하지 못했습니다.",
        );
      }

      const stops =
        result.stops ?? [];

      setApiStops(stops);

      if (stops.length === 0) {
        setStopLoadError(
          `"${keyword}"에 해당하는 정류장을 찾지 못했습니다.`,
        );
      }
    } catch (error) {
      setStopLoadError(
        error instanceof Error
          ? error.message
          : "정류장을 검색하지 못했습니다.",
      );
    } finally {
      setIsLoadingStops(false);
    }
  }

  function addStop(
    stop: CommunityStopOption,
  ) {
    if (
      selectedStops.length >= 5
    ) {
      return;
    }

    if (
      selectedStops.some(
        (selected) =>
          selected.id === stop.id,
      )
    ) {
      return;
    }

    setSelectedStops(
      (current) => [
        ...current,
        stop,
      ],
    );

    setApiStops([]);
    setSearch("");
    setStopLoadError("");

    window.setTimeout(
      () =>
        searchRef.current?.focus(),
      0,
    );
  }

  function removeStop(
    stopId: number,
  ) {
    setSelectedStops(
      (current) =>
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
      className="space-y-6"
    >
      <input
        type="hidden"
        name="busType"
        value=""
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-5">
          <Field label="노선 제목">
            <input
              name="title"
              required
              minLength={2}
              maxLength={100}
              placeholder="예: 병점역-동탄역 출근 급행"
              className={inputClassName}
            />
          </Field>

          <Field label="제안 내용">
            <textarea
              name="content"
              required
              minLength={5}
              maxLength={5000}
              rows={5}
              placeholder="필요한 시간대와 노선이 필요한 이유를 작성해 주세요."
              className={`${inputClassName} resize-none py-4`}
            />
          </Field>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-main">
                  정류장 검색
                </h3>

                <p className="mt-1 text-xs leading-5 text-muted">
                  지역과 반경 제한 없이
                  전국 버스정류장을 이름
                  또는 번호로 검색합니다.
                </p>
              </div>

              <strong className="shrink-0 text-sm text-[#d87525]">
                {
                  selectedStops.length
                }
                /5
              </strong>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                ref={searchRef}
                value={search}
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target.value,
                  );

                  setApiStops([]);
                  setStopLoadError("");
                }}
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    void searchStops();
                  }
                }}
                disabled={
                  selectedStops.length >=
                  5
                }
                placeholder="정류장명 또는 정류장 번호"
                className={inputClassName}
              />

              <button
                type="button"
                onClick={() =>
                  void searchStops()
                }
                disabled={
                  isLoadingStops ||
                  selectedStops.length >=
                    5
                }
                className="min-h-12 shrink-0 rounded-control bg-[#5470e8] px-5 text-sm font-bold text-white transition hover:bg-[#455fcf] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingStops
                  ? "검색 중"
                  : "검색"}
              </button>
            </div>

            {stopLoadError && (
              <p
                role="status"
                className="mt-2 text-xs leading-5 text-danger"
              >
                {stopLoadError}
              </p>
            )}

            {!isLoadingStops &&
              apiStops.length >
                0 && (
                <p className="mt-2 text-xs text-success">
                  공공데이터
                  API에서 정류장{" "}
                  {apiStops.length}개를
                  찾았습니다.
                </p>
              )}

            {visibleApiStops.length >
              0 && (
              <ul className="mt-2 max-h-60 overflow-y-auto rounded-control border border-line bg-white shadow-card">
                {visibleApiStops.map(
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
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-muted"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-main">
                            {stop.name}
                          </strong>

                          <span className="mt-1 block truncate text-xs text-muted">
                            {stop.districtName ||
                              "지역 정보 없음"}
                          </span>
                        </div>

                        <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold text-secondary">
                          {stop.stopNumber ||
                            "번호 없음"}
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-main">
                선택한 정류장
              </h3>

              <p className="mt-1 text-xs leading-5 text-muted">
                실제 운행 순서대로
                정류장 5개를 선택해
                주세요.
              </p>
            </div>

            <span className="text-xs text-muted">
              순서 변경 가능
            </span>
          </div>

          {selectedStops.length ===
          0 ? (
            <div className="mt-3 flex min-h-44 items-center justify-center rounded-control border border-dashed border-line px-4 text-center text-sm text-muted">
              아직 선택한 정류장이
              없습니다.
            </div>
          ) : (
            <ol className="mt-3 overflow-hidden rounded-control border border-line bg-white">
              {selectedStops.map(
                (stop, index) => (
                  <li
                    key={stop.id}
                    className="flex min-h-16 items-center gap-3 border-b border-line-light px-3 last:border-0"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5470e8] text-xs font-bold text-white">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-main">
                        {stop.name}
                      </strong>

                      <span className="mt-1 block truncate text-xs text-muted">
                        {formatStop(
                          stop,
                        )}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${stop.name} 위로 이동`}
                        disabled={
                          index === 0
                        }
                        onClick={() =>
                          moveStop(
                            index,
                            -1,
                          )
                        }
                        className="flex size-8 items-center justify-center rounded-md border border-line text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        aria-label={`${stop.name} 아래로 이동`}
                        disabled={
                          index ===
                          selectedStops.length -
                            1
                        }
                        onClick={() =>
                          moveStop(
                            index,
                            1,
                          )
                        }
                        className="flex size-8 items-center justify-center rounded-md border border-line text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        aria-label={`${stop.name} 선택 취소`}
                        onClick={() =>
                          removeStop(
                            stop.id,
                          )
                        }
                        className="flex size-8 items-center justify-center rounded-md border border-[#f1c8c8] text-danger"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="hidden"
                      name="stopIds"
                      value={stop.id}
                    />
                  </li>
                ),
              )}
            </ol>
          )}

          {selectedStops.length >
            0 && (
            <div className="mt-4 overflow-hidden rounded-control border border-line bg-surface-muted">
              <RouteStopMap
                stopIds={selectedStops.map(
                  (stop) =>
                    stop.id,
                )}
                showPolyline
              />
            </div>
          )}
        </section>
      </div>

      <ActionMessage
        state={state}
      />

      {selectedStops.length <
        5 && (
        <p className="text-center text-xs text-muted">
          정류장을 5개 선택하면
          노선 제안을 등록할 수
          있습니다.
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={
          isPending ||
          selectedStops.length !== 5
        }
      >
        {isPending
          ? "등록 중..."
          : "희망 노선 등록"}
      </Button>
    </form>
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
  state,
}: {
  state: {
    status:
      | "idle"
      | "success"
      | "error";
    message: string;
  };
}) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      role="status"
      className={[
        "rounded-control p-3 text-sm",
        state.status === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
      ].join(" ")}
    >
      {state.message}
    </p>
  );
}

function PageButton({
  selected = false,
  disabled = false,
  onClick,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex size-10 items-center justify-center rounded-[8px] border text-sm font-bold transition",
        selected
          ? "border-[#5470e8] bg-[#5470e8] text-white"
          : "border-line bg-white text-secondary hover:border-[#5470e8]",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatStop(
  stop: CommunityStopOption,
) {
  return [
    stop.stopNumber,
    stop.districtName,
  ]
    .filter(Boolean)
    .join(" · ") ||
    "상세 정보 없음";
}

function formatDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

const inputClassName = [
  "min-h-12 w-full rounded-control",
  "border border-line bg-white",
  "px-4 text-sm text-main outline-none",
  "placeholder:text-muted",
  "focus:border-[#5470e8]",
  "focus:ring-2 focus:ring-[#5470e8]/10",
  "disabled:cursor-not-allowed",
  "disabled:bg-surface-muted",
].join(" ");
