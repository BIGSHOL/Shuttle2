"use client";

import {
  CustomOverlayMap,
  Map,
  Polyline,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

import type { LatLng } from "./types";

// client component — env proxy(server-only 변수까지 검증)는 여기서 사용 금지.
// process.env.NEXT_PUBLIC_*는 Next.js가 빌드 타임에 client 번들로 inline.

export type TripLiveMapStop = {
  id: string; // RouteStop.id
  stopId: string; // Stop.id
  name: string;
  lat: number;
  lng: number;
  order: number;
  isChildStop: boolean;
  isPassed: boolean;
};

export type TripLiveMapProps = {
  stops: TripLiveMapStop[];
  shuttle: { lat: number; lng: number; heading: number | null } | null;
  direction: "PICKUP" | "DROPOFF";
  /** 지도 height. 풀스크린은 "100dvh", 미니는 "96px" 등. 기본 "60vh". */
  height?: string;
  /** 캡션 표시. 풀스크린에서는 false 권장. 기본 true. */
  showCaption?: boolean;
  /** 정류장 라벨 표시. 미니맵에서는 false 권장. */
  showStopLabels?: boolean;
  /**
   * 운행 종료 후 LocationPing 경로 재생용. 시간순 정렬된 좌표.
   * 전달되면 노선 polyline 위에 추가로 실주행 trail을 연한 노란색으로 그림.
   */
  trail?: { lat: number; lng: number }[];
};

export function TripLiveMapInner({
  stops,
  shuttle,
  direction,
  height = "60vh",
  showCaption = true,
  showStopLabels = true,
  trail,
}: TripLiveMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
    libraries: ["services"],
  });

  if (error) {
    return (
      <div
        className="border-destructive/40 bg-destructive/5 text-destructive flex w-full items-center justify-center text-sm"
        style={{ height }}
      >
        카카오맵 로드 실패. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground flex w-full items-center justify-center text-sm"
        style={{ height }}
      >
        지도 로딩 중...
      </div>
    );
  }

  const childStop = stops.find((s) => s.isChildStop);
  const center: LatLng = shuttle
    ? { lat: shuttle.lat, lng: shuttle.lng }
    : childStop
      ? { lat: childStop.lat, lng: childStop.lng }
      : stops[0]
        ? { lat: stops[0].lat, lng: stops[0].lng }
        : { lat: 37.4979, lng: 127.0276 };

  const polylinePath = [...stops]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ lat: s.lat, lng: s.lng }));

  // 노선 polyline 색은 토큰값 직접 hex로 (kakao SDK는 Tailwind 토큰 못 읽음)
  const polylineColor = direction === "PICKUP" ? "#10b981" : "#0ea5e9";

  return (
    <div className="relative w-full overflow-hidden">
      <Map center={center} level={4} style={{ width: "100%", height }}>
        {polylinePath.length >= 2 ? (
          <Polyline
            path={polylinePath}
            strokeWeight={3}
            strokeColor={polylineColor}
            strokeOpacity={0.5}
            strokeStyle="solid"
          />
        ) : null}

        {trail && trail.length >= 2 ? (
          <Polyline
            path={trail}
            strokeWeight={5}
            strokeColor="#f5c518"
            strokeOpacity={0.85}
            strokeStyle="solid"
          />
        ) : null}

        {stops.map((s) => {
          // 자녀 stop은 노란(#f5c518), 통과는 회색, 미통과는 success(#1f8a4a)
          const fill = s.isChildStop
            ? "#f5c518"
            : s.isPassed
              ? "#9ca3af"
              : "#1f8a4a";

          return (
            <CustomOverlayMap
              key={s.id}
              position={{ lat: s.lat, lng: s.lng }}
              yAnchor={1}
            >
              <div className="flex flex-col items-center">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-md"
                  style={{ backgroundColor: fill }}
                  title={s.name}
                >
                  {s.order + 1}
                </div>
                {showStopLabels ? (
                  <div className="bg-background/95 mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow">
                    {s.name}
                    {s.isChildStop ? " ★" : ""}
                  </div>
                ) : null}
              </div>
            </CustomOverlayMap>
          );
        })}

        {shuttle ? (
          <CustomOverlayMap
            position={{ lat: shuttle.lat, lng: shuttle.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            {/* 노란 원 + 버스 emoji + glow ring (T.shadow.glow 패턴) */}
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white text-lg font-bold shadow-lg"
              style={{
                backgroundColor: "#f5c518",
                boxShadow:
                  "0 6px 18px rgba(245,197,24,.45), 0 0 0 4px rgba(245,197,24,.18)",
              }}
              aria-label="셔틀 위치"
            >
              🚌
            </div>
          </CustomOverlayMap>
        ) : null}
      </Map>

      {showCaption ? (
        <p className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs font-medium">
          {trail && trail.length >= 2
            ? `운행 경로 ${trail.length}개 좌표 (안전운행기록 면책 자료).`
            : shuttle
              ? "셔틀 위치는 약 5초마다 갱신됩니다."
              : "셔틀이 운행을 시작하면 위치가 표시됩니다."}
        </p>
      ) : null}
    </div>
  );
}
