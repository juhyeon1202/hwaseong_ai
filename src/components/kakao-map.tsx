"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export type MapMarkerData = {
  id: string | number;
  latitude: number;
  longitude: number;
  title: string;
};

type KakaoMapProps = {
  center: {
    latitude: number;
    longitude: number;
  };

  markers?: MapMarkerData[];
  level?: number;
  height?: number | string;
  className?: string;

  onMarkerClick?: (
    marker: MapMarkerData,
  ) => void;
};

type KakaoLatLng = object;
type KakaoMapInstance = object;

type KakaoMapsApi = {
  load: (callback: () => void) => void;

  LatLng: new (
    latitude: number,
    longitude: number,
  ) => KakaoLatLng;

  Map: new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
    },
  ) => KakaoMapInstance;

  Marker: new (options: {
    map: KakaoMapInstance;
    position: KakaoLatLng;
    title?: string;
  }) => object;

  event: {
    addListener: (
      target: object,
      eventName: string,
      callback: () => void,
    ) => void;
  };
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsApi;
    };
  }
}

const SCRIPT_ID = "kakao-map-sdk";

let sdkPromise:
  | Promise<KakaoMapsApi>
  | null = null;

function loadKakaoMapSdk() {
  if (window.kakao?.maps) {
    return new Promise<KakaoMapsApi>(
      (resolve) => {
        window.kakao!.maps.load(() => {
          resolve(window.kakao!.maps);
        });
      },
    );
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise =
    new Promise<KakaoMapsApi>(
      (resolve, reject) => {
        const javascriptKey =
          process.env
            .NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY;

        if (!javascriptKey) {
          reject(
            new Error(
              "카카오맵 JavaScript 키가 설정되지 않았습니다.",
            ),
          );
          return;
        }

        function initialize() {
          if (!window.kakao?.maps) {
            reject(
              new Error(
                "카카오맵 SDK를 불러오지 못했습니다.",
              ),
            );
            return;
          }

          window.kakao.maps.load(() => {
            resolve(window.kakao!.maps);
          });
        }

        const existingScript =
          document.getElementById(
            SCRIPT_ID,
          ) as HTMLScriptElement | null;

        if (existingScript) {
          if (window.kakao?.maps) {
            initialize();
            return;
          }

          existingScript.addEventListener(
            "load",
            initialize,
            {
              once: true,
            },
          );

          existingScript.addEventListener(
            "error",
            () => {
              reject(
                new Error(
                  "카카오맵 SDK 요청에 실패했습니다.",
                ),
              );
            },
            {
              once: true,
            },
          );

          return;
        }

        const script =
          document.createElement("script");

        script.id = SCRIPT_ID;
        script.async = true;
        script.src =
          "https://dapi.kakao.com/v2/maps/sdk.js" +
          `?appkey=${encodeURIComponent(javascriptKey)}` +
          "&autoload=false";

        script.addEventListener(
          "load",
          initialize,
          {
            once: true,
          },
        );

        script.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "카카오맵 SDK 요청에 실패했습니다.",
              ),
            );
          },
          {
            once: true,
          },
        );

        document.head.appendChild(script);
      },
    );

  return sdkPromise;
}

export function KakaoMap({
  center,
  markers = [],
  level = 8,
  height = 380,
  className = "",
  onMarkerClick,
}: KakaoMapProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      if (!containerRef.current) {
        return;
      }

      setError("");
      setIsLoading(true);

      try {
        const maps =
          await loadKakaoMapSdk();

        if (
          !isMounted ||
          !containerRef.current
        ) {
          return;
        }

        const map = new maps.Map(
          containerRef.current,
          {
            center: new maps.LatLng(
              center.latitude,
              center.longitude,
            ),
            level,
          },
        );

        markers.forEach((markerData) => {
          const marker =
            new maps.Marker({
              map,
              position:
                new maps.LatLng(
                  markerData.latitude,
                  markerData.longitude,
                ),
              title: markerData.title,
            });

          if (onMarkerClick) {
            maps.event.addListener(
              marker,
              "click",
              () => {
                onMarkerClick(markerData);
              },
            );
          }
        });

        setIsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);

        setError(
          error instanceof Error
            ? error.message
            : "지도를 불러오지 못했습니다.",
        );
      }
    }

    void initializeMap();

    return () => {
      isMounted = false;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [
    center.latitude,
    center.longitude,
    level,
    markers,
    onMarkerClick,
  ]);

  return (
    <div
      className={`relative overflow-hidden bg-info-soft ${className}`}
      style={{
        height,
      }}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="카카오맵"
      />

      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
          <p className="text-sm font-medium text-muted">
            지도를 불러오는 중...
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted p-6">
          <div className="max-w-sm text-center">
            <p className="font-bold text-main">
              지도를 표시하지 못했습니다
            </p>

            <p className="mt-2 text-sm leading-6 text-danger">
              {error}
            </p>

            <p className="mt-3 text-xs leading-5 text-muted">
              카카오 JavaScript 키와 허용 도메인을
              확인해 주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}