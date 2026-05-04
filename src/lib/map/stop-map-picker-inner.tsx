"use client";

import { LocateFixed, Search } from "lucide-react";
import { useState } from "react";
import { Circle, Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { LatLng } from "./types";

// client component — env proxy(server-only 변수까지 검증)는 여기서 사용 금지.
// process.env.NEXT_PUBLIC_*는 Next.js가 빌드 타임에 client 번들로 inline.

// 카카오 services 라이브러리 (지도 로드 후 window.kakao.maps.services 노출)
type KakaoPlace = {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // lng
  y: string; // lat
};

type KakaoServices = {
  Places: new () => {
    keywordSearch: (
      keyword: string,
      callback: (data: KakaoPlace[], status: string) => void,
    ) => void;
  };
  Status: { OK: string };
};

declare global {
  interface Window {
    kakao?: { maps?: { services?: KakaoServices } };
  }
}

export function StopMapPickerInner({
  position,
  radiusM,
  onPick,
}: {
  position: LatLng;
  radiusM: number;
  onPick: (next: LatLng) => void;
}) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
    libraries: ["services"],
  });

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);

  function handleSearch() {
    setSearchError(null);
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const services = window.kakao?.maps?.services;
    if (!services) {
      setSearchError("지도가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const ps = new services.Places();
    ps.keywordSearch(trimmed, (data, status) => {
      if (status === services.Status.OK) {
        setResults(data.slice(0, 5));
      } else {
        setResults([]);
        setSearchError("검색 결과가 없어요. 더 구체적인 장소·주소를 입력해 주세요.");
      }
    });
  }

  function handleMyLocation() {
    setSearchError(null);
    setLastAccuracy(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSearchError("이 브라우저는 위치 가져오기를 지원하지 않아요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLastAccuracy(pos.coords.accuracy);
        setResults([]);
        setLocating(false);
      },
      (err) => {
        setSearchError(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 차단되어 있어요. 브라우저 주소창의 자물쇠 아이콘에서 허용해 주세요."
            : "현재 위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        setLocating(false);
      },
      // GPS 없는 데스크톱은 WiFi/IP 기반 fallback — 정확도 떨어짐.
      // timeout 길게 + cache 무시로 더 정확한 sample 시도.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        카카오맵을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 검색·내 위치 버튼 행 + 결과 dropdown — relative wrapper로 지도 위에
          floating overlay되어 지도 본체가 아래로 밀리지 않게. */}
      <div className="relative">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
                if (e.key === "Escape") {
                  setResults([]);
                }
              }}
              placeholder="장소·주소 검색 (예: 강남역, 서초구 ○○로 12)"
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSearch}
            >
              <Search className="mr-1 h-3.5 w-3.5" />
              검색
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleMyLocation}
            disabled={locating}
          >
            <LocateFixed className="mr-1 h-3.5 w-3.5" />
            {locating ? "위치 확인 중..." : "내 위치"}
          </Button>
        </div>

        {results.length > 0 ? (
          <div className="absolute top-full right-0 left-0 z-20 mt-1">
            <div className="bg-card flex items-center justify-between border-x border-t px-3 py-1.5 text-[11px] font-bold rounded-t-md">
              <span className="text-muted-foreground">
                검색 결과 {results.length}건
              </span>
              <button
                type="button"
                onClick={() => setResults([])}
                className="text-muted-foreground hover:text-foreground"
                aria-label="검색 결과 닫기"
              >
                ✕
              </button>
            </div>
            <ul className="bg-card max-h-64 overflow-y-auto rounded-b-md border text-sm shadow-lg">
              {results.map((p) => (
                <li key={p.id} className="border-t first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      onPick({ lat: Number(p.y), lng: Number(p.x) });
                      setResults([]);
                    }}
                    className="hover:bg-muted/40 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors"
                  >
                    <span className="text-sm font-bold">{p.place_name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {p.road_address_name || p.address_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {searchError ? (
        <p className="text-destructive text-xs font-medium">{searchError}</p>
      ) : null}

      {lastAccuracy !== null ? (
        <p className="text-muted-foreground text-[11px] font-medium">
          내 위치 정확도 약 ±{Math.round(lastAccuracy)}m
          {lastAccuracy > 100
            ? " · 데스크톱에서는 위성 신호 대신 WiFi·IP로 추정해 부정확할 수 있어요. 지도에서 정확한 위치를 클릭해 보정해 주세요."
            : null}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Map
          center={position}
          level={3}
          style={{ width: "100%", height: "420px" }}
          onClick={(_target, mouseEvent) => {
            onPick({
              lat: mouseEvent.latLng.getLat(),
              lng: mouseEvent.latLng.getLng(),
            });
          }}
        >
          <MapMarker position={position} draggable={false} />
          <Circle
            center={position}
            radius={radiusM}
            strokeWeight={2}
            strokeColor="#f59e0b"
            strokeOpacity={0.9}
            strokeStyle="solid"
            fillColor="#fbbf24"
            fillOpacity={0.25}
          />
        </Map>
        <p className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs">
          지도를 클릭하거나 위에서 검색·내 위치를 사용하면 그 지점이 정류장
          위치가 됩니다. 노란 원은 도착 판정 반경({radiusM}m)이에요. 정확한
          위치는 모바일(스마트폰)에서 잡거나 검색·지도 클릭으로 보정하세요.
        </p>
      </div>
    </div>
  );
}
