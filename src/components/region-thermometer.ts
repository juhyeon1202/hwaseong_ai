import {
  temperatureToColorRatio,
  temperatureToFillPercent,
  type RegionParticipation,
} from "@/lib/regions";

/*
 * 카카오맵 CustomOverlay에 들어갈 순수 DOM 노드를 만드는 헬퍼입니다.
 * Server Component(page.tsx)에서 함수를 prop으로 client component에
 * 넘길 수 없기 때문에, 이 모듈은 kakao-map.tsx(클라이언트 컴포넌트)
 * 안에서만 import해서 사용합니다.
 *
 * 온도계 트랙은 파란색(하단)→보라(중간)→주황색(상단) 그라데이션을
 * 항상 고정으로 깔아두고, 그 위를 "덮개"가 위에서부터 가리는 방식으로
 * 채움 %를 표현합니다(덮개가 줄어들수록 트랙 하단부터 드러남).
 * 색상 자체가 권역마다 바뀌는 게 아니라, 같은 트랙을 얼마나 가리느냐로
 * 표현하기 때문에 이분화 없이 자연스럽게 이어져 보입니다.
 * 원 모양 눈금(bulb)만 현재 채움 위치에 해당하는 트랙 색상을 계산해
 * 동일한 지점의 색을 보여줍니다.
 */

const COOL_COLOR = {
  r: 47,
  g: 111,
  b: 237,
}; // --app-info

const MID_COLOR = {
  r: 139,
  g: 92,
  b: 246,
}; // 보라 계열 중간톤

const WARM_COLOR = {
  r: 236,
  g: 114,
  b: 17,
}; // --app-brand

const TRACK_GRADIENT = `linear-gradient(to top, rgb(${COOL_COLOR.r}, ${COOL_COLOR.g}, ${COOL_COLOR.b}) 0%, rgb(${MID_COLOR.r}, ${MID_COLOR.g}, ${MID_COLOR.b}) 50%, rgb(${WARM_COLOR.r}, ${WARM_COLOR.g}, ${WARM_COLOR.b}) 100%)`;

const NEUTRAL_START_COLOR =
  "#c3c9d1";

function lerpChannel(
  from: number,
  to: number,
  t: number,
) {
  return Math.round(
    from + (to - from) * t,
  );
}

function temperatureColor(
  temperature: number,
) {
  const t = temperatureToColorRatio(
    temperature,
  );

  const [from, to, localT] =
    t <= 0.5
      ? [
          COOL_COLOR,
          MID_COLOR,
          t / 0.5,
        ]
      : [
          MID_COLOR,
          WARM_COLOR,
          (t - 0.5) / 0.5,
        ];

  return `rgb(${lerpChannel(from.r, to.r, localT)}, ${lerpChannel(from.g, to.g, localT)}, ${lerpChannel(from.b, to.b, localT)})`;
}

function formatTemperature(
  temperature: number,
) {
  return `${temperature.toFixed(1)}°`;
}

export function createRegionThermometerElement(
  region: RegionParticipation,
): HTMLDivElement {
  const fillColor = temperatureColor(
    region.temperature,
  );

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "relative flex cursor-pointer flex-col items-center outline-none";
  wrapper.tabIndex = 0;
  wrapper.setAttribute(
    "role",
    "button",
  );
  wrapper.setAttribute(
    "aria-label",
    `${region.name} 온도 ${formatTemperature(region.temperature)}${region.hasData ? "" : " (측정 중)"}`,
  );

  const tooltip = buildTooltip(region);
  const body = document.createElement(
    "div",
  );

  body.className =
    "relative h-14 w-4 overflow-hidden rounded-full border-2 border-white bg-white/70 shadow-card";

  // 고정 그라데이션 트랙 — 권역마다 색이 바뀌지 않고 항상 동일합니다.
  const track = document.createElement(
    "div",
  );

  track.className = "absolute inset-0";
  track.style.background =
    TRACK_GRADIENT;

  body.appendChild(track);

  // 트랙 위쪽을 가리는 덮개 — 이 높이가 줄어들수록 트랙 하단부터
  // 드러나는 방식으로 채움 %를 표현합니다.
  const cover = document.createElement(
    "div",
  );

  cover.className =
    "absolute inset-x-0 top-0 rounded-t-full bg-white/90 transition-[height] duration-700 ease-out";
  cover.style.height = "100%";

  body.appendChild(cover);

  const bulb = document.createElement(
    "div",
  );

  bulb.className =
    "-mt-1 size-5 rounded-full border-2 border-white shadow-card transition-colors duration-700 ease-out";
  bulb.style.backgroundColor =
    NEUTRAL_START_COLOR;

  const label = document.createElement(
    "div",
  );

  label.className =
    "mt-1 whitespace-nowrap rounded-pill bg-[#191f28]/85 px-2 py-0.5 text-[10px] font-bold text-white";
  label.textContent = `${region.name} ${formatTemperature(region.temperature)}`;

  wrapper.appendChild(tooltip);
  wrapper.appendChild(body);
  wrapper.appendChild(bulb);
  wrapper.appendChild(label);

  wireInteractions(wrapper, tooltip);
  animateGauge(
    cover,
    bulb,
    temperatureToFillPercent(
      region.temperature,
    ),
    fillColor,
  );

  return wrapper;
}

function animateGauge(
  cover: HTMLDivElement,
  bulb: HTMLDivElement,
  targetFillPercent: number,
  targetBulbColor: string,
) {
  const clampedFill = Math.max(
    4,
    targetFillPercent,
  );

  const targetCoverHeight =
    100 - clampedFill;

  // 덮개 100%(완전히 가려짐) 상태로 먼저 그린 뒤 다음 프레임에
  // 목표 높이로 바꿔야 transition이 실제로 재생됩니다(처음부터
  // 최종값으로 그리면 애니메이션 없이 바로 그 상태로 표시됨).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cover.style.height = `${targetCoverHeight}%`;
      bulb.style.backgroundColor =
        targetBulbColor;
    });
  });
}

function buildTooltip(
  region: RegionParticipation,
) {
  const tooltip =
    document.createElement("div");

  tooltip.setAttribute(
    "role",
    "tooltip",
  );
  tooltip.className =
    "absolute bottom-[calc(100%+8px)] left-1/2 z-10 w-48 -translate-x-1/2 rounded-card border border-line bg-surface p-3 text-left opacity-0 shadow-floating transition-opacity duration-150";

  const title = document.createElement(
    "p",
  );

  title.className =
    "text-xs font-bold text-main";
  title.textContent = region.name;
  tooltip.appendChild(title);

  const summary =
    document.createElement("p");

  summary.className =
    "mt-1 text-xs font-semibold text-brand-text";
  summary.textContent = `현재 온도 ${formatTemperature(region.temperature)}${region.hasData ? "" : " (측정 중)"}`;
  tooltip.appendChild(summary);

  if (region.districts.length > 0) {
    const list =
      document.createElement("ul");

    list.className =
      "mt-2 space-y-1 border-t border-line-light pt-2";

    region.districts.forEach(
      (district) => {
        const item =
          document.createElement(
            "li",
          );

        item.className =
          "flex items-center justify-between gap-2 text-[11px] text-secondary";

        const name =
          document.createElement(
            "span",
          );

        name.textContent =
          district.districtName;

        const value =
          document.createElement(
            "span",
          );

        value.className =
          "font-semibold text-main";
        value.textContent =
          formatTemperature(
            district.temperature,
          );

        item.appendChild(name);
        item.appendChild(value);
        list.appendChild(item);
      },
    );

    tooltip.appendChild(list);
  }

  return tooltip;
}

function wireInteractions(
  wrapper: HTMLDivElement,
  tooltip: HTMLDivElement,
) {
  let pinned = false;

  function show() {
    tooltip.classList.remove(
      "opacity-0",
    );
    tooltip.classList.add(
      "opacity-100",
    );
  }

  function hide() {
    tooltip.classList.remove(
      "opacity-100",
    );
    tooltip.classList.add(
      "opacity-0",
    );
  }

  wrapper.addEventListener(
    "mouseenter",
    show,
  );

  wrapper.addEventListener(
    "mouseleave",
    () => {
      if (!pinned) {
        hide();
      }
    },
  );

  wrapper.addEventListener(
    "focus",
    show,
  );

  wrapper.addEventListener(
    "blur",
    () => {
      if (!pinned) {
        hide();
      }
    },
  );

  wrapper.addEventListener(
    "mousedown",
    (event) => {
      // 지도 드래그로 인식되지 않도록 이벤트 전파를 막습니다.
      event.stopPropagation();
    },
  );

  wrapper.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      pinned = !pinned;

      if (pinned) {
        show();
      } else {
        hide();
      }
    },
  );

  wrapper.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        wrapper.click();
      }
    },
  );
}
